import { createFileRoute } from "@tanstack/react-router"
import WorkbenchPanes from "@/components/workbench/WorkbenchPanes"
import { EditorCore } from "@/components/editor/EditorCore"
import { useBranchDoc } from "@/components/editor/useBranchDoc"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { fileCollection } from "@/lib/collections"
import { useState } from "react"
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
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { getBranchesMetadata } from "@/lib/crdt/branch-utils"

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: ProjectPage,
  ssr: false,
})

function ProjectPage() {
  const params = Route.useParams()
  const projectId = params.projectId
  return (
    <div className="h-full min-h-0">
      <WorkbenchPanes
        projectId={projectId}
        renderContent={(tab) =>
          tab.fileId ? <PaneFileEditor fileId={tab.fileId} /> : null
        }
      />
    </div>
  )
}

function PaneFileEditor({ fileId }: { fileId: string }) {
  const { loroDoc, markDirty, ready } = useBranchDoc(fileId)
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

  if (!ready) return null
  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1 border-b">
        <select
          className="text-xs border rounded px-1 py-0.5"
          value={active}
          onChange={(e) => {
            console.log("[branches] switch", {
              id: fileId,
              from: active,
              to: e.target.value,
            })
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
            {/* Accessible description to satisfy aria-describedby */}
            <p className="sr-only" id="create-branch-desc">
              Create a new branch from the currently active branch.
            </p>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Base: {active}
              </div>
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
                  console.log("[branches] create dialog submit", {
                    id: fileId,
                    from: active,
                    baseName: name,
                  })
                  const created = await createBranchSvc({
                    id: fileId,
                    baseName: name || "branch",
                    fromBranch: active,
                  })
                  setName("")
                  setOpen(false)
                  console.log("[branches] switch to created", {
                    id: fileId,
                    to: created,
                  })
                  void setActiveBranchSvc({ id: fileId, branchName: created })
                }}
              >
                Create
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex-1 min-h-0">
        <EditorCore fileId={fileId} loroDoc={loroDoc} markDirty={markDirty} />
      </div>
    </div>
  )
}
