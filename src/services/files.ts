import { fileCollection } from "@/lib/collections"
import { generateId } from "./ids"
import { assignDefined } from "./util"
import { createFileSchema, updateFileSchema } from "@/db/schema"
import { toDbFileCreate, toDbFileUpdate } from "./mappers"
import {
  createBranch as mdCreateBranch,
  generateUniqueBranchName,
  getBranchesMetadata,
  setActiveBranch as mdSetActiveBranch,
  mergeBranchesSync,
} from "@/lib/crdt/branch-utils"

export async function createFile(args: {
  id?: string
  projectId: string
  folderId?: string | null
  name: string
  content?: string
  metadata?: Record<string, unknown>
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
  content?: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const { id, ...rest } = args

  const dbPatch = toDbFileUpdate(rest)

  updateFileSchema
    .pick({ name: true, folder_id: true, content: true, metadata: true })
    .parse(dbPatch)

  fileCollection.update(id, (draft) => {
    assignDefined(draft, dbPatch)
  })
}

export async function deleteFile(id: string): Promise<void> {
  fileCollection.delete(id)
}

// Branching helpers (metadata-focused)
export async function setActiveBranch(args: {
  id: string
  branchName: string
}): Promise<void> {
  const { id, branchName } = args
  fileCollection.update(id, (draft) => {
    const md = getBranchesMetadata(draft)
    console.log("[branches] setActiveBranch", {
      id,
      from: md.activeBranch ?? null,
      to: branchName,
    })
    const updated = mdSetActiveBranch(md, branchName)
    draft.metadata = updated as unknown as Record<string, unknown>
  })
}

export async function createBranch(args: {
  id: string
  baseName?: string
  fromBranch?: string
}): Promise<string> {
  const { id, baseName = "branch", fromBranch } = args
  let newName = ""
  fileCollection.update(id, (draft) => {
    const md = getBranchesMetadata(draft)
    console.log("[branches] createBranch start", {
      id,
      baseName,
      fromBranch: fromBranch ?? null,
      existing: Object.keys(md.branches ?? {}),
    })
    const generated = generateUniqueBranchName(md, baseName)
    newName = generated
    const updated = mdCreateBranch(
      md,
      generated,
      fromBranch,
      draft.content ?? ""
    )
    // keep active branch as-is; user can switch after creation
    draft.metadata = updated as unknown as Record<string, unknown>
    console.log("[branches] createBranch result", {
      id,
      name: generated,
      branches: Object.keys(updated.branches ?? {}),
      active: updated.activeBranch ?? null,
    })
  })
  return newName
}

export async function mergeBranchInto(args: {
  id: string
  source: string
  target: string
}): Promise<void> {
  const { id, source, target } = args
  fileCollection.update(id, (draft) => {
    const md = getBranchesMetadata(draft)
    const targetSnapshot = md.branches[target]?.snapshot ?? ""
    const sourceSnapshot = md.branches[source]?.snapshot ?? ""
    const merged = mergeBranchesSync(targetSnapshot, sourceSnapshot)
    const nowIso = new Date().toISOString()
    const updatedTarget = {
      snapshot: merged,
      createdAt: md.branches[target]?.createdAt ?? nowIso,
      updatedAt: nowIso,
    }
    draft.metadata = {
      branches: { ...md.branches, [target]: updatedTarget },
      activeBranch: target,
    } as unknown as Record<string, unknown>
  })
}
