import { useCallback, useState } from "react"
import { fileCollection } from "@/lib/collections"
import { generateId } from "./ids"

type CreateFileArgs = {
  projectId: string
  folderId: string
  name: string
  id?: string
  content?: unknown
}

export function useCreateFile(): [
  (args: CreateFileArgs) => Promise<string>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (args: CreateFileArgs) => {
    setError(null)
    const id = args.id ?? generateId()
    try {
      fileCollection.insert({
        id,
        project_id: args.projectId,
        folder_id: args.folderId,
        name: args.name,
        content: args.content ?? { text: "" },
        created_at: new Date(),
        updated_at: new Date(),
      })
      return id
    } catch (err) {
      setError(err)
      throw err
    }
  }, [])

  return [mutate, { error }]
}

type UpdateFileArgs = {
  id: string
  name?: string
  folderId?: string
  content?: unknown
}

export function useUpdateFile(): [
  (args: UpdateFileArgs) => Promise<void>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (args: UpdateFileArgs) => {
    setError(null)
    try {
      fileCollection.update(args.id, (draft) => {
        if (args.name !== undefined) draft.name = args.name
        if (args.folderId !== undefined) draft.folder_id = args.folderId
        if (args.content !== undefined) draft.content = args.content
      })
    } catch (err) {
      setError(err)
      throw err
    }
  }, [])

  return [mutate, { error }]
}

export function useDeleteFile(): [
  (id: string) => Promise<void>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (id: string) => {
    setError(null)
    try {
      fileCollection.delete(id)
    } catch (err) {
      setError(err)
      throw err
    }
  }, [])

  return [mutate, { error }]
}
