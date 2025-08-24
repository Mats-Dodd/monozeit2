import { z } from "zod"
import { fileCollection } from "@/lib/collections"
import { generateId } from "./ids"
import { assignDefined } from "./util"

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[]

const CreateFileArgs = z.object({
  id: z.string().uuid().optional(),
  projectId: z.string().uuid(),
  folderId: z.string().uuid(),
  name: z.string().min(1),
  content: z.custom<JsonValue>().optional(),
})

const UpdateFileArgs = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  folderId: z.string().uuid().optional(),
  content: z.custom<JsonValue>().optional(),
})

export async function createFile(
  args: z.input<typeof CreateFileArgs>
): Promise<string> {
  const a = CreateFileArgs.parse(args)
  const id = a.id ?? generateId()
  fileCollection.insert({
    id,
    project_id: a.projectId,
    folder_id: a.folderId,
    name: a.name,
    content: (a.content ?? { text: "" }) as JsonValue,
  })
  return id
}

export async function updateFile(
  args: z.input<typeof UpdateFileArgs>
): Promise<void> {
  const a = UpdateFileArgs.parse(args)
  fileCollection.update(a.id, (draft) => {
    assignDefined(draft, {
      name: a.name,
      folder_id: a.folderId,
      content: a.content as JsonValue | undefined,
    })
  })
}

export async function deleteFile(id: string): Promise<void> {
  fileCollection.delete(id)
}
