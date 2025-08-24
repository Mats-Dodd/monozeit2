import { projectCollection } from "@/lib/collections"
import { generateId } from "./ids"
import { createProjectSchema, updateProjectSchema } from "@/db/schema"
import { toDbProjectCreate, toDbProjectUpdate } from "./mappers"

export async function createProject(args: {
  id?: string
  name: string
  ownerId: string
  description?: string | null
  shared_user_ids?: string[]
}): Promise<string> {
  const id = args.id ?? generateId()
  const dbPayload = toDbProjectCreate({ ...args, id })
  // validate against DB create schema (server source of truth)
  createProjectSchema.parse(dbPayload)
  projectCollection.insert(dbPayload)
  return id
}

export async function updateProject(args: {
  id: string
  name?: string
  description?: string | null
  shared_user_ids?: string[]
}): Promise<void> {
  const { id, ...rest } = args
  const dbPatch = toDbProjectUpdate(rest)
  // validate allowed fields using update schema pick
  updateProjectSchema
    .pick({ name: true, description: true, shared_user_ids: true })
    .parse(dbPatch)
  projectCollection.update(id, (draft) => {
    if (dbPatch.name !== undefined) draft.name = dbPatch.name
    if (dbPatch.description !== undefined)
      draft.description = dbPatch.description
    if (dbPatch.shared_user_ids !== undefined)
      draft.shared_user_ids = dbPatch.shared_user_ids
  })
}

export async function deleteProject(id: string): Promise<void> {
  projectCollection.delete(id)
}
