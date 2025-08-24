import { folderCollection } from "@/lib/collections"
import { generateId } from "./ids"
import { assignDefined } from "./util"
import { createFolderSchema, updateFolderSchema } from "@/db/schema"
import { toDbFolderCreate, toDbFolderUpdate } from "./mappers"

export async function createFolder(args: {
  id?: string
  projectId: string
  name: string
  parentId?: string | null
}): Promise<string> {
  const id = args.id ?? generateId()
  const dbPayload = toDbFolderCreate({ ...args, id })
  createFolderSchema.parse(dbPayload)
  folderCollection.insert(dbPayload)
  return id
}

export async function updateFolder(args: {
  id: string
  name?: string
  parentId?: string | null
}): Promise<void> {
  const { id, ...rest } = args
  const dbPatch = toDbFolderUpdate(rest)
  updateFolderSchema.pick({ name: true, parent_id: true }).parse(dbPatch)
  folderCollection.update(id, (draft) => {
    assignDefined(draft, { name: dbPatch.name, parent_id: dbPatch.parent_id })
  })
}

export async function deleteFolder(id: string): Promise<void> {
  folderCollection.delete(id)
}
