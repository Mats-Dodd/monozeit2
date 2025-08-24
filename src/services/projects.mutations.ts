import { useState, useCallback } from "react"
import { projectCollection } from "@/lib/collections"
import { generateId } from "./ids"

type CreateProjectArgs = {
  name: string
  ownerId: string
  id?: string
  description?: string | null
  shared_user_ids?: string[]
}

export function useCreateProject(): [
  (args: CreateProjectArgs) => Promise<string>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (args: CreateProjectArgs) => {
    setError(null)
    const id = args.id ?? generateId()
    try {
      projectCollection.insert({
        id,
        name: args.name,
        description: args.description ?? "",
        owner_id: args.ownerId,
        shared_user_ids: args.shared_user_ids ?? [],
        created_at: new Date(),
      })
      return id
    } catch (err) {
      setError(err)
      throw err
    }
  }, [])

  return [mutate, { error }]
}

type UpdateProjectArgs = {
  id: string
  name?: string
  description?: string | null
  shared_user_ids?: string[]
}

export function useUpdateProject(): [
  (args: UpdateProjectArgs) => Promise<void>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (args: UpdateProjectArgs) => {
    setError(null)
    try {
      projectCollection.update(args.id, (draft) => {
        if (args.name !== undefined) draft.name = args.name
        if (args.description !== undefined) draft.description = args.description
        if (args.shared_user_ids !== undefined)
          draft.shared_user_ids = args.shared_user_ids
      })
    } catch (err) {
      setError(err)
      throw err
    }
  }, [])

  return [mutate, { error }]
}

export function useDeleteProject(): [
  (id: string) => Promise<void>,
  { error: unknown },
] {
  const [error, setError] = useState<unknown>(null)

  const mutate = useCallback(async (id: string) => {
    setError(null)
    try {
      projectCollection.delete(id)
    } catch (err) {
      setError(err)
      throw err
    }
  }, [])

  return [mutate, { error }]
}
