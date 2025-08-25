"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLiveQuery, eq } from "@tanstack/react-db"
import type { UIFile, UIFolder } from "@/services/types"
import { folderCollection, fileCollection } from "@/lib/collections"
import { createFolder, updateFolder } from "@/services/folders"
import { createFile, updateFile } from "@/services/files"
import { Input } from "@/components/ui/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  TreeProvider,
  TreeView,
  TreeNode,
  TreeNodeTrigger,
  TreeNodeContent,
  TreeExpander,
  TreeIcon,
  TreeLabel,
  useTree,
} from "@/components/ui/kibo-ui/tree"

type FolderNode = UIFolder & {
  childFolders: FolderNode[]
  files: UIFile[]
}

type DraftState =
  | {
      type: "folder"
      parentId: string | null
    }
  | {
      type: "file"
      parentId: string
    }
  | null

type RenamingState =
  | { type: "folder"; id: string; name: string }
  | { type: "file"; id: string; name: string }
  | null

export function SidebarFileTree({
  projectId,
}: {
  projectId: string | undefined
}) {
  const { data: folders = [] } = useLiveQuery(
    (q) =>
      q
        .from({ folderCollection })
        .where(({ folderCollection }) =>
          projectId ? eq(folderCollection.project_id, projectId) : true
        )
        .orderBy(({ folderCollection }) => folderCollection.name),
    [projectId]
  )

  const { data: files = [] } = useLiveQuery(
    (q) =>
      q
        .from({ fileCollection })
        .where(({ fileCollection }) =>
          projectId ? eq(fileCollection.project_id, projectId) : true
        )
        .orderBy(({ fileCollection }) => fileCollection.name),
    [projectId]
  )

  const [draft, setDraft] = useState<DraftState>(null)
  const [renaming, setRenaming] = useState<RenamingState>(null)
  const [pendingRootFileAfterFolder, setPendingRootFileAfterFolder] =
    useState(false)
  const [expandForDraft, setExpandForDraft] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)

  const tree = useMemo(() => buildTree(folders, files), [folders, files])

  // Persist expand state per project
  const defaultExpanded = useMemo<string[]>(() => {
    if (!projectId) return []
    try {
      const raw = localStorage.getItem(expandKey(projectId))
      const parsed = raw ? (JSON.parse(raw) as string[]) : []
      return parsed
    } catch {
      return []
    }
  }, [projectId])

  if (!projectId) {
    return (
      <div className="text-sm text-muted-foreground px-2 py-1">
        Select a project
      </div>
    )
  }

  const isEmpty = tree.length === 0

  // Handle menu close and execute pending actions
  useEffect(() => {
    if (!isMenuOpen && pendingAction) {
      // Wait for menu close animation to complete
      requestAnimationFrame(() => {
        pendingAction()
        setPendingAction(null)
      })
    }
  }, [isMenuOpen, pendingAction])

  // Auto-expand parent folder when creating a draft child
  const handleCreateChild = useCallback(
    (folderId: string, type: "folder" | "file") => {
      const action = () => {
        setExpandForDraft(folderId)
        setDraft(
          type === "folder"
            ? { type: "folder", parentId: folderId }
            : { type: "file", parentId: folderId }
        )
      }

      if (isMenuOpen) {
        setPendingAction(() => action)
      } else {
        action()
      }
    },
    [isMenuOpen]
  )

  // Handle rename actions
  const handleRename = useCallback(
    (item: UIFolder | UIFile, type: "folder" | "file") => {
      const action = () => {
        setRenaming({ type, id: item.id, name: item.name })
      }

      if (isMenuOpen) {
        setPendingAction(() => action)
      } else {
        action()
      }
    },
    [isMenuOpen]
  )

  return (
    <TreeProvider defaultExpandedIds={defaultExpanded} className="w-full">
      <ExpansionPersistence projectId={projectId} />
      <AutoExpandForDraft
        expandForDraft={expandForDraft}
        onCleared={() => setExpandForDraft(null)}
      />
      <ContextMenu onOpenChange={setIsMenuOpen}>
        <ContextMenuTrigger asChild>
          <div>
            <TreeView className="px-1 py-1">
              {isEmpty && !draft ? <EmptyState /> : null}
              <RootList
                nodes={tree}
                onCreateChild={handleCreateChild}
                onRenameFolder={(f) => handleRename(f, "folder")}
                onRenameFile={(f) => handleRename(f, "file")}
                draft={draft}
                onCancelDraft={() => {
                  setPendingRootFileAfterFolder(false)
                  setDraft(null)
                }}
                onCommitDraft={async (name) => {
                  if (!draft) return
                  const trimmed = name.trim()
                  if (!trimmed) return
                  if (draft.type === "folder") {
                    const newFolderId = await createFolder({
                      projectId,
                      name: trimmed,
                      parentId: draft.parentId ?? null,
                    })
                    if (pendingRootFileAfterFolder) {
                      setPendingRootFileAfterFolder(false)
                      setDraft({ type: "file", parentId: newFolderId })
                      return
                    }
                  } else {
                    await createFile({
                      projectId,
                      folderId: draft.parentId,
                      name: trimmed,
                      content: { text: "" },
                    })
                  }
                  setDraft(null)
                }}
                renaming={renaming}
                onCancelRenaming={() => setRenaming(null)}
                onCommitRenaming={async (name) => {
                  if (!renaming) return
                  const trimmed = name.trim()
                  if (!trimmed || trimmed === renaming.name) {
                    setRenaming(null)
                    return
                  }
                  if (renaming.type === "folder") {
                    await updateFolder({ id: renaming.id, name: trimmed })
                  } else {
                    await updateFile({ id: renaming.id, name: trimmed })
                  }
                  setRenaming(null)
                }}
              />
            </TreeView>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
          {/* Root actions */}
          <ContextMenuItem
            onClick={() => {
              const action = () => {
                setDraft({ type: "folder", parentId: null })
              }
              setPendingAction(() => action)
            }}
          >
            Create folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={!isEmpty}
            onClick={() => {
              if (!isEmpty) return
              const action = () => {
                setPendingRootFileAfterFolder(true)
                setDraft({ type: "folder", parentId: null })
              }
              setPendingAction(() => action)
            }}
          >
            Create file
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </TreeProvider>
  )
}

function expandKey(projectId: string) {
  return `sidebar_tree_expanded_${projectId}`
}

function ExpansionPersistence({ projectId }: { projectId: string }) {
  // Access context via a child hook component
  const { expandedIds } = useTreeBridge()

  useEffect(() => {
    const ids = Array.from(expandedIds)
    try {
      localStorage.setItem(expandKey(projectId), JSON.stringify(ids))
    } catch {
      // ignore
    }
  }, [expandedIds, projectId])

  return null
}

function useTreeBridge() {
  return useTree()
}

function AutoExpandForDraft({
  expandForDraft,
  onCleared,
}: {
  expandForDraft: string | null
  onCleared: () => void
}) {
  const { expandedIds, toggleExpanded } = useTree()

  useEffect(() => {
    if (expandForDraft && !expandedIds.has(expandForDraft)) {
      toggleExpanded(expandForDraft)
      // Scroll the expanded folder into view
      setTimeout(() => {
        const el = document.querySelector(`[data-node-id="${expandForDraft}"]`)
        if (el && "scrollIntoView" in el) {
          ;(el as HTMLElement).scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          })
        }
        // Clear the expand flag after scrolling so user can collapse normally
        onCleared()
      }, 150)
    }
  }, [expandForDraft, expandedIds, toggleExpanded, onCleared])

  return null
}

function buildTree(folders: UIFolder[], files: UIFile[]): FolderNode[] {
  const byParent = new Map<string | null, FolderNode[]>()
  const folderById = new Map<string, FolderNode>()

  const sortedFolders = [...folders].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )
  const sortedFiles = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  )

  for (const f of sortedFolders) {
    const node: FolderNode = { ...f, childFolders: [], files: [] }
    folderById.set(f.id, node)
  }

  for (const f of folderById.values()) {
    const parentId = f.parent_id ?? null
    if (!byParent.has(parentId)) byParent.set(parentId, [])
    byParent.get(parentId)!.push(f)
  }

  for (const file of sortedFiles) {
    const parent = folderById.get(file.folder_id)
    if (parent) parent.files.push(file)
  }

  const attachChildren = (nodes: FolderNode[]) => {
    for (const n of nodes) {
      n.childFolders = byParent.get(n.id) ?? []
      attachChildren(n.childFolders)
    }
  }

  const roots = byParent.get(null) ?? []
  attachChildren(roots)
  return roots
}

function EmptyState() {
  return (
    <div className="text-xs text-muted-foreground px-2 py-3">
      Right-click to create a folder.
    </div>
  )
}

function RootList(props: {
  nodes: FolderNode[]
  onCreateChild: (folderId: string, type: "folder" | "file") => void
  onRenameFolder: (f: UIFolder) => void
  onRenameFile: (f: UIFile) => void
  draft: DraftState
  onCancelDraft: () => void
  onCommitDraft: (name: string) => Promise<void>
  renaming: RenamingState
  onCancelRenaming: () => void
  onCommitRenaming: (name: string) => Promise<void>
}) {
  const {
    nodes,
    onCreateChild,
    onRenameFolder,
    onRenameFile,
    draft,
    onCancelDraft,
    onCommitDraft,
    renaming,
    onCancelRenaming,
    onCommitRenaming,
  } = props

  return (
    <div className="space-y-1">
      {nodes.map((folder, idx) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isLast={idx === nodes.length - 1}
          onCreateChild={onCreateChild}
          onRenameFolder={onRenameFolder}
          onRenameFile={onRenameFile}
          draft={draft}
          onCancelDraft={onCancelDraft}
          onCommitDraft={onCommitDraft}
          renaming={renaming}
          onCancelRenaming={onCancelRenaming}
          onCommitRenaming={onCommitRenaming}
        />
      ))}

      {/* Root-level draft folder */}
      {draft && draft.type === "folder" && draft.parentId === null && (
        <TreeNode nodeId="__draft_root__">
          <TreeNodeTrigger>
            <TreeExpander hasChildren={false} />
            <TreeIcon hasChildren />
            <InlineNameEditor
              placeholder="New folder"
              onCancel={onCancelDraft}
              onCommit={onCommitDraft}
            />
          </TreeNodeTrigger>
        </TreeNode>
      )}
    </div>
  )
}

function FolderItem(props: {
  folder: FolderNode
  isLast: boolean
  onCreateChild: (folderId: string, type: "folder" | "file") => void
  onRenameFolder: (f: UIFolder) => void
  onRenameFile: (f: UIFile) => void
  draft: DraftState
  onCancelDraft: () => void
  onCommitDraft: (name: string) => Promise<void>
  renaming: RenamingState
  onCancelRenaming: () => void
  onCommitRenaming: (name: string) => Promise<void>
}) {
  const {
    folder,
    onCreateChild,
    onRenameFolder,
    onRenameFile,
    draft,
    onCancelDraft,
    onCommitDraft,
    renaming,
    onCancelRenaming,
    onCommitRenaming,
  } = props

  const isRenaming = renaming?.type === "folder" && renaming.id === folder.id

  return (
    <TreeNode nodeId={folder.id}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>
            <TreeNodeTrigger>
              <TreeExpander
                hasChildren={
                  folder.childFolders.length + folder.files.length > 0 ||
                  (draft && draft.parentId === folder.id)
                    ? true
                    : false
                }
              />
              <TreeIcon hasChildren />
              {isRenaming ? (
                <InlineNameEditor
                  defaultValue={renaming!.name}
                  onCancel={onCancelRenaming}
                  onCommit={onCommitRenaming}
                />
              ) : (
                <TreeLabel>{folder.name}</TreeLabel>
              )}
            </TreeNodeTrigger>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <ContextMenuItem onClick={() => onRenameFolder(folder)}>
            Rename
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => onCreateChild(folder.id, "folder")}>
            Create folder
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onCreateChild(folder.id, "file")}>
            Create file
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <TreeNodeContent hasChildren>
        <div className="space-y-1">
          {/* Draft child under this folder */}
          {draft && draft.parentId === folder.id && (
            <TreeNode nodeId={`__draft_${folder.id}__`}>
              <TreeNodeTrigger>
                <TreeExpander hasChildren={false} />
                <TreeIcon hasChildren={draft.type === "folder"} />
                <InlineNameEditor
                  placeholder={
                    draft.type === "folder" ? "New folder" : "New file"
                  }
                  onCancel={onCancelDraft}
                  onCommit={onCommitDraft}
                />
              </TreeNodeTrigger>
            </TreeNode>
          )}

          {/* Child folders */}
          {folder.childFolders.map((child, idx) => (
            <FolderItem
              key={child.id}
              folder={child}
              isLast={idx === folder.childFolders.length - 1}
              onCreateChild={onCreateChild}
              onRenameFolder={onRenameFolder}
              onRenameFile={onRenameFile}
              draft={draft}
              onCancelDraft={onCancelDraft}
              onCommitDraft={onCommitDraft}
              renaming={renaming}
              onCancelRenaming={onCancelRenaming}
              onCommitRenaming={onCommitRenaming}
            />
          ))}

          {/* Files */}
          {folder.files.map((file) => (
            <TreeNode key={file.id} nodeId={file.id}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div>
                    <TreeNodeTrigger>
                      <TreeExpander hasChildren={false} />
                      <TreeIcon hasChildren={false} />
                      {renaming?.type === "file" && renaming.id === file.id ? (
                        <InlineNameEditor
                          defaultValue={renaming.name}
                          onCancel={onCancelRenaming}
                          onCommit={onCommitRenaming}
                        />
                      ) : (
                        <TreeLabel>{file.name}</TreeLabel>
                      )}
                    </TreeNodeTrigger>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <ContextMenuItem onClick={() => onRenameFile(file)}>
                    Rename
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            </TreeNode>
          ))}
        </div>
      </TreeNodeContent>
    </TreeNode>
  )
}

// Component to safely focus input after ensuring no aria-hidden conflicts
function SafeFocusInput({
  value,
  placeholder,
  onChange,
  onKeyDown,
  onBlur,
  className,
}: {
  value: string
  placeholder?: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const focusWhenSafe = () => {
      if (!inputRef.current) return

      // Check if any ancestor has aria-hidden
      let element = inputRef.current.parentElement
      while (element) {
        if (element.getAttribute("aria-hidden") === "true") {
          // Wait for aria-hidden to be removed
          requestAnimationFrame(focusWhenSafe)
          return
        }
        element = element.parentElement
      }

      // Safe to focus now
      inputRef.current.focus()
      inputRef.current.select()
    }

    // Small delay to ensure DOM is stable
    const timer = setTimeout(focusWhenSafe, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Input
      ref={inputRef}
      value={value}
      placeholder={placeholder}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className={className}
    />
  )
}

function InlineNameEditor({
  defaultValue = "",
  placeholder,
  onCommit,
  onCancel,
}: {
  defaultValue?: string
  placeholder?: string
  onCommit: (value: string) => void | Promise<void>
  onCancel: () => void
}) {
  const [value, setValue] = useState(defaultValue)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      // Don't cancel if focus is moving within the sidebar
      const relatedTarget = e.relatedTarget as HTMLElement
      if (relatedTarget?.closest('[data-slot="sidebar"]')) {
        return
      }

      // Small delay to prevent issues with rapid focus changes
      setTimeout(() => {
        if (mountedRef.current) {
          onCancel()
        }
      }, 50)
    },
    [onCancel]
  )

  return (
    <div className="flex-1" onClick={(e) => e.stopPropagation()}>
      <SafeFocusInput
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === "Enter") {
            void onCommit(value)
          } else if (e.key === "Escape") {
            onCancel()
          }
        }}
        onBlur={handleBlur}
        className="h-7 py-1 px-2 text-xs"
      />
    </div>
  )
}
