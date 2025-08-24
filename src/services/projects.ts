import { z } from "zod"
import { projectCollection } from "@/lib/collections"
import { generateId } from "./ids"

const CreateProjectArgs = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  ownerId: z.string().min(1),
  description: z.string().nullable().optional(),
  shared_user_ids: z.array(z.string()).optional(),
})

const UpdateProjectArgs = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  shared_user_ids: z.array(z.string()).optional(),
})

export async function createProject(
  args: z.input<typeof CreateProjectArgs>
): Promise<string> {
  const a = CreateProjectArgs.parse(args)
  const id = a.id ?? generateId()
  projectCollection.insert({
    id,
    name: a.name,
    description: a.description ?? "",
    owner_id: a.ownerId,
    shared_user_ids: a.shared_user_ids ?? [],
  })
  return id
}

export async function updateProject(
  args: z.input<typeof UpdateProjectArgs>
): Promise<void> {
  const a = UpdateProjectArgs.parse(args)
  projectCollection.update(a.id, (draft) => {
    if (a.name !== undefined) draft.name = a.name
    if (a.description !== undefined) draft.description = a.description
    if (a.shared_user_ids !== undefined)
      draft.shared_user_ids = a.shared_user_ids
  })
}

export async function deleteProject(id: string): Promise<void> {
  projectCollection.delete(id)
}
