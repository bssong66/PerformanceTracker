# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A performance tracking web application for personal goal setting and productivity management. Built with React, TypeScript, Express, PostgreSQL, and Drizzle ORM. Features include foundation setting (personal mission & core values), annual goals, project management, task scheduling, calendar view, and review capabilities.

## Architecture

### Tech Stack
- **Frontend**: React 18, Wouter (routing), TanStack Query, Radix UI components, Tailwind CSS
- **Backend**: Express.js with TypeScript, session-based auth (Passport.js)
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **Storage**: Supabase Storage for file uploads
- **Build**: Vite with HMR in development, static serving in production
- **Runtime**: Node.js >= 18.0.0 (required)

### Project Structure

```
├── client/src/          # React frontend
│   ├── components/      # Reusable UI components
│   ├── pages/          # Route-level page components
│   ├── hooks/          # Custom React hooks (useAuth, etc.)
│   └── lib/            # Client utilities (queryClient, supabase client, authFetch)
├── server/             # Express backend
│   ├── index.ts        # Server entry point & error handling
│   ├── routes.ts       # All API route definitions
│   ├── db.ts          # Drizzle database connection
│   ├── storage.ts     # Database abstraction layer (IStorage interface)
│   ├── supabase.ts    # Supabase admin client
│   ├── supabaseStorage.ts  # File upload handlers
│   └── vite.ts        # Vite dev middleware & static serving
├── shared/            # Shared TypeScript code
│   └── schema.ts      # Drizzle table schemas & Zod validators (single source of truth)
├── config/            # Configuration files
│   ├── drizzle.config.ts  # Drizzle Kit configuration
│   └── vite.config.ts     # Vite build configuration (path aliases defined here)
├── migrations/        # Drizzle database migrations (auto-generated)
└── docs/             # Documentation & setup guides
```

### Key Architectural Patterns

**Path Aliases** (tsconfig.json):
- `@/*` → `client/src/*` (frontend imports)
- `@shared/*` → `shared/*` (shared schemas and types)
- `@assets/*` → `attached_assets/*` (image attachments)

**Database Layer**: `server/storage.ts` exports `IStorage` interface and `DatabaseStorage` class. All database operations must go through the `storage` singleton to abstract Drizzle queries. This enables easy testing and future storage backend swaps.

**Authentication Flow**:
1. Session-based auth using express-session (sessions stored in PostgreSQL)
2. Passport.js with local strategy (email/password)
3. `isAuthenticated` middleware protects all `/api/*` routes
4. User ID available at `req.user.claims.sub` (UUID string)
5. Frontend uses `useAuth()` hook and `authFetch()` helper for authenticated requests

**File Uploads**:
- Files uploaded to Supabase Storage (not local filesystem)
- Multer configured for in-memory upload: `uploadMem.array('fieldName')`
- File path structure: `buildProjectFilePath(userId, projectId, fileName)`
- File metadata and URLs stored in database (see `projectFiles` table)
- Max: 50MB per file, 15 files per upload request

**Build & Serving**:
- Development: Vite dev server with HMR via `server/vite.ts` middleware
- Production: Static files served from `dist/public/` directory
- Single port (default 5000) serves both API and frontend

**Data Model** (simplified):
- `users` → authentication, profile, settings
- `foundations` → personal mission & core values (yearly)
- `annualGoals` → yearly goals tied to core values
- `projects` → multi-step projects with plans, dates, results, file attachments
- `tasks` → individual tasks (standalone or project-related)
- `events` → calendar events
- `habits` → habit tracking
- `habitLogs` → individual habit completion records
- `dailyReflections`, `weeklyReviews`, `monthlyReviews` → reflection/review entries
- `timeBlocks` → time block scheduling
- `projectFiles` → file metadata and Supabase Storage URLs

## Development Commands

### Essential Commands
```bash
# Development (hot reload with tsx + Vite HMR)
npm run dev

# Production build (outputs to dist/public/)
npm run build

# Production start (serves static files, no HMR)
npm start
```

### Database Commands
```bash
# Generate migration from schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Push schema directly to database (skips migration files, dev only)
npm run db:push

# Open Drizzle Studio GUI for database exploration
npm run db:studio
```

### Type Checking & Linting
```bash
# Check TypeScript errors (no build output)
npx tsc --noEmit

# Run both type check and linter if available
npm run type-check  # if script exists
```

### Quick Debugging
```bash
# View database schema in GUI (best for exploration)
npm run db:studio

# Monitor API requests in terminal (visible during npm run dev)
# Look for: GET/POST /api/* [status] in [duration]ms

# View client-side errors
# Use browser DevTools Console (F12)
```

## Common Development Workflows

### Adding New Database Table
1. Add table schema to `shared/schema.ts` using Drizzle `pgTable()`
2. Export `insertSchema` using `createInsertSchema()` from drizzle-zod
3. Run `npm run db:generate` to create migration file
4. Review migration in `migrations/` directory
5. Run `npm run db:migrate` to apply to database
6. Add methods to `IStorage` interface in `server/storage.ts`
7. Implement methods in `DatabaseStorage` class in `server/storage.ts`
8. Add API routes in `server/routes.ts` (with `isAuthenticated` middleware)

### Adding New API Route
1. Add route handler in `server/routes.ts` inside `registerRoutes()` function
2. Apply `isAuthenticated` middleware for protected routes
3. Access user ID via `req.user.claims.sub` (UUID string)
4. Use `storage.*` methods for database operations
5. Validate request body with Zod schemas from `@shared/schema`
6. Return JSON response with appropriate status codes

### Adding New React Page
1. Create component in `client/src/pages/` (e.g., `MyPage.tsx`)
2. Add route in `client/src/App.tsx` under authenticated `<Layout>` wrapper
3. Use `useAuth()` hook to access authentication state and redirect logic
4. Use TanStack Query (`useQuery`, `useMutation`) for API calls
5. Use `authFetch()` helper (from `client/src/lib/authFetch.ts`) for authenticated requests
6. Import UI components from `@/components/ui/` (Radix UI wrapped with Tailwind)

### File Upload Implementation
1. Create form with `<input type="file" />` or use drag-and-drop
2. In API handler: use `uploadMem.array('fieldName')` middleware
3. Access files via `req.files` (Express Multer)
4. Upload each file to Supabase: `await uploadFileToSupabase(file.buffer, buildProjectFilePath(userId, projectId, file.originalname))`
5. Store returned URL in database via `storage.createProjectFile()`
6. Return URLs to frontend for display

### Modifying Authentication Flow
1. **Session-based auth stored in PostgreSQL** - Passport serializes user ID to sessions table
2. To add OAuth provider: implement new Passport strategy in `server/routes.ts`
3. Modify `createLocalUser()` to support new `authType` field values
4. Never delete the `sessions` table (required for Passport)

## Important Implementation Details

**Environment Variables**:
- Required: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SESSION_SECRET`
- Optional: `PORT` (default 5000)
- App crashes intentionally if `DATABASE_URL` is missing (fail-fast principle)
- See `.env.example` and [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) for details

**Supabase Connection Pooling**:
- Always use **Connection Pooling** mode (port 6543) in `DATABASE_URL`
- Use **Transaction mode** (not Session mode) for Drizzle ORM compatibility
- See [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) Section 2.1 for connection string format

**Session Management**:
- Sessions table is mandatory (created by schema)
- Never drop the `sessions` table
- Session data expires per express-session configuration
- User context persists across requests via session

**User Context**:
- All authenticated requests have `req.user.claims.sub` containing user ID (UUID string)
- User ID comes from `users` table primary key
- Access user info: `await storage.getUser(req.user.claims.sub)`

**File Size Limits**:
- Multer: 50MB max per file, 15 files max per upload request
- Express body parser: 50MB limit for JSON/URL-encoded requests
- Supabase Storage: check bucket size limits

**Vite Integration**:
- Development: Vite middleware in `server/vite.ts` handles HMR and SSR
- Production: Static files only (no server-side rendering)
- Build output: `dist/public/` (configured in `config/vite.config.ts`)
- Path aliases: Must match in both `tsconfig.json` and `config/vite.config.ts`

**Error Handling**:
- Global error handler in `server/index.ts` catches all errors
- Returns JSON with status and message
- API request logging middleware tracks `/api/*` requests with duration
- Errors thrown in routes are caught by error handler (don't manually respond)

**Database Schema**:
- Single source of truth: `shared/schema.ts`
- Auto-generated migrations in `migrations/` directory
- Drizzle config: `config/drizzle.config.ts`
- Never manually edit migrations (regenerate with `npm run db:generate`)

**Windows Platform Note**:
- Developed on Windows (win32) - file paths use backslashes internally
- Path aliases and imports should use forward slashes (TypeScript/Node handles this)
- When building paths for Supabase Storage, use forward slashes: `buildProjectFilePath(userId, projectId, fileName)`
