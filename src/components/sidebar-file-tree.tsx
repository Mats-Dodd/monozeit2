"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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

  return (
    <TreeProvider defaultExpandedIds={defaultExpanded} className="w-full">
      <ExpansionPersistence projectId={projectId} />
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div>
            <TreeView className="px-1 py-1">
              {isEmpty && !draft ? <EmptyState /> : null}
              <RootList
                nodes={tree}
                onCreateChild={(folderId, type) =>
                  setDraft(
                    type === "folder"
                      ? { type: "folder", parentId: folderId }
                      : { type: "file", parentId: folderId }
                  )
                }
                onRenameFolder={(f) =>
                  setRenaming({ type: "folder", id: f.id, name: f.name })
                }
                onRenameFile={(f) =>
                  setRenaming({ type: "file", id: f.id, name: f.name })
                }
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
        <ContextMenuContent>
          {/* Root actions */}
          <ContextMenuItem
            onClick={() => setDraft({ type: "folder", parentId: null })}
          >
            Create folder
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={!isEmpty}
            onClick={() => {
              if (!isEmpty) return
              setPendingRootFileAfterFolder(true)
              setDraft({ type: "folder", parentId: null })
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
        <ContextMenuContent>
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
                <ContextMenuContent>
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
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  return (
    <div className="flex-1">
      <Input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            void onCommit(value)
          } else if (e.key === "Escape") {
            onCancel()
          }
        }}
        onBlur={() => onCancel()}
        className="h-7 py-1 px-2 text-xs"
      />
    </div>
  )
}
