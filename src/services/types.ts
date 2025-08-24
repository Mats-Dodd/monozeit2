import type {
  Project as DbProject,
  Folder as DbFolder,
  File as DbFile,
} from "@/db/schema"

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[]

type OptionalTimestamps = { created_at?: Date; updated_at?: Date }

export type UIProject = Omit<DbProject, "created_at"> & { created_at?: Date }
export type UIFolder = Omit<DbFolder, "created_at" | "updated_at"> &
  OptionalTimestamps
export type UIFile = Omit<DbFile, "created_at" | "updated_at"> &
  OptionalTimestamps

// UI input types for services
export type ProjectCreateUI = {
  id?: string
  name: string
  ownerId: string
  description?: string | null
  shared_user_ids?: string[]
}
export type ProjectUpdateUIPatch = {
  name?: string
  description?: string | null
  shared_user_ids?: string[]
}

export type FolderCreateUI = {
  id?: string
  projectId: string
  name: string
  parentId?: string | null
}
export type FolderUpdateUIPatch = {
  name?: string
  parentId?: string | null
}

export type FileCreateUI = {
  id?: string
  projectId: string
  folderId: string
  name: string
  content?: JsonValue
}
export type FileUpdateUIPatch = {
  name?: string
  folderId?: string
  content?: JsonValue
}
