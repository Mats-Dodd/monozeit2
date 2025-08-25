import { fileCollection } from "@/lib/collections"
import { generateId } from "./ids"
import { assignDefined } from "./util"
import { createFileSchema, updateFileSchema } from "@/db/schema"
import { toDbFileCreate, toDbFileUpdate } from "./mappers"

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[]

export async function createFile(args: {
  id?: string
  projectId: string
  folderId?: string | null
  name: string
  content?: JsonValue
}): Promise<string> {
  const id = args.id ?? generateId()
  const dbPayload = toDbFileCreate({ ...args, id })
  createFileSchema.parse(dbPayload)
  fileCollection.insert(dbPayload)
  return id
}

export async function updateFile(args: {
  id: string
  name?: string
  folderId?: string | null
  content?: JsonValue
}): Promise<void> {
  const { id, ...rest } = args

  console.log("📄 UPDATE FILE CALLED:", {
    id,
    updateArgs: args,
    restArgs: rest,
  })

  const dbPatch = toDbFileUpdate(rest)
  console.log("📄 DB PATCH:", dbPatch)

  updateFileSchema
    .pick({ name: true, folder_id: true, content: true })
    .parse(dbPatch)

  fileCollection.update(id, (draft) => {
    console.log("📄 DRAFT BEFORE assignDefined:", {
      name: draft.name,
      folder_id: draft.folder_id,
      patch: dbPatch,
    })
    assignDefined(draft, dbPatch)
    console.log("📄 DRAFT AFTER assignDefined:", {
      name: draft.name,
      folder_id: draft.folder_id,
    })
  })

  console.log("📄 UPDATE FILE COMPLETED")
}

export async function deleteFile(id: string): Promise<void> {
  fileCollection.delete(id)
}
