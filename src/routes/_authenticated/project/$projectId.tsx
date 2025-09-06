import { createFileRoute } from "@tanstack/react-router"
import WorkbenchPanes from "@/components/workbench/WorkbenchPanes"
import { EditorCore } from "@/components/editor/EditorCore"
import { useBranchDoc } from "@/components/editor/useBranchDoc"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { fileCollection } from "@/lib/collections"
import { useMemo, useState } from "react"
import {
  createBranch as createBranchSvc,
  setActiveBranch as setActiveBranchSvc,
  renameBranch as renameBranchSvc,
  deleteBranch as deleteBranchSvc,
  mergeBranchInto as mergeBranchIntoSvc,
} from "@/services/files"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
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
  const { loroDoc, markDirty, flush, ready } = useBranchDoc(fileId)
  const { data } = useLiveQuery(
    (q) => q.from({ c: fileCollection }).where(({ c }) => eq(c.id, fileId)),
    [fileId]
  )
  const file = data?.[0]
  const md = getBranchesMetadata(file)
  const branches: string[] = Object.keys(md.branches ?? { main: {} })
  const active: string = md.activeBranch ?? "main"
  const otherBranches = useMemo(
    () => branches.filter((b) => b !== active),
    [branches, active]
  )
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(active)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [mergeTarget, setMergeTarget] = useState<string | undefined>(
    otherBranches[0]
  )

  if (!ready) return null
  return (
    <div className="h-full min-h-0 w-full flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-xs border rounded px-2 py-0.5">
              {active}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[220px]">
            <DropdownMenuLabel>Switch branch</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={active}
              onValueChange={async (value) => {
                if (value === active) return
                await flush()
                await setActiveBranchSvc({ id: fileId, branchName: value })
              }}
            >
              {branches.map((b) => (
                <DropdownMenuRadioItem key={b} value={b}>
                  {b}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={async () => {
                await flush()
                const created = await createBranchSvc({
                  id: fileId,
                  fromBranch: active,
                })
                await setActiveBranchSvc({ id: fileId, branchName: created })
                toast.success(`Created branch ${created}`)
              }}
            >
              New branch
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setRenameValue(active)
                setRenameOpen(true)
              }}
            >
              Rename branch
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              data-variant="destructive"
            >
              Delete branch
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setMergeOpen(true)}>
              Merge branch...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => toast.info("Compare with main — coming soon")}
            >
              Compare with main
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Rename Branch Dialog */}
        <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                placeholder="new branch name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
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
                  const to = renameValue.trim()
                  if (!to) return
                  await flush()
                  await renameBranchSvc({ id: fileId, from: active, to })
                  setRenameOpen(false)
                  await setActiveBranchSvc({ id: fileId, branchName: to })
                  toast.success(`Renamed to ${to}`)
                }}
              >
                Rename
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Delete Branch Alert */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete branch</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the branch &ldquo;{active}&rdquo;.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (active === "main") {
                    toast.error("Cannot delete main branch")
                    return
                  }
                  await flush()
                  await deleteBranchSvc({ id: fileId, branchName: active })
                  toast.success(`Deleted ${active}`)
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Merge Branch Dialog */}
        <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge branch</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">
                Source: {active}
              </div>
              <Select value={mergeTarget} onValueChange={setMergeTarget}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {otherBranches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  if (!mergeTarget) return
                  await flush()
                  await mergeBranchIntoSvc({
                    id: fileId,
                    source: active,
                    target: mergeTarget,
                  })
                  setMergeOpen(false)
                  await setActiveBranchSvc({
                    id: fileId,
                    branchName: mergeTarget,
                  })
                  toast.success(`Merged ${active} into ${mergeTarget}`)
                }}
              >
                Merge
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
