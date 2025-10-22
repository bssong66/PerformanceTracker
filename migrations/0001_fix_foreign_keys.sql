-- Drop the foreign key constraint that references user_profiles
ALTER TABLE "foundations" DROP CONSTRAINT IF EXISTS "foundations_user_id_fkey";

-- Drop the foreign key constraint on annual_goals if it exists
ALTER TABLE "annual_goals" DROP CONSTRAINT IF EXISTS "annual_goals_user_id_fkey";

-- Drop the foreign key constraint on other tables if they exist
ALTER TABLE "projects" DROP CONSTRAINT IF EXISTS "projects_user_id_fkey";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_user_id_fkey";
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_user_id_fkey";
ALTER TABLE "habits" DROP CONSTRAINT IF EXISTS "habits_user_id_fkey";
ALTER TABLE "habit_logs" DROP CONSTRAINT IF EXISTS "habit_logs_user_id_fkey";
ALTER TABLE "weekly_reviews" DROP CONSTRAINT IF EXISTS "weekly_reviews_user_id_fkey";
ALTER TABLE "monthly_reviews" DROP CONSTRAINT IF EXISTS "monthly_reviews_user_id_fkey";
ALTER TABLE "daily_reflections" DROP CONSTRAINT IF EXISTS "daily_reflections_user_id_fkey";
ALTER TABLE "time_blocks" DROP CONSTRAINT IF EXISTS "time_blocks_user_id_fkey";
ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "user_settings_user_id_fkey";

-- Add foreign key constraints that reference the correct users table
ALTER TABLE "foundations" ADD CONSTRAINT "foundations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "annual_goals" ADD CONSTRAINT "annual_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "habits" ADD CONSTRAINT "habits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "habit_logs" ADD CONSTRAINT "habit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "weekly_reviews" ADD CONSTRAINT "weekly_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "monthly_reviews" ADD CONSTRAINT "monthly_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "daily_reflections" ADD CONSTRAINT "daily_reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "time_blocks" ADD CONSTRAINT "time_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
