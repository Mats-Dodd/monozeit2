import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
  text,
  jsonb,
} from "drizzle-orm/pg-core"
import type { AnyPgColumn } from "drizzle-orm/pg-core"
import { createSchemaFactory } from "drizzle-zod"
import { z } from "zod"
export * from "./auth-schema"
import { users } from "./auth-schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
  createSchemaFactory({ zodInstance: z })

export const projectsTable = pgTable(`projects`, {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  shared_user_ids: text("shared_user_ids").array().notNull().default([]),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  owner_id: text("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

export const todosTable = pgTable(`todos`, {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: varchar({ length: 500 }).notNull(),
  completed: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  project_id: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  user_ids: text("user_ids").array().notNull().default([]),
})

export const folders = pgTable("folders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  project_id: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  parent_id: integer("parent_id").references((): AnyPgColumn => folders.id, {
    onDelete: "cascade",
  }),
  name: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const files = pgTable("files", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  project_id: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  folder_id: integer("folder_id")
    .notNull()
    .references(() => folders.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  content: jsonb("content").notNull(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const selectProjectSchema = createSelectSchema(projectsTable)
export const createProjectSchema = createInsertSchema(projectsTable).omit({
  created_at: true,
})
export const updateProjectSchema = createUpdateSchema(projectsTable)

export const selectTodoSchema = createSelectSchema(todosTable)
export const createTodoSchema = createInsertSchema(todosTable).omit({
  created_at: true,
})
export const updateTodoSchema = createUpdateSchema(todosTable)

export const selectFolderSchema = createSelectSchema(folders)
export const createFolderSchema = createInsertSchema(folders).omit({
  created_at: true,
})
export const updateFolderSchema = createUpdateSchema(folders)

export const selectFileSchema = createSelectSchema(files)
export const createFileSchema = createInsertSchema(files).omit({
  created_at: true,
})
export const updateFileSchema = createUpdateSchema(files)

export type Project = z.infer<typeof selectProjectSchema>
export type UpdateProject = z.infer<typeof updateProjectSchema>
export type Todo = z.infer<typeof selectTodoSchema>
export type UpdateTodo = z.infer<typeof updateTodoSchema>
export type Folder = z.infer<typeof selectFolderSchema>
export type UpdateFolder = z.infer<typeof updateFolderSchema>
export type File = z.infer<typeof selectFileSchema>
export type UpdateFile = z.infer<typeof updateFileSchema>

export const selectUsersSchema = createSelectSchema(users)
