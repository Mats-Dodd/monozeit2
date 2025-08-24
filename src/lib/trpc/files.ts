import { router, authedProcedure } from "@/lib/trpc"
import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq } from "drizzle-orm"
import { generateTxId } from "@/lib/trpc/utils"
import {
  filesTable,
  createFileSchema,
  updateFileSchema,
  projectsTable,
} from "@/db/schema"

export const filesRouter = router({
  create: authedProcedure
    .input(createFileSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx)
        const [newItem] = await tx.insert(filesTable).values(input).returning()
        return { item: newItem, txid }
      })

      return result
    }),

  update: authedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateFileSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.transaction(async (tx) => {
        const txid = await generateTxId(tx)
        const [updatedItem] = await tx
          .update(filesTable)
          .set(input.data)
          .where(eq(filesTable.id, input.id))
          .returning()

        if (!updatedItem) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "File not found or you do not have permission to update it",
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

        const [file] = await tx
          .select()
          .from(filesTable)
          .where(eq(filesTable.id, input.id))

        if (!file) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found",
          })
        }

        const [project] = await tx
          .select()
          .from(projectsTable)
          .where(eq(projectsTable.id, file.project_id))

        if (
          !project ||
          (project.owner_id !== ctx.session.user.id &&
            !project.shared_user_ids.includes(ctx.session.user.id))
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have permission to delete this file",
          })
        }

        const [deletedItem] = await tx
          .delete(filesTable)
          .where(eq(filesTable.id, input.id))
          .returning()

        return { item: deletedItem, txid }
      })

      return result
    }),
})
