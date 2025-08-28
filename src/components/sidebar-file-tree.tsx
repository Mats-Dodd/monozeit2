"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLiveQuery, eq } from "@tanstack/react-db"
import type { UIFile, UIFolder } from "@/services/types"
import { folderCollection, fileCollection } from "@/lib/collections"
import { createFolder, updateFolder, deleteFolder } from "@/services/folders"
import { createFile, updateFile, deleteFile } from "@/services/files"
import { Input } from "@/components/ui/input"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
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
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  DraggableTreeItem,
  RootDropZone,
  DroppableArea,
} from "@/components/draggable-tree-item"
import { handleFileClick } from "@/services/tabs"
import { LoroDoc } from "loro-crdt"

export function getEmptyLoroDoc() {
  const loroDoc = new LoroDoc()
  const bytes = loroDoc.export({ mode: "snapshot" })
  const base64Content = btoa(String.fromCharCode(...bytes))
  return base64Content
}

type FolderNode = UIFolder & {
  childFolders: FolderNode[]
  files: UIFile[]
}

type TreeData = {
  rootFolders: FolderNode[]
  rootFiles: UIFile[]
}

type DraftState =
  | {
      type: "folder"
      parentId: string | null
    }
  | {
      type: "file"
      parentId: string | null
    }
  | null

type RenamingState =
  | { type: "folder"; id: string; name: string }
  | { type: "file"; id: string; name: string }
  | null

type DeletingState =
  | { type: "folder"; id: string; name: string }
  | { type: "file"; id: string; name: string }
  | null

type DraggedData = {
  type: "file" | "folder"
  name: string
  id: string
  parentId?: string | null
}

export function SidebarFileTree({
  projectId,
}: {
  projectId: string | undefined
}) {
  const { data: folders = [] } = projectId
    ? useLiveQuery(
        (q) =>
          q
            .from({ folderCollection })
            .where(({ folderCollection }) =>
              eq(folderCollection.project_id, projectId)
            )
            .orderBy(({ folderCollection }) => folderCollection.name),
        [projectId]
      )
    : { data: [] }

  const { data: files = [] } = projectId
    ? useLiveQuery(
        (q) =>
          q
            .from({ fileCollection })
            .where(({ fileCollection }) =>
              eq(fileCollection.project_id, projectId)
            )
            .orderBy(({ fileCollection }) => fileCollection.name),
        [projectId]
      )
    : { data: [] }

  const [draft, setDraft] = useState<DraftState>(null)
  const [renaming, setRenaming] = useState<RenamingState>(null)
  const [deleting, setDeleting] = useState<DeletingState>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [pendingRootFileAfterFolder, setPendingRootFileAfterFolder] =
    useState(false)
  const [expandForDraft, setExpandForDraft] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [draggedItem, setDraggedItem] = useState<{
    type: "file" | "folder"
    name: string
    id: string
  } | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start dragging
      },
    }),
    useSensor(KeyboardSensor)
  )

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

  const isEmpty = tree.rootFolders.length === 0 && tree.rootFiles.length === 0

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

  // Handle delete requests
  const requestDeleteFolder = useCallback((folder: UIFolder) => {
    setDeleting({ type: "folder", id: folder.id, name: folder.name })
  }, [])

  const requestDeleteFile = useCallback((file: UIFile) => {
    setDeleting({ type: "file", id: file.id, name: file.name })
  }, [])

  // Helper to check if a folder is a descendant of another
  const isDescendantOf = useCallback(
    (childId: string, ancestorId: string): boolean => {
      const visited = new Set<string>()

      function checkParent(folderId: string): boolean {
        if (visited.has(folderId)) {
          return false // Prevent infinite loops
        }
        visited.add(folderId)

        const folder = folders.find((f) => f.id === folderId)
        if (!folder) {
          return false
        }
        if (!folder.parent_id) {
          return false
        }
        if (folder.parent_id === ancestorId) {
          return true
        }

        return checkParent(folder.parent_id)
      }

      const result = checkParent(childId)

      return result
    },
    [folders]
  )

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current

    if (data) {
      setDraggedItem({
        type: data.type,
        name: data.name,
        id: data.id,
      })
    }
  }, [])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setDraggedItem(null)

      if (!over || !active.data.current) {
        return
      }

      const draggedData = active.data.current as DraggedData
      const overId = over.id as string
      const overData = over.data.current

      // Handle different drop scenarios
      if (overData?.type === "insertion-point") {
        // Dropped on insertion point (between items)
        const targetId = overData.targetId
        const targetData =
          overData.targetType === "folder"
            ? folders.find((f) => f.id === targetId)
            : files.find((f) => f.id === targetId)

        if (!targetData) return

        // Move to the same parent as the target
        const newParentId =
          overData.targetType === "folder"
            ? (targetData as UIFolder).parent_id
            : (targetData as UIFile).folder_id

        await moveItem(draggedData, newParentId)
      } else if (overData?.type === "root-zone") {
        // Dropped on the bottom root drop zone
        await moveItem(draggedData, null)
      } else if (overId.startsWith("droppable-")) {
        // Dropped on a folder (droppable ID format: "droppable-{folderId}")
        const actualFolderId = overId.replace("droppable-", "")

        if (
          draggedData.type === "folder" &&
          isDescendantOf(actualFolderId, draggedData.id)
        ) {
          // Prevent dropping a folder into its descendant
          return
        }

        await moveItem(draggedData, actualFolderId)
      }
    },
    [folders, files, isDescendantOf]
  )

  // Helper to move items
  const moveItem = useCallback(
    async (draggedData: DraggedData, newParentId: string | null) => {
      if (draggedData.type === "file") {
        await updateFile({
          id: draggedData.id,
          folderId: newParentId,
        })
      } else if (draggedData.type === "folder") {
        await updateFolder({
          id: draggedData.id,
          parentId: newParentId,
        })
      }
    },
    []
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        // Prefer pointerWithin so items below last row don't capture
        const pointerHits = pointerWithin(args)
        if (pointerHits.length > 0) return pointerHits
        return closestCenter(args)
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <TreeProvider defaultExpandedIds={defaultExpanded} className="w-full">
        <ExpansionPersistence projectId={projectId} />
        <AutoExpandForDraft
          expandForDraft={expandForDraft}
          onCleared={() => setExpandForDraft(null)}
        />
        <ContextMenu onOpenChange={setIsMenuOpen}>
          <ContextMenuTrigger asChild>
            <div>
              <TreeView className="px-1 py-1 min-h-[200px]">
                {isEmpty && !draft ? <EmptyState /> : null}
                <RootList
                  folders={tree.rootFolders}
                  files={tree.rootFiles}
                  onCreateChild={handleCreateChild}
                  onRenameFolder={(f) => handleRename(f, "folder")}
                  onRenameFile={(f) => handleRename(f, "file")}
                  onDeleteFolder={requestDeleteFolder}
                  onDeleteFile={requestDeleteFile}
                  onFileClick={handleFileClick}
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
                      const newFileId = await createFile({
                        projectId,
                        folderId: draft.parentId ?? null,
                        name: trimmed,
                        content: getEmptyLoroDoc(),
                      })
                      // Select the newly created file
                      handleFileClick(newFileId)
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
                {/* Root-level insertion point after last root item */}
                {(tree.rootFolders.length > 0 || tree.rootFiles.length > 0) && (
                  <DroppableArea
                    id={
                      tree.rootFiles.length
                        ? tree.rootFiles[tree.rootFiles.length - 1].id
                        : tree.rootFolders[tree.rootFolders.length - 1].id
                    }
                    position="after"
                    targetType={tree.rootFiles.length ? "file" : "folder"}
                    className="mt-1"
                  >
                    <div />
                  </DroppableArea>
                )}
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
            <ContextMenuItem
              onClick={() => {
                const action = () => {
                  setDraft({ type: "file", parentId: null })
                }
                setPendingAction(() => action)
              }}
            >
              Create file
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {/* Delete confirmation dialog */}
        <AlertDialog
          open={!!deleting}
          onOpenChange={(open) => !open && setDeleting(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {deleting?.type === "folder" ? "Delete folder" : "Delete file"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {deleting?.type === "folder"
                  ? `Are you sure you want to delete "${deleting.name}"? This will permanently delete the folder and all its contents, including any nested folders and files.`
                  : `Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                onClick={async () => {
                  if (!deleting) return
                  setIsDeleting(true)
                  try {
                    if (deleting.type === "folder") {
                      await deleteFolder(deleting.id)
                    } else {
                      await deleteFile(deleting.id)
                    }
                    setDeleting(null)
                  } catch (error) {
                    console.error("Failed to delete:", error)
                  } finally {
                    setIsDeleting(false)
                  }
                }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TreeProvider>

      {/* Bottom root drop zone */}
      <RootDropZone className="h-20" />

      {/* Drag overlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: "ease-out" }}>
        {draggedItem ? (
          <div className="bg-muted/90 rounded px-2 py-1 text-sm shadow-md backdrop-blur-sm select-none">
            {draggedItem.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
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

function buildTree(folders: UIFolder[], files: UIFile[]): TreeData {
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

  // Separate root files from folder files
  const rootFiles: UIFile[] = []
  for (const file of sortedFiles) {
    if (file.folder_id === null || file.folder_id === undefined) {
      rootFiles.push(file)
    } else {
      const parent = folderById.get(file.folder_id)
      if (parent) {
        parent.files.push(file)
      }
    }
  }

  const attachChildren = (nodes: FolderNode[]) => {
    for (const n of nodes) {
      n.childFolders = byParent.get(n.id) ?? []
      attachChildren(n.childFolders)
    }
  }

  const rootFolders = byParent.get(null) ?? []
  attachChildren(rootFolders)

  return {
    rootFolders,
    rootFiles,
  }
}

function EmptyState() {
  return (
    <div className="text-xs text-muted-foreground px-2 py-3">
      Right-click to create a folder or file.
    </div>
  )
}

function RootList(props: {
  folders: FolderNode[]
  files: UIFile[]
  onCreateChild: (folderId: string, type: "folder" | "file") => void
  onRenameFolder: (f: UIFolder) => void
  onRenameFile: (f: UIFile) => void
  onDeleteFolder: (f: UIFolder) => void
  onDeleteFile: (f: UIFile) => void
  onFileClick: (fileId: string) => void
  draft: DraftState
  onCancelDraft: () => void
  onCommitDraft: (name: string) => Promise<void>
  renaming: RenamingState
  onCancelRenaming: () => void
  onCommitRenaming: (name: string) => Promise<void>
}) {
  const {
    folders,
    files,
    onCreateChild,
    onRenameFolder,
    onRenameFile,
    onDeleteFolder,
    onDeleteFile,
    onFileClick,
    draft,
    onCancelDraft,
    onCommitDraft,
    renaming,
    onCancelRenaming,
    onCommitRenaming,
  } = props

  return (
    <div className="space-y-1">
      {/* Root folders */}
      {folders.map((folder, idx) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          level={0}
          isLast={idx === folders.length - 1}
          parentPath={[]}
          onCreateChild={onCreateChild}
          onRenameFolder={onRenameFolder}
          onRenameFile={onRenameFile}
          onDeleteFolder={onDeleteFolder}
          onDeleteFile={onDeleteFile}
          onFileClick={onFileClick}
          draft={draft}
          onCancelDraft={onCancelDraft}
          onCommitDraft={onCommitDraft}
          renaming={renaming}
          onCancelRenaming={onCancelRenaming}
          onCommitRenaming={onCommitRenaming}
        />
      ))}

      {/* Root files */}
      {files.map((file) => (
        <DraggableTreeItem
          key={file.id}
          id={file.id}
          data={{
            type: "file",
            name: file.name,
            id: file.id,
            parentId: file.folder_id,
          }}
          canDrop={false}
        >
          <TreeNode nodeId={file.id} level={0} parentPath={[]}>
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div>
                  <TreeNodeTrigger onClick={() => onFileClick(file.id)}>
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
              <ContextMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                <ContextMenuItem onClick={() => onRenameFile(file)}>
                  Rename
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={() => onDeleteFile(file)}>
                  Delete
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </TreeNode>
        </DraggableTreeItem>
      ))}

      {/* Root-level draft */}
      {draft && draft.parentId === null && (
        <TreeNode nodeId="__draft_root__" level={0} parentPath={[]}>
          <TreeNodeTrigger>
            <TreeExpander hasChildren={false} />
            <TreeIcon hasChildren={draft.type === "folder"} />
            <InlineNameEditor
              placeholder={draft.type === "folder" ? "New folder" : "New file"}
              onCancel={onCancelDraft}
              onCommit={onCommitDraft}
            />
          </TreeNodeTrigger>
        </TreeNode>
      )}

      {/* Empty space for right-click */}
      <div className="flex-1 min-h-[100px]" />
    </div>
  )
}

function FolderItem(props: {
  folder: FolderNode
  level: number
  isLast: boolean
  parentPath: boolean[]
  onCreateChild: (folderId: string, type: "folder" | "file") => void
  onRenameFolder: (f: UIFolder) => void
  onRenameFile: (f: UIFile) => void
  onDeleteFolder: (f: UIFolder) => void
  onDeleteFile: (f: UIFile) => void
  onFileClick: (fileId: string) => void
  draft: DraftState
  onCancelDraft: () => void
  onCommitDraft: (name: string) => Promise<void>
  renaming: RenamingState
  onCancelRenaming: () => void
  onCommitRenaming: (name: string) => Promise<void>
}) {
  const {
    folder,
    level,
    parentPath,
    onCreateChild,
    onRenameFolder,
    onRenameFile,
    onDeleteFolder,
    onDeleteFile,
    onFileClick,
    draft,
    onCancelDraft,
    onCommitDraft,
    renaming,
    onCancelRenaming,
    onCommitRenaming,
  } = props

  const isRenaming = renaming?.type === "folder" && renaming.id === folder.id

  return (
    <DraggableTreeItem
      id={folder.id}
      data={{
        type: "folder",
        name: folder.name,
        id: folder.id,
        parentId: folder.parent_id,
      }}
      canDrop={true}
    >
      <TreeNode
        nodeId={folder.id}
        level={level}
        isLast={props.isLast}
        parentPath={parentPath}
      >
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
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onDeleteFolder(folder)}>
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        <TreeNodeContent hasChildren>
          <div className="space-y-1">
            {/* Draft child under this folder */}
            {draft && draft.parentId === folder.id && (
              <TreeNode
                nodeId={`__draft_${folder.id}__`}
                level={level + 1}
                parentPath={[...parentPath, props.isLast]}
              >
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
                level={level + 1}
                isLast={idx === folder.childFolders.length - 1}
                parentPath={[...parentPath, props.isLast]}
                onCreateChild={onCreateChild}
                onRenameFolder={onRenameFolder}
                onRenameFile={onRenameFile}
                onDeleteFolder={onDeleteFolder}
                onDeleteFile={onDeleteFile}
                onFileClick={onFileClick}
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
              <DraggableTreeItem
                key={file.id}
                id={file.id}
                data={{
                  type: "file",
                  name: file.name,
                  id: file.id,
                  parentId: file.folder_id,
                }}
                canDrop={false}
              >
                <TreeNode
                  nodeId={file.id}
                  level={level + 1}
                  parentPath={[...parentPath, props.isLast]}
                >
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <div>
                        <TreeNodeTrigger onClick={() => onFileClick(file.id)}>
                          <TreeExpander hasChildren={false} />
                          <TreeIcon hasChildren={false} />
                          {renaming?.type === "file" &&
                          renaming.id === file.id ? (
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
                      <ContextMenuSeparator />
                      <ContextMenuItem onClick={() => onDeleteFile(file)}>
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </TreeNode>
              </DraggableTreeItem>
            ))}
          </div>
        </TreeNodeContent>
      </TreeNode>
    </DraggableTreeItem>
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

// Borderless inline editor styles
const inlineEditorInputClass =
  "h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-transparent px-0 placeholder:text-muted-foreground"

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
        className={inlineEditorInputClass}
      />
    </div>
  )
}
