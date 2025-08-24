import { z } from "zod"
import { folderCollection } from "@/lib/collections"
import { generateId } from "./ids"
import { assignDefined } from "./util"

const CreateFolderArgs = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  name: z.string().min(1),
  parentId: z.string().uuid().nullable().optional(),
})

const UpdateFolderArgs = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
})

export async function createFolder(
  args: z.input<typeof CreateFolderArgs>
): Promise<string> {
  const a = CreateFolderArgs.parse(args)
  const id = a.id ?? generateId()
  folderCollection.insert({
    id,
    project_id: a.projectId,
    parent_id: a.parentId ?? null,
    name: a.name,
  })
  return id
}

export async function updateFolder(
  args: z.input<typeof UpdateFolderArgs>
): Promise<void> {
  const a = UpdateFolderArgs.parse(args)
  folderCollection.update(a.id, (draft) => {
    assignDefined(draft, { name: a.name, parent_id: a.parentId })
  })
}

export async function deleteFolder(id: string): Promise<void> {
  folderCollection.delete(id)
}
