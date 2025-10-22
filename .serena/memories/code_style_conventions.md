# Code Style and Conventions

## Naming Conventions
- **Files**: camelCase for TypeScript/JavaScript files
- **Components**: PascalCase for React components
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE for true constants
- **Interfaces**: PascalCase, prefixed with 'I' for interfaces (e.g., IStorage)

## Path Aliases
- `@/*` → `client/src/*` (frontend imports)
- `@shared/*` → `shared/*` (shared schema/types)
- `@assets/*` → `attached_assets/*`

## TypeScript
- Strict type checking enabled
- Use type annotations for function parameters and return types
- Prefer interfaces over types for object shapes
- Use Zod schemas for runtime validation

## Code Organization
- Frontend: Feature-based organization in `client/src/`
- Backend: API routes in `server/routes.ts`, business logic in `server/storage.ts`
- Shared code: Database schemas and validators in `shared/schema.ts`

## Database Patterns
- All DB operations through `IStorage` interface in `server/storage.ts`
- Drizzle ORM for type-safe queries
- Migrations stored in `migrations/` directory
- Single source of truth: `shared/schema.ts`