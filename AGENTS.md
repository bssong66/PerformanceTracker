# Repository Guidelines

## Project Structure & Module Organization
- `client/` hosts the React UI; `src/components`, `pages`, `hooks`, and `lib` share the `@/` alias.
- `server/` exposes the Express API, session handling, storage helpers, and Vite SSR bridge via `index.ts`, `routes.ts`, and storage utilities.
- `shared/schema.ts` defines Drizzle ORM models shared across the server and migrations.
- `config/` centralizes build and database settings (`vite.config.ts`, `drizzle.config.ts`, Tailwind config); `migrations/` stores generated SQL.
- `tests/` contains database-backed integrity scripts; `uploads/` and `attached_assets/` keep local storage fixtures.

## Build, Test, and Development Commands
- `npm install` syncs dependencies; Node 18+ is required by the `engines` field.
- `npm run dev` starts the API with hot reloading through `tsx watch server/index.ts`; the Vite client is proxied via `server/vite.ts`.
- `npm run build` bundles the client with Vite; artifacts land in `client/dist`.
- `npm run start` runs the production server entry.
- `npm run db:generate`, `npm run db:migrate`, `npm run db:push`, and `npm run db:studio` manage Drizzle schemas, migrations, and ad-hoc queries (all use `config/drizzle.config.ts`).

## Coding Style & Naming Conventions
- TypeScript across the codebase; keep 2-space indentation, double quotes, and prefer async/await for asynchronous flows.
- Component files use PascalCase (`Dashboard.tsx`); hooks stay camelCase (`useAuth.ts`); shared utilities live under `client/src/lib`.
- Use Tailwind utility classes for styling; central tokens live in `client/index.css` and `tailwind.config.ts`.
- Import shared code via path aliases (`@/components`, `@/pages`); avoid relative traversals beyond one level.
- Validate inputs and payloads with Zod schemas located next to handlers.

## Testing Guidelines
- Integrity checks are Node scripts under `tests/`; run with `node tests/test-project-integrity.js` after exporting `DATABASE_URL`.
- Mirror the existing `test-<area>-<scope>.js` naming when adding coverage; keep scripts idempotent and prefer read-only queries unless staging data.
- Capture expected console output or assertions before marking a pull request ready for review.
- Prefer synthetic fixtures in Supabase staging branches rather than production data dumps.

## Commit & Pull Request Guidelines
- Follow the existing history: singular, imperative summaries (for example, `Update user profile editing and image upload functionality`), capitalized, with no trailing period.
- Every pull request should summarize intent, list key UI or backend changes, and mention database or storage side effects.
- Reference issue IDs when available and include screenshots or API samples for UI or contract tweaks.
- Confirm migrations were generated or applied and list the test commands executed.

## Environment & Configuration Tips
- Store secrets in `.env` or `env/`; never commit live credentials. Document new keys in `docs/`.
- Local uploads land in `uploads/`; clean sensitive artifacts before opening a pull request.
- Align storage permissions through `server/objectAcl.ts` when updating Google Cloud bucket logic.
