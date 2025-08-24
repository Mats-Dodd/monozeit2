## Client-generated IDs Migration (UUID) — Full, breaking change

### Goal

- Move `projects`, `folders`, and `files` to use client-generated string IDs (UUID v4) end-to-end to avoid sync conflicts with Electric/TanStack DB.
- Remove numeric ID assumptions throughout the app. No backward compatibility with old numeric IDs.

### Summary of changes

- Switch DB primary keys and foreign keys from `integer` to `uuid`.
- Update Drizzle schema/types and Zod schemas accordingly.
- Update TRPC inputs to `z.string().uuid()` for all ID fields.
- Update client: generate IDs with `crypto.randomUUID()` and pass them through to TRPC on create.
- Remove all numeric casts/`parseInt` and numeric state types; use strings everywhere for IDs.

---

## 1) Database model changes (Drizzle + Postgres)

We will replace integer PKs/FKs with UUIDs. As a full migration, we will break existing DB state. If you need to preserve data, add a one-off export/import step.

- Enable UUID generation on the DB if needed (for server defaults):
  - Preferred: `pgcrypto` → `gen_random_uuid()`
  - Alternative: `uuid-ossp` → `uuid_generate_v4()`

- In `src/db/schema.ts`:
  - Import `uuid` from `drizzle-orm/pg-core`.
  - Change `projectsTable.id`, `foldersTable.id`, `filesTable.id` from `integer().primaryKey().generatedAlwaysAsIdentity()` to `uuid("id").primaryKey()`.
    - Optional server default: `.defaultRandom()` (Drizzle) or `.default(sql`gen_random_uuid()`) if you want DB-side default as a fallback. The client will still supply IDs explicitly.
  - Change FKs to UUID:
    - `foldersTable.project_id` → `uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" })`
    - `foldersTable.parent_id` → `uuid("parent_id").references((): AnyPgColumn => foldersTable.id, { onDelete: "cascade" })`
    - `filesTable.project_id` → `uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" })`
    - `filesTable.folder_id` → `uuid("folder_id").notNull().references(() => foldersTable.id, { onDelete: "cascade" })`
  - Keep `owner_id` and `shared_user_ids` as-is.

- Generate and run the migration:
  - `pnpm run generate`
  - `pnpm run migrate`

---

## 2) Types and Zod schemas

In `src/db/schema.ts`, after changing the columns:

- The generated `createInsertSchema`, `createSelectSchema`, `createUpdateSchema` will reflect `id: string` and FK fields as strings.
- Ensure `create*Schema` still `.omit({ created_at: true })` as before.

---

## 3) TRPC routers (IDs → string UUID)

Files to update:

- `src/lib/trpc/projects.ts`
- `src/lib/trpc/folders.ts`
- `src/lib/trpc/files.ts`

Changes:

- Update all `z.object({ id: z.number() })` to `z.object({ id: z.string().uuid() })`.
- Update any create input schemas to accept the client-provided `id: z.string().uuid()` (the Drizzle-created insert schema will already reflect string IDs; ensure it doesn’t `.omit({ id: true })`).
- Where we `eq(table.id, input.id)` etc., the types will now be string; no logic changes needed beyond types.
- `generateTxId` is unchanged.

---

## 4) TanStack DB collections and Electric shapes

File: `src/lib/collections.ts`

- For each collection `onInsert`, include the client-generated `id` in the mutation to TRPC:
  - Projects create: add `id: newProject.id`.
  - Folders create: add `id: newFolder.id`.
  - Files create: add `id: newFile.id`.
- `getKey: (item) => item.id` remains; `id` is now a string.
- Electric shapes and parsers do not need changes; IDs flow as strings through the shape endpoints. `timestamptz` parsers remain as-is.

---

## 5) UI and route changes (IDs as strings)

Files to update:

- `src/routes/_authenticated.tsx`
  - Replace `id: Math.floor(Math.random() * 100000)` with `id: crypto.randomUUID()` wherever inserting projects.

- `src/routes/_authenticated/project/$projectId.tsx`
  - Remove all `parseInt(projectId, 10)`; compare as strings directly in queries and filters.
  - State types: change from `number` to `string` where IDs are stored.
    - `selectedFolderId: string | null`
    - `editingFileId: string | null`
  - Insertions:
    - `id: crypto.randomUUID()` for folders/files.
    - `project_id: projectId` (string).
  - Deletions/updates: function parameters should accept `string` IDs.
  - Update any `.filter((f) => f.folder_id === selectedFolderId)` to handle string IDs (no change if types are updated).

Search-and-replace guidance:

- Find usages of `parseInt(` and `Number(` tied to IDs and replace with string comparisons.
- Find numeric state types for IDs and change to `string`.
- Find all `Math.floor(Math.random()*...)` used for IDs and replace with `crypto.randomUUID()`.

---

## 6) API shape routes (no changes required)

Files: `src/routes/api/projects.ts`, `src/routes/api/folders.ts`, `src/routes/api/files.ts`

- These forward Electric protocol queries; they don’t parse IDs from URLs, so no changes are required.

---

## 7) Build, lint, and verification

Steps:

- `pnpm run generate`
- `pnpm run migrate`
- `pnpm run build`
- `pnpm run dev`

Manual verification:

- Login with a user, ensure Electric sync connects.
- Create a project. Inspect payload to TRPC: should include `id` as a UUID string.
- Open project page, create folders/files; verify they carry UUID IDs end-to-end.
- Update and delete folders/files; ensure TRPC and sync reflect changes.

---

## 8) Post-migration cleanup

- Ensure there are no leftover numeric ID casts (`parseInt`, `Number`) in the codebase.
- Confirm all `z.number()` usages for IDs are removed in TRPC and UI schemas.
- Optionally centralize ID generation via a tiny helper if desired:
  - `export const generateId = () => crypto.randomUUID()`

---

## 9) Risks and notes

- UUIDs increase payload size marginally; acceptable for typical usage.
- If the DB enforces server-generated defaults for IDs, ensure the schema allows explicit `id` to be inserted (Drizzle + Postgres do by default with `uuid`).
- If you rely on numeric ordering of IDs anywhere, replace with a timestamp column (`created_at`) for sorting.

---

## 10) Checklist (execution order)

1. Update `src/db/schema.ts` to UUID IDs/FKs.
2. Generate/run migrations.
3. Update TRPC routers to `z.string().uuid()` for IDs; include `id` on creates.
4. Update `src/lib/collections.ts` to pass `id` on creates.
5. Update UI/routes to string IDs and `crypto.randomUUID()`.
6. Remove numeric casts and numeric ID state types.
7. Build and verify end-to-end.
8. Sweep for lingering numeric assumptions and fix.
