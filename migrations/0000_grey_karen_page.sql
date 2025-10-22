CREATE TABLE IF NOT EXISTS "annual_goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"year" integer NOT NULL,
	"core_value" text,
	"completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_reflections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"date" date NOT NULL,
	"content" text,
	"reflection" text,
	"image_urls" text[],
	"image_names" text[],
	"files" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"project_id" integer,
	"title" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date,
	"start_time" text,
	"end_time" text,
	"priority" text NOT NULL,
	"color" text DEFAULT '#64748B',
	"is_all_day" boolean DEFAULT false,
	"repeat_type" text,
	"repeat_interval" integer DEFAULT 1,
	"repeat_end_date" date,
	"repeat_weekdays" text,
	"core_value" text,
	"annual_goal" text,
	"completed" boolean DEFAULT false,
	"result" text,
	"image_urls" text[],
	"file_urls" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "foundations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"personal_mission" text,
	"core_value_1" text,
	"core_value_2" text,
	"core_value_3" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"date" date NOT NULL,
	"completed" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"exclude_weekends" boolean DEFAULT false,
	"exclude_holidays" boolean DEFAULT false,
	"core_value" text,
	"annual_goal" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "monthly_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"work_hours" integer DEFAULT 0,
	"personal_hours" integer DEFAULT 0,
	"reflection" text,
	"value_alignment_1" integer DEFAULT 0,
	"value_alignment_2" integer DEFAULT 0,
	"value_alignment_3" integer DEFAULT 0,
	"image_urls" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"original_file_name" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"object_path" text NOT NULL,
	"description" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"color" text DEFAULT '#64748B',
	"priority" text NOT NULL,
	"start_date" date,
	"end_date" date,
	"core_value" text,
	"annual_goal" text,
	"image_urls" text[],
	"file_urls" jsonb DEFAULT '[]'::jsonb,
	"result" text,
	"result_image_urls" text[],
	"result_file_urls" jsonb DEFAULT '[]'::jsonb,
	"completed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"project_id" integer,
	"title" text NOT NULL,
	"priority" text NOT NULL,
	"completed" boolean DEFAULT false,
	"scheduled_date" date,
	"start_date" date,
	"end_date" date,
	"completed_at" timestamp,
	"time_estimate" integer,
	"notes" text,
	"result" text,
	"core_value" text,
	"annual_goal" text,
	"image_urls" text[],
	"file_urls" jsonb DEFAULT '[]'::jsonb,
	"result_image_urls" text[],
	"result_file_urls" jsonb DEFAULT '[]'::jsonb,
	"is_carried_over" boolean DEFAULT false,
	"original_scheduled_date" date,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "time_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"project_id" integer,
	"task_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"custom_activities" text[] DEFAULT '{}',
	"default_activities" text[] DEFAULT '{"회의","업무","휴식","학습","운동","식사","이동","개인시간"}',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"password" varchar,
	"auth_type" varchar DEFAULT 'replit',
	"role" varchar DEFAULT 'user',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "weekly_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"week_start_date" date NOT NULL,
	"work_hours" integer DEFAULT 0,
	"personal_hours" integer DEFAULT 0,
	"reflection" text,
	"value_alignment_1" integer DEFAULT 0,
	"value_alignment_2" integer DEFAULT 0,
	"value_alignment_3" integer DEFAULT 0,
	"image_urls" text[],
	"file_urls" text[],
	"file_names" text[],
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");