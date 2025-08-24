# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Primary Development:**

- `pnpm run dev` - Start development server with Docker services (Postgres + Electric)
- `pnpm run migrate` - Run database migrations (required after starting dev)
- `pnpm run build` - Build for production (includes migrations)
- `pnpm run start` - Start production server

**Database Management:**

- `pnpm run generate` - Generate new migration files with drizzle-kit
- `pnpm run migrate` - Apply pending migrations

**Code Quality:**

- `pnpm run lint` - Run ESLint with auto-fix (run after editing files)
- `pnpm run lint:check` - Check linting without fixes
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check formatting without changes

**Testing:**

- `pnpm run test` - Run all tests (currently placeholder)

## Architecture Overview

This is a TanStack Start application with local-first architecture using Electric SQL for real-time sync.

**Core Stack:**

- **Frontend**: TanStack Start (React SSR framework) with file-based routing
- **Database**: PostgreSQL with Drizzle ORM, Electric SQL sync engine
- **State Management**: TanStack DB collections with Electric sync
- **API**: tRPC v10 for mutations, Electric shapes for reads
- **Authentication**: better-auth
- **Styling**: Tailwind CSS v4

**Data Flow Pattern:**

- **Reads**: Electric sync → TanStack DB collections → React components
- **Writes**: React → TanStack DB optimistic updates → tRPC mutations → PostgreSQL → Electric sync

## Key File Structure

```
src/
├── db/
│   ├── schema.ts           # Drizzle schema + Zod validation
│   ├── connection.ts       # Database connection
│   └── out/               # Generated migrations
├── lib/
│   ├── collections.ts      # TanStack DB + Electric collections
│   ├── trpc-client.ts     # tRPC client configuration
│   ├── auth.ts            # Authentication setup
│   └── trpc/              # tRPC route handlers
├── routes/
│   ├── __root.tsx         # Root layout
│   ├── _authenticated/    # Protected routes
│   └── api/               # API endpoints
├── services/              # Service to handle all crud and type definitions for data flowing into UI components.
```

## Development Environment

**Prerequisites:**

- Docker (for Postgres + Electric services)
- Caddy server installed and `caddy trust` executed for local HTTPS
- `.env` file copied from `.env.example`

**Local URLs:**

- Application: `https://tanstack-start-db-electric-starter.localhost/`
- Electric sync: `http://localhost:3000`
- Postgres: `localhost:54321`

## Code Conventions

**Naming:**

- File names: kebab-case
- Import paths: Use `@/*` aliases for `src/` directory

**TypeScript:**

- Strict mode enabled
- Use Drizzle schema for server types
- Use Zod schemas for validation

**Database:**

- Schema-first approach with Drizzle
- Migrations in `src/db/out/`
- Transaction IDs: `pg_current_xact_id()::xid::text` for Electric compatibility

**Collections:**

- Define in `src/lib/collections.ts`
- Use Electric shapes for reads
- tRPC mutations with txid return for sync
- Do not call collections directly, use the service layer

**Components:**

- React 19 functional components
- Use TanStack Router `Link` component for navigation
- Live queries with `useLiveQuery` for reactive data

## Important Notes

- Always run `pnpm run lint` and npx tsc --noEmit after editing files
- Database migrations run automatically during build
- Electric sync requires specific transaction ID format for mutations
- Authentication routes are handled by better-auth at `/api/auth/*`

## Typescript Rules

- Use kebab-case for all file names
- prefer function over const for functions
- use Array<T> instead of T[] for Arrays
- use idiomatic React
- Always look for components we already have and reuse them
- Only one component per file
  -Use Zod for validation
  -Use camelCase for schemas and add Schema suffix to all

## CRUD Development workflow

- All CRUD flows through the service layer
- On the client use the input types in src/services/types.ts and call helpers like createProject, updateFolder, and deleteFile; pass session.user.id as ownerId and note created_at is optional.
  The database and routers now use UUID PK/FKs, so ensure all routes/links and TRPC calls pass ids as strings, and use assignDefined for partial updates.
