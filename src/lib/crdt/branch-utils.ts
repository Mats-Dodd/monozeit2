import { LoroDoc } from "loro-crdt"

export type BranchName = string

export type BranchData = {
  snapshot: string
  createdAt: string
  updatedAt: string
}

export type BranchesMetadata = {
  branches: Record<BranchName, BranchData>
  activeBranch?: BranchName
  recentSnapshots?: Array<{
    snapshot: string
    timestamp: string
    branchName: BranchName
  }>
}

export function sanitizeBranchName(name: string): string {
  const trimmed = name.trim().toLowerCase()
  // Replace spaces with dashes and strip invalid chars
  const dashed = trimmed.replace(/\s+/g, "-")
  return dashed.replace(/[^a-z0-9-_]/g, "")
}

export function generateUniqueBranchName(
  metadata: Partial<BranchesMetadata> | undefined,
  base: string
): BranchName {
  const safeBase = sanitizeBranchName(base || "branch")
  const existing = new Set(Object.keys(metadata?.branches ?? {}))
  if (!existing.has(safeBase)) return safeBase
  let i = 1
  while (existing.has(`${safeBase}-${i}`)) i++
  return `${safeBase}-${i}`
}

export function getBranchesMetadata(
  input: { metadata?: unknown } | undefined
): BranchesMetadata {
  const metadataValue = input?.metadata
  if (isBranchesMetadata(metadataValue)) {
    return metadataValue
  }
  return { branches: {}, activeBranch: undefined }
}

export function isBranchesMetadata(value: unknown): value is BranchesMetadata {
  if (!value || typeof value !== "object") return false
  const v = value as { branches?: unknown; activeBranch?: unknown }
  if (v.branches && typeof v.branches === "object") return true
  return false
}

export function setActiveBranch(
  metadata: BranchesMetadata,
  branchName: BranchName
): BranchesMetadata {
  return { ...metadata, activeBranch: branchName }
}

export function createBranch(
  metadata: BranchesMetadata,
  newBranchName: BranchName,
  fromBranch?: BranchName,
  initialSnapshot?: string
): BranchesMetadata {
  const now = new Date().toISOString()
  const source = fromBranch
    ? (metadata.branches[fromBranch]?.snapshot ?? initialSnapshot ?? "")
    : (initialSnapshot ?? "")
  return {
    ...metadata,
    branches: {
      ...metadata.branches,
      [newBranchName]: { snapshot: source, createdAt: now, updatedAt: now },
    },
  }
}

export function renameBranch(
  metadata: BranchesMetadata,
  from: BranchName,
  to: BranchName
): BranchesMetadata {
  if (from === to) return metadata
  const { [from]: fromData, ...rest } = metadata.branches
  if (!fromData) return metadata
  const branches = { ...rest, [to]: fromData }
  const activeBranch =
    metadata.activeBranch === from ? to : metadata.activeBranch
  return { ...metadata, branches, activeBranch }
}

export function deleteBranch(
  metadata: BranchesMetadata,
  branchName: BranchName
): BranchesMetadata {
  const { [branchName]: _removed, ...rest } = metadata.branches
  let activeBranch = metadata.activeBranch
  if (activeBranch === branchName) {
    activeBranch = Object.keys(rest)[0]
  }
  return { ...metadata, branches: rest, activeBranch }
}

export function updateBranchSnapshot(
  metadata: BranchesMetadata,
  branchName: BranchName,
  base64: string
): BranchesMetadata {
  const existing = metadata.branches[branchName]
  const now = new Date().toISOString()
  const updated: BranchData = existing
    ? { ...existing, snapshot: base64, updatedAt: now }
    : { snapshot: base64, createdAt: now, updatedAt: now }
  return {
    ...metadata,
    branches: { ...metadata.branches, [branchName]: updated },
  }
}

export async function mergeBranches(
  targetSnapshot: string,
  sourceSnapshot: string
): Promise<string> {
  const targetDoc = new LoroDoc()
  if (targetSnapshot) {
    targetDoc.import(base64ToBytes(targetSnapshot))
  }
  if (sourceSnapshot) {
    targetDoc.import(base64ToBytes(sourceSnapshot))
  }
  const bytes = targetDoc.export({ mode: "snapshot" })
  return bytesToBase64(bytes)
}

export function mergeBranchesSync(
  targetSnapshot: string,
  sourceSnapshot: string
): string {
  const targetDoc = new LoroDoc()
  if (targetSnapshot) {
    targetDoc.import(base64ToBytes(targetSnapshot))
  }
  if (sourceSnapshot) {
    targetDoc.import(base64ToBytes(sourceSnapshot))
  }
  const bytes = targetDoc.export({ mode: "snapshot" })
  return bytesToBase64(bytes)
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return typeof btoa !== "undefined"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64")
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary =
    typeof atob !== "undefined"
      ? atob(base64)
      : Buffer.from(base64, "base64").toString("binary")
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
