# Development Commands

## Essential Commands
```bash
# Development (hot reload with tsx + Vite HMR)
npm run dev

# Production build
npm run build

# Production start (no HMR)
npm start
```

## Database Commands
```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations to database
npm run db:migrate

# Push schema directly (skip migration files)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

## Windows System Commands
```bash
# List files
dir

# Change directory
cd <path>

# Find files
where <filename>

# Search in files (using npm grep if available)
findstr /s /i "pattern" *.ts

# Git commands (same as Unix)
git status
git add .
git commit -m "message"
git push
```