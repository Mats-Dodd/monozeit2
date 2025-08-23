import { createFileRoute } from "@tanstack/react-router"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import {
  todoCollection,
  projectCollection,
  usersCollection,
  folderCollection,
  fileCollection,
} from "@/lib/collections"
import { type Todo, type Folder, type File } from "@/db/schema"

// Type for folders with nested children
type FolderWithChildren = Folder & { children: FolderWithChildren[] }

export const Route = createFileRoute("/_authenticated/project/$projectId")({
  component: ProjectPage,
  ssr: false,
  loader: async () => {
    await projectCollection.preload()
    await todoCollection.preload()
    await folderCollection.preload()
    await fileCollection.preload()
    return null
  },
})

function ProjectPage() {
  const { projectId } = Route.useParams()
  const { data: session } = authClient.useSession()
  const [newTodoText, setNewTodoText] = useState("")
  const [newFolderName, setNewFolderName] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [newFileName, setNewFileName] = useState("")
  const [editingFileId, setEditingFileId] = useState<number | null>(null)
  const [fileContent, setFileContent] = useState("")

  const { data: todos } = useLiveQuery(
    (q) =>
      q
        .from({ todoCollection })
        .where(({ todoCollection }) =>
          eq(todoCollection.project_id, parseInt(projectId, 10))
        )
        .orderBy(({ todoCollection }) => todoCollection.created_at),
    [projectId]
  )

  const { data: folders } = useLiveQuery(
    (q) =>
      q
        .from({ folderCollection })
        .where(({ folderCollection }) =>
          eq(folderCollection.project_id, parseInt(projectId, 10))
        )
        .orderBy(({ folderCollection }) => folderCollection.name),
    [projectId]
  )

  const { data: files } = useLiveQuery(
    (q) =>
      q
        .from({ fileCollection })
        .where(({ fileCollection }) =>
          eq(fileCollection.project_id, parseInt(projectId, 10))
        )
        .orderBy(({ fileCollection }) => fileCollection.name),
    [projectId]
  )

  const { data: users } = useLiveQuery((q) =>
    q.from({ users: usersCollection })
  )
  const { data: usersInProjects } = useLiveQuery(
    (q) =>
      q
        .from({ projects: projectCollection })
        .where(({ projects }) => eq(projects.id, parseInt(projectId, 10)))
        .fn.select(({ projects }) => ({
          users: projects.shared_user_ids.concat(projects.owner_id),
          owner: projects.owner_id,
        })),
    [projectId]
  )
  const usersInProject = usersInProjects?.[0]

  const { data: projects } = useLiveQuery(
    (q) =>
      q
        .from({ projectCollection })
        .where(({ projectCollection }) =>
          eq(projectCollection.id, parseInt(projectId, 10))
        ),
    [projectId]
  )
  const project = projects[0]

  const addTodo = () => {
    if (newTodoText.trim() && session) {
      todoCollection.insert({
        user_id: session.user.id,
        id: Math.floor(Math.random() * 100000),
        text: newTodoText.trim(),
        completed: false,
        project_id: parseInt(projectId),
        user_ids: [],
        created_at: new Date(),
      })
      setNewTodoText("")
    }
  }

  const toggleTodo = (todo: Todo) => {
    todoCollection.update(todo.id, (draft) => {
      draft.completed = !draft.completed
    })
  }

  const deleteTodo = (id: number) => {
    todoCollection.delete(id)
  }

  const addFolder = () => {
    if (newFolderName.trim()) {
      folderCollection.insert({
        id: Math.floor(Math.random() * 100000),
        project_id: parseInt(projectId),
        parent_id: selectedFolderId || null,
        name: newFolderName.trim(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      setNewFolderName("")
    }
  }

  const deleteFolder = (id: number) => {
    folderCollection.delete(id)
  }

  const renameFolder = (folder: Folder) => {
    const newName = prompt("Rename folder:", folder.name)
    if (newName && newName !== folder.name) {
      folderCollection.update(folder.id, (draft) => {
        draft.name = newName
      })
    }
  }

  // File CRUD operations
  const addFile = () => {
    if (newFileName.trim() && selectedFolderId) {
      fileCollection.insert({
        id: Math.floor(Math.random() * 100000),
        project_id: parseInt(projectId),
        folder_id: selectedFolderId,
        name: newFileName.trim(),
        content: { text: "" }, // Start with empty content
        created_at: new Date(),
        updated_at: new Date(),
      })
      setNewFileName("")
    }
  }

  const deleteFile = (id: number) => {
    fileCollection.delete(id)
  }

  const renameFile = (file: File) => {
    const newName = prompt("Rename file:", file.name)
    if (newName && newName !== file.name) {
      fileCollection.update(file.id, (draft) => {
        draft.name = newName
      })
    }
  }

  const editFile = (file: File) => {
    setEditingFileId(file.id)
    setFileContent((file.content as { text: string }).text || "")
  }

  const saveFileContent = () => {
    if (editingFileId !== null) {
      fileCollection.update(editingFileId, (draft) => {
        draft.content = { text: fileContent }
      })
      setEditingFileId(null)
      setFileContent("")
    }
  }

  // Build folder tree structure
  const buildFolderTree = (
    folders: Folder[],
    parentId: number | null = null
  ): FolderWithChildren[] => {
    return folders
      .filter((f) => f.parent_id === parentId)
      .map((folder) => ({
        ...folder,
        children: buildFolderTree(folders, folder.id),
      }))
  }

  const folderTree = folders ? buildFolderTree(folders) : []

  if (!project) {
    return <div className="p-6">Project not found</div>
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1
          className="text-2xl font-bold text-gray-800 mb-2 cursor-pointer hover:bg-gray-50 p-0 rounded"
          onClick={() => {
            const newName = prompt("Edit project name:", project.name)
            if (newName && newName !== project.name) {
              projectCollection.update(project.id, (draft) => {
                draft.name = newName
              })
            }
          }}
        >
          {project.name}
        </h1>

        <p
          className="text-gray-600 mb-3 cursor-pointer hover:bg-gray-50 p-0 rounded min-h-[1.5rem]"
          onClick={() => {
            const newDescription = prompt(
              "Edit project description:",
              project.description || ""
            )
            if (newDescription !== null) {
              projectCollection.update(project.id, (draft) => {
                draft.description = newDescription
              })
            }
          }}
        >
          {project.description || "Click to add description..."}
        </p>

        {/* Folders Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Folders</h2>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addFolder()}
              placeholder={
                selectedFolderId ? "Add subfolder..." : "Add a new folder..."
              }
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addFolder}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Add Folder
            </button>
            {selectedFolderId && (
              <button
                onClick={() => setSelectedFolderId(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Root
              </button>
            )}
          </div>

          {/* Folder Tree Component */}
          <div className="space-y-1">
            {folderTree.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No folders yet. Create one above!
              </p>
            ) : (
              <FolderTreeView
                folders={folderTree}
                level={0}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onDeleteFolder={deleteFolder}
                onRenameFolder={renameFolder}
              />
            )}
          </div>
        </div>

        {/* Files Section */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Files</h2>

          {selectedFolderId ? (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFile()}
                  placeholder="Add a new file..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addFile}
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  Add File
                </button>
              </div>

              {/* File List */}
              <div className="space-y-2">
                {files
                  ?.filter((f) => f.folder_id === selectedFolderId)
                  .map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-md"
                    >
                      <span className="flex-1">📄 {file.name}</span>
                      <button
                        onClick={() => editFile(file)}
                        className="px-2 py-1 text-sm text-green-600 hover:bg-green-50 rounded"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => renameFile(file)}
                        className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => deleteFile(file.id)}
                        className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                {files?.filter((f) => f.folder_id === selectedFolderId)
                  .length === 0 && (
                  <p className="text-gray-500 text-sm">
                    No files in this folder yet.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-sm">
              Select a folder to manage files.
            </p>
          )}
        </div>

        {/* File Editor Modal */}
        {editingFileId !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">Edit File Content</h3>
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="Enter file content..."
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={saveFileContent}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingFileId(null)
                    setFileContent("")
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Add a new todo..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addTodo}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </div>

        <ul className="space-y-2">
          {todos?.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-md shadow-sm"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span
                className={`flex-1 ${
                  todo.completed
                    ? "line-through text-gray-500"
                    : "text-gray-800"
                }`}
              >
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="px-2 py-1 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        {(!todos || todos.length === 0) && (
          <div className="text-center py-8">
            <p className="text-gray-500">No todos yet. Add one above!</p>
          </div>
        )}

        <hr className="my-8 border-gray-200" />

        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Project Members
          </h3>
          <div className="space-y-2">
            {(session?.user.id === project.owner_id
              ? users
              : users?.filter((user) => usersInProject?.users.includes(user.id))
            )?.map((user) => {
              const isInProject = usersInProject?.users.includes(user.id)
              const isOwner = user.id === usersInProject?.owner
              const canEditMembership = session?.user.id === project.owner_id
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                >
                  {canEditMembership && (
                    <input
                      type="checkbox"
                      checked={isInProject}
                      onChange={() => {
                        if (isInProject && !isOwner) {
                          projectCollection.update(project.id, (draft) => {
                            draft.shared_user_ids =
                              draft.shared_user_ids.filter(
                                (id) => id !== user.id
                              )
                          })
                        } else if (!isInProject) {
                          projectCollection.update(project.id, (draft) => {
                            draft.shared_user_ids.push(user.id)
                          })
                        }
                      }}
                      disabled={isOwner}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                    />
                  )}
                  <span className="flex-1 text-gray-800">{user.name}</span>
                  {isOwner && (
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                      Owner
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// Folder Tree Component
function FolderTreeView({
  folders,
  level,
  selectedFolderId,
  onSelectFolder,
  onDeleteFolder,
  onRenameFolder,
}: {
  folders: FolderWithChildren[]
  level: number
  selectedFolderId: number | null
  onSelectFolder: (id: number | null) => void
  onDeleteFolder: (id: number) => void
  onRenameFolder: (folder: Folder) => void
}) {
  return (
    <div className={`${level > 0 ? "ml-4" : ""}`}>
      {folders.map((folder) => (
        <div key={folder.id} className="space-y-1">
          <div
            className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
              selectedFolderId === folder.id ? "bg-blue-100" : ""
            }`}
          >
            <span className="flex-1" onClick={() => onSelectFolder(folder.id)}>
              {level > 0 && <span className="text-gray-400 mr-1">└</span>}
              📁 {folder.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRenameFolder(folder)
              }}
              className="px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
            >
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDeleteFolder(folder.id)
              }}
              className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
            >
              Delete
            </button>
          </div>
          {folder.children && folder.children.length > 0 && (
            <FolderTreeView
              folders={folder.children}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onDeleteFolder={onDeleteFolder}
              onRenameFolder={onRenameFolder}
            />
          )}
        </div>
      ))}
    </div>
  )
}
