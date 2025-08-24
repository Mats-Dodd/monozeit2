import type {
  ProjectCreateUI,
  ProjectUpdateUIPatch,
  FolderCreateUI,
  FolderUpdateUIPatch,
  FileCreateUI,
  FileUpdateUIPatch,
  JsonValue,
} from "./types"

// Map UI args (camelCase) to DB-shaped payloads (snake_case)

export function toDbProjectCreate(
  ui: Omit<ProjectCreateUI, "id"> & { id: string }
) {
  return {
    id: ui.id,
    name: ui.name,
    description: ui.description ?? "",
    owner_id: ui.ownerId,
    shared_user_ids: ui.shared_user_ids ?? [],
  }
}

export function toDbProjectUpdate(ui: ProjectUpdateUIPatch) {
  return {
    name: ui.name,
    description: ui.description,
    shared_user_ids: ui.shared_user_ids,
  }
}

export function toDbFolderCreate(
  ui: Omit<FolderCreateUI, "id"> & { id: string }
) {
  return {
    id: ui.id,
    project_id: ui.projectId,
    parent_id: ui.parentId ?? null,
    name: ui.name,
  }
}

export function toDbFolderUpdate(ui: FolderUpdateUIPatch) {
  return {
    name: ui.name,
    parent_id: ui.parentId,
  }
}

export function toDbFileCreate(ui: Omit<FileCreateUI, "id"> & { id: string }) {
  return {
    id: ui.id,
    project_id: ui.projectId,
    folder_id: ui.folderId,
    name: ui.name,
    content: (ui.content ?? { text: "" }) as JsonValue,
  }
}

export function toDbFileUpdate(ui: FileUpdateUIPatch) {
  return {
    name: ui.name,
    folder_id: ui.folderId,
    content: ui.content as JsonValue | undefined,
  }
}
