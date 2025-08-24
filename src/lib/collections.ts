import { createCollection } from "@tanstack/react-db"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import {
  selectProjectSchema,
  selectUsersSchema,
  selectFolderSchema,
  selectFileSchema,
} from "@/db/schema"
import { trpc } from "@/lib/trpc-client"

export const usersCollection = createCollection(
  electricCollectionOptions({
    id: "users",
    shapeOptions: {
      url: new URL(
        `/api/users`,
        typeof window !== `undefined`
          ? window.location.origin
          : `http://localhost:5173`
      ).toString(),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date)
        },
      },
    },
    schema: selectUsersSchema,
    getKey: (item) => item.id,
  })
)
export const projectCollection = createCollection(
  electricCollectionOptions({
    id: "projects",
    shapeOptions: {
      url: new URL(
        `/api/projects`,
        typeof window !== `undefined`
          ? window.location.origin
          : `http://localhost:5173`
      ).toString(),
      parser: {
        timestamptz: (date: string) => {
          return new Date(date)
        },
      },
    },
    schema: selectProjectSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newProject } = transaction.mutations[0]
      const result = await trpc.projects.create.mutate({
        id: newProject.id,
        name: newProject.name,
        description: newProject.description,
        owner_id: newProject.owner_id,
        shared_user_ids: newProject.shared_user_ids,
      })

      return { txid: result.txid }
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedProject } = transaction.mutations[0]
      const result = await trpc.projects.update.mutate({
        id: updatedProject.id,
        data: {
          name: updatedProject.name,
          description: updatedProject.description,
          shared_user_ids: updatedProject.shared_user_ids,
        },
      })

      return { txid: result.txid }
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedProject } = transaction.mutations[0]
      const result = await trpc.projects.delete.mutate({
        id: deletedProject.id,
      })

      return { txid: result.txid }
    },
  })
)

export const folderCollection = createCollection(
  electricCollectionOptions({
    id: "folders",
    shapeOptions: {
      url: new URL(
        `/api/folders`,
        typeof window !== `undefined`
          ? window.location.origin
          : `http://localhost:5173`
      ).toString(),
      parser: {
        // Parse timestamp columns into JavaScript Date objects
        timestamptz: (date: string) => {
          return new Date(date)
        },
      },
    },
    schema: selectFolderSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newFolder } = transaction.mutations[0]
      const result = await trpc.folders.create.mutate({
        id: newFolder.id,
        project_id: newFolder.project_id,
        parent_id: newFolder.parent_id,
        name: newFolder.name,
      })

      return { txid: result.txid }
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedFolder } = transaction.mutations[0]
      const result = await trpc.folders.update.mutate({
        id: updatedFolder.id,
        data: {
          parent_id: updatedFolder.parent_id,
          name: updatedFolder.name,
        },
      })

      return { txid: result.txid }
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedFolder } = transaction.mutations[0]
      const result = await trpc.folders.delete.mutate({
        id: deletedFolder.id,
      })

      return { txid: result.txid }
    },
  })
)

export const fileCollection = createCollection(
  electricCollectionOptions({
    id: "files",
    shapeOptions: {
      url: new URL(
        `/api/files`,
        typeof window !== `undefined`
          ? window.location.origin
          : `http://localhost:5173`
      ).toString(),
      parser: {
        // Parse timestamp columns into JavaScript Date objects
        timestamptz: (date: string) => {
          return new Date(date)
        },
      },
    },
    schema: selectFileSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newFile } = transaction.mutations[0]
      const result = await trpc.files.create.mutate({
        id: newFile.id,
        project_id: newFile.project_id,
        folder_id: newFile.folder_id,
        name: newFile.name,
        content: newFile.content,
      })

      return { txid: result.txid }
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedFile } = transaction.mutations[0]
      const result = await trpc.files.update.mutate({
        id: updatedFile.id,
        data: {
          folder_id: updatedFile.folder_id,
          name: updatedFile.name,
          content: updatedFile.content,
        },
      })

      return { txid: result.txid }
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedFile } = transaction.mutations[0]
      const result = await trpc.files.delete.mutate({
        id: deletedFile.id,
      })

      return { txid: result.txid }
    },
  })
)
