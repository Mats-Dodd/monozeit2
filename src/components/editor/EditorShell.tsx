import { useCurrentFileID } from "@/services/tabs"
import { useBranchDoc } from "./useBranchDoc"
import { EditorCore } from "./EditorCore"
import { useLiveQuery, eq } from "@tanstack/react-db"

import { fileCollection } from "@/lib/collections"
import {
  createBranch as createBranchSvc,
  setActiveBranch as setActiveBranchSvc,
} from "@/services/files"

import { getBranchesMetadata } from "@/lib/crdt/branch-utils"

function BranchMenu({ fileId, flush }: { fileId: string; flush: () => void }) {
  const { data } = useLiveQuery(
    (q) => q.from({ c: fileCollection }).where(({ c }) => eq(c.id, fileId)),
    [fileId]
  )
  const file = data?.[0]
  const md = getBranchesMetadata(file)
  const branches: string[] = Object.keys(md.branches ?? { main: {} })
  const active: string = md.activeBranch ?? "main"

  return (
    <div className="flex items-center gap-2 px-2 py-1 border-b">
      <select
        className="text-xs border rounded px-1 py-0.5"
        value={active}
        onChange={(e) => {
          void setActiveBranchSvc({ id: fileId, branchName: e.target.value })
        }}
      >
        {branches.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <button
        className="text-xs border rounded px-2 py-0.5"
        onClick={async () => {
          flush()
          const created = await createBranchSvc({
            id: fileId,
            fromBranch: active,
          })
          await setActiveBranchSvc({ id: fileId, branchName: created })
        }}
      >
        New branch
      </button>
    </div>
  )
}

export function EditorShell() {
  const fileId = useCurrentFileID()
  const { loroDoc, ready, markDirty, flush } = useBranchDoc(fileId)

  // Gate mount until the client collection resolves
  if (!fileId || !ready) return null

  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      <BranchMenu fileId={fileId} flush={flush} />
      <div className="flex-1 min-h-0">
        <EditorCore fileId={fileId} loroDoc={loroDoc} markDirty={markDirty} />
      </div>
    </div>
  )
}
