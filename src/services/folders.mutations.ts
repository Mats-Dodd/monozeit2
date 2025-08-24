import { useCallback, useState } from "react"
import { folderCollection } from "@/lib/collections"
import { generateId } from "./ids"

type CreateFolderArgs = {
  projectId: string
  name: string
  id?: string
  parentId?: string | null
}

export function useCreateFolder(): [
  (args: CreateFolderArgs) => Promise<string>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (args: CreateFolderArgs) => {
    setError(null)
    const id = args.id ?? generateId()
    try {
      folderCollection.insert({
        id,
        project_id: args.projectId,
        parent_id: args.parentId ?? null,
        name: args.name,
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

type UpdateFolderArgs = {
  id: string
  name?: string
  parentId?: string | null
}

export function useUpdateFolder(): [
  (args: UpdateFolderArgs) => Promise<void>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (args: UpdateFolderArgs) => {
    setError(null)
    try {
      folderCollection.update(args.id, (draft) => {
        if (args.name !== undefined) draft.name = args.name
        if (args.parentId !== undefined) draft.parent_id = args.parentId
      })
    } catch (err) {
      setError(err)
      throw err
    }
  }, [])

  return [mutate, { error }]
}

export function useDeleteFolder(): [
  (id: string) => Promise<void>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (id: string) => {
    setError(null)
    try {
      folderCollection.delete(id)
    } catch (err) {
      setError(err)
      throw err
    }
  }, [])

  return [mutate, { error }]
}
