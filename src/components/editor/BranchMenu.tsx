import { useEffect, useMemo, useState } from "react"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { fileCollection } from "@/lib/collections"
import { getBranchesMetadata } from "@/lib/crdt/branch-utils"
import { snapshotToJSON } from "@/components/editor/utils/snapshotToJSON"
import { getEditor } from "@/components/editor/editor-registry"
import {
  createBranch as createBranchSvc,
  setActiveBranch as setActiveBranchSvc,
  renameBranch as renameBranchSvc,
  deleteBranch as deleteBranchSvc,
  mergeBranchInto as mergeBranchIntoSvc,
} from "@/services/files"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function BranchMenu({
  fileId,
  flush,
}: {
  fileId: string
  flush?: () => void
}) {
  const { data } = useLiveQuery(
    (q) => q.from({ c: fileCollection }).where(({ c }) => eq(c.id, fileId)),
    [fileId]
  )

  const file = data?.[0]
  const metadata = getBranchesMetadata(file)
  const branches: string[] = useMemo(
    () => Object.keys(metadata.branches ?? { main: {} }),
    [metadata.branches]
  )
  const active: string = metadata.activeBranch ?? "main"
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
  const [isDiff, setIsDiff] = useState(false)

  const diffStats = useMemo(() => {
    const editor = getEditor(fileId)
    const storage = editor?.storage as unknown as
      | Record<string, unknown>
      | undefined
    const diff = storage?.["diff"] as
      | {
          diffResult?: {
            stats?: {
              additions: number
              deletions: number
              modifications: number
            }
          }
          isDiffMode?: boolean
        }
      | undefined
    const s = diff?.diffResult?.stats
    return s &&
      typeof s.additions === "number" &&
      typeof s.deletions === "number" &&
      typeof s.modifications === "number"
      ? s
      : null
  }, [fileId, isDiff, active])

  // If the active branch is main, hide compare section and ensure diff mode is cleared
  useEffect(() => {
    if (active === "main" && isDiff) {
      const editor = getEditor(fileId)
      editor?.commands.clearDiffView()
      setIsDiff(false)
    }
  }, [active, isDiff, fileId])

  // Close merge dialog if switching to main
  useEffect(() => {
    if (active === "main" && mergeOpen) {
      setMergeOpen(false)
    }
  }, [active, mergeOpen])

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            title={active}
            className="text-xs rounded px-2 py-1 h-7 hover:bg-muted/70 text-muted-foreground hover:text-foreground"
          >
            <span className="truncate max-w-[160px] inline-block align-middle">
              {active}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="bottom"
          align="start"
          sideOffset={8}
          alignOffset={-2}
          collisionPadding={8}
          className="min-w-[240px] max-h-[60vh]"
        >
          <DropdownMenuLabel>Branches</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={active}
            onValueChange={async (value) => {
              if (value === active) return
              flush?.()
              await setActiveBranchSvc({ id: fileId, branchName: value })
            }}
          >
            {branches.map((b) => (
              <DropdownMenuRadioItem key={b} value={b}>
                {b}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {active !== "main" ? (
            <div className="mt-1.5">
              {/* <DropdownMenuLabel className="text-muted-foreground">Compare</DropdownMenuLabel> */}
              {!isDiff ? (
                <DropdownMenuItem
                  onSelect={async () => {
                    const editor = getEditor(fileId)
                    if (!editor) return
                    const base64 =
                      metadata.branches["main"]?.snapshot ?? file?.content ?? ""
                    const leftJson = await snapshotToJSON(base64)
                    const rightJson = editor.getJSON()
                    editor.commands.setDiffContent(leftJson, rightJson)
                    setIsDiff(true)
                  }}
                >
                  Compare with main
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onSelect={() => {
                    const editor = getEditor(fileId)
                    editor?.commands.clearDiffView()
                    setIsDiff(false)
                  }}
                >
                  Exit diff
                </DropdownMenuItem>
              )}
              {isDiff && diffStats ? (
                <DropdownMenuItem disabled>
                  +{diffStats.additions} / -{diffStats.deletions} / ~
                  {diffStats.modifications}
                </DropdownMenuItem>
              ) : null}
            </div>
          ) : null}

          <div className="mt-1.5">
            <DropdownMenuItem
              onSelect={async () => {
                flush?.()
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
            {active !== "main" ? (
              <DropdownMenuItem onSelect={() => setMergeOpen(true)}>
                Merge branch...
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onSelect={() => setDeleteOpen(true)}
              data-variant="destructive"
            >
              Delete branch
            </DropdownMenuItem>
          </div>
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
                flush?.()
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
                flush?.()
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
                flush?.()
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
    </>
  )
}

export default BranchMenu
