# Task Completion Checklist

## Before Marking Task Complete
1. **Type Check**: Run TypeScript compiler check (tsc --noEmit if available)
2. **Build Verification**: Ensure `npm run build` completes without errors
3. **Code Review**: Review changes for consistency with project patterns
4. **Database Migrations**: If schema changed, run `npm run db:generate` and `npm run db:migrate`

## After Code Changes
1. **Environment Variables**: Verify .env file has all required variables
2. **Dependencies**: If new packages added, ensure they're in package.json
3. **Documentation**: Update CLAUDE.md if architectural changes made
4. **Testing**: Manual testing in dev mode with `npm run dev`

## Quality Standards
- No linting errors (if linter configured)
- All TypeScript types properly defined
- Zod schemas for API validation
- Error handling in place
- Authentication checks on protected routes

## Notes
- No automated test suite currently configured
- Manual testing required for all changes
- Check browser console and server logs for errors