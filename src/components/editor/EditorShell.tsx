import { useCurrentFileID } from "@/services/tabs"
import { useBranchDoc } from "./useBranchDoc"
import { EditorCore } from "./EditorCore"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { useState } from "react"
import { fileCollection } from "@/lib/collections"
import {
  createBranch as createBranchSvc,
  setActiveBranch as setActiveBranchSvc,
} from "@/services/files"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getBranchesMetadata } from "@/lib/crdt/branch-utils"

function BranchMenu({ fileId }: { fileId: string }) {
  const { data } = useLiveQuery(
    (q) => q.from({ c: fileCollection }).where(({ c }) => eq(c.id, fileId)),
    [fileId]
  )
  const file = data?.[0]
  const md = getBranchesMetadata(file)
  const branches: string[] = Object.keys(md.branches ?? { main: {} })
  const active: string = md.activeBranch ?? "main"
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="text-xs border rounded px-2 py-0.5">
            New branch
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create branch</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Create a new branch from the currently active branch.
          </DialogDescription>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Base: {active}</div>
            <Input
              placeholder="branch name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="text-xs border rounded px-2 py-0.5">
                Cancel
              </button>
            </DialogClose>
            <button
              className="text-xs border rounded px-2 py-0.5"
              onClick={async () => {
                const created = await createBranchSvc({
                  id: fileId,
                  baseName: name || "branch",
                  fromBranch: active,
                })
                setName("")
                setOpen(false)
                void setActiveBranchSvc({ id: fileId, branchName: created })
              }}
            >
              Create
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function EditorShell() {
  const fileId = useCurrentFileID()
  const { loroDoc, ready, markDirty } = useBranchDoc(fileId)

  // Gate mount until the client collection resolves
  if (!fileId || !ready) return null

  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      <BranchMenu fileId={fileId} />
      <div className="flex-1 min-h-0">
        <EditorCore fileId={fileId} loroDoc={loroDoc} markDirty={markDirty} />
      </div>
    </div>
  )
}
