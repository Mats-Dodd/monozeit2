import { router, authedProcedure } from "@/lib/trpc"
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { generateTxId } from "@/lib/trpc/utils"
import {
  foldersTable,
  createFolderSchema,
  updateFolderSchema,
  projectsTable,
} from "@/db/schema"

export const foldersRouter = router({
  create: authedProcedure
    .input(createFolderSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx)
        const [newItem] = await tx
          .insert(foldersTable)
          .values(input)
          .returning()
        return { item: newItem, txid }
      })

      return result
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateFolderSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx)
        const [updatedItem] = await tx
          .update(foldersTable)
          .set(input.data)
          .where(eq(foldersTable.id, input.id))
          .returning()

        if (!updatedItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Folder not found or you do not have permission to update it",
          })
        }

        return { item: updatedItem, txid }
      })

      return result
    }),

  delete: authedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx)

        const [folder] = await tx
          .select()
          .from(foldersTable)
          .where(eq(foldersTable.id, input.id))

        if (!folder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Folder not found",
          })
        }

        const [project] = await tx
          .select()
          .from(projectsTable)
          .where(eq(projectsTable.id, folder.project_id))

        if (
          !project ||
          (project.owner_id !== ctx.session.user.id &&
            !project.shared_user_ids.includes(ctx.session.user.id))
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to delete this folder",
          })
        }

        const [deletedItem] = await tx
          .delete(foldersTable)
          .where(eq(foldersTable.id, input.id))
          .returning()

        return { item: deletedItem, txid }
      })

      return result
    }),
})
