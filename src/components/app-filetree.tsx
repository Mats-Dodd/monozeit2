import { useLiveQuery, eq } from "@tanstack/react-db"
import { cn } from "@/lib/utils"
import { folderCollection, fileCollection } from "@/lib/collections"
import type { UIFolder, UIFile } from "@/services/types"
import {
  TreeProvider,
  TreeView,
  TreeNode,
  TreeNodeTrigger,
  TreeNodeContent,
  TreeExpander,
  TreeIcon,
  TreeLabel,
} from "@/components/ui/kibo-ui/tree"

type FolderNode = UIFolder & { children: FolderNode[]; files: UIFile[] }

export function AppFileTree({
  projectId,
  className,
  defaultExpandedIds,
  onSelectFolder,
  onSelectFile,
}: {
  projectId: string
  className?: string
  defaultExpandedIds?: string[]
  onSelectFolder?: (folder: UIFolder) => void
  onSelectFile?: (file: UIFile) => void
}) {
  const { data: folders } = useLiveQuery(
    (q) =>
      q
        .from({ folderCollection })
        .where(({ folderCollection }) =>
          eq(folderCollection.project_id, projectId)
        )
        .orderBy(({ folderCollection }) => folderCollection.name),
    [projectId]
  )

  const { data: files } = useLiveQuery(
    (q) =>
      q
        .from({ fileCollection })
        .where(({ fileCollection }) => eq(fileCollection.project_id, projectId))
        .orderBy(({ fileCollection }) => fileCollection.name),
    [projectId]
  )

  const tree = buildFolderFileTree(folders ?? [], files ?? [])

  return (
    <TreeProvider defaultExpandedIds={defaultExpandedIds}>
      <TreeView className={cn(className)}>
        {tree.length === 0 ? (
          <div className="text-sm text-muted-foreground px-3 py-2">
            No folders yet.
          </div>
        ) : (
          tree.map((root, index) =>
            renderFolderNode({
              node: root,
              level: 0,
              isLast: index === tree.length - 1,
              parentPath: [],
              onSelectFolder,
              onSelectFile,
            })
          )
        )}
      </TreeView>
    </TreeProvider>
  )
}

function buildFolderFileTree(
  folders: UIFolder[],
  files: UIFile[]
): FolderNode[] {
  const folderMap = new Map<string, FolderNode>()

  for (const folder of folders) {
    folderMap.set(folder.id, { ...folder, children: [], files: [] })
  }

  for (const folder of folders) {
    if (folder.parent_id) {
      const parent = folderMap.get(folder.parent_id)
      const node = folderMap.get(folder.id)
      if (parent && node) {
        parent.children.push(node)
      }
    }
  }

  for (const file of files) {
    const parentFolder = folderMap.get(file.folder_id)
    if (parentFolder) {
      parentFolder.files.push(file)
    }
  }

  const roots: FolderNode[] = []
  for (const node of folderMap.values()) {
    if (node.parent_id == null) {
      roots.push(node)
    }
  }

  const sortRecursively = (node: FolderNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name))
    node.files.sort((a, b) => a.name.localeCompare(b.name))
    for (const child of node.children) sortRecursively(child)
  }

  roots.sort((a, b) => a.name.localeCompare(b.name))
  for (const root of roots) sortRecursively(root)

  return roots
}

function renderFolderNode({
  node,
  level,
  isLast,
  parentPath,
  onSelectFolder,
  onSelectFile,
}: {
  node: FolderNode
  level: number
  isLast: boolean
  parentPath: boolean[]
  onSelectFolder?: (folder: UIFolder) => void
  onSelectFile?: (file: UIFile) => void
}) {
  const hasChildren = node.children.length > 0 || node.files.length > 0

  // Prepare combined ordering: folders first (alpha), then files (alpha)
  const folderChildren = node.children
  const fileChildren = node.files

  // Compute the parent path to pass down to descendants
  const currentPathForChildren = (() => {
    const next = parentPath.slice()
    if (level > 0) {
      next[level - 1] = isLast
    }
    return next
  })()

  return (
    <TreeNode
      key={node.id}
      nodeId={node.id}
      level={level}
      isLast={isLast}
      parentPath={parentPath}
    >
      <TreeNodeTrigger onClick={() => onSelectFolder?.(node)}>
        <TreeExpander hasChildren={hasChildren} />
        <TreeIcon hasChildren />
        <TreeLabel>{node.name}</TreeLabel>
      </TreeNodeTrigger>
      <TreeNodeContent hasChildren={hasChildren}>
        {folderChildren.map((child, idx) =>
          renderFolderNode({
            node: child,
            level: level + 1,
            isLast:
              idx === folderChildren.length - 1 && fileChildren.length === 0,
            parentPath: currentPathForChildren,
            onSelectFolder,
            onSelectFile,
          })
        )}
        {fileChildren.map((file, idx) =>
          renderFileNode({
            file,
            level: level + 1,
            isLast: idx === fileChildren.length - 1,
            parentPath: currentPathForChildren,
            onSelectFile,
          })
        )}
      </TreeNodeContent>
    </TreeNode>
  )
}

function renderFileNode({
  file,
  level,
  isLast,
  parentPath,
  onSelectFile,
}: {
  file: UIFile
  level: number
  isLast: boolean
  parentPath: boolean[]
  onSelectFile?: (file: UIFile) => void
}) {
  return (
    <TreeNode
      key={file.id}
      nodeId={file.id}
      level={level}
      isLast={isLast}
      parentPath={parentPath}
    >
      <TreeNodeTrigger onClick={() => onSelectFile?.(file)}>
        <TreeIcon />
        <TreeLabel>{file.name}</TreeLabel>
      </TreeNodeTrigger>
    </TreeNode>
  )
}

export default AppFileTree
