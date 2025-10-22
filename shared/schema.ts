import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  date,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"), // For local authentication
  authType: varchar("auth_type").default("local"), // Authentication type
  role: varchar("role").default("user"), // "user" | "admin"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const foundations = pgTable("foundations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  year: integer("year").notNull(),
  personalMission: text("personal_mission"),
  coreValue1: text("core_value_1"),
  coreValue2: text("core_value_2"),
  coreValue3: text("core_value_3"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const annualGoals = pgTable("annual_goals", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  year: integer("year").notNull(),
  coreValue: text("core_value"), // Connected core value from foundation
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"), // Project plan description
  color: text("color").default("#64748B"), // hex color for calendar display
  priority: text("priority").notNull(), // 'high', 'medium', 'low'
  startDate: date("start_date"),
  endDate: date("end_date"),
  coreValue: text("core_value"), // Connected core value from foundation
  annualGoal: text("annual_goal"), // Connected annual goal
  imageUrls: text("image_urls").array(), // For project plan attachments
  fileUrls: jsonb("file_urls").$type<Array<{url: string, name: string, size: number}>>().default([]), // For project plan file uploads
  result: text("result"), // Project result and reflection
  resultImageUrls: text("result_image_urls").array(), // For project result attachments
  resultFileUrls: jsonb("result_file_urls").$type<Array<{url: string, name: string, size: number}>>().default([]), // For project result file uploads
  completed: boolean("completed").default(false), // 프로젝트 완료 상태
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id"), // nullable - tasks can exist without projects
  title: text("title").notNull(),
  priority: text("priority").notNull(), // 'A', 'B', 'C'
  completed: boolean("completed").default(false),
  scheduledDate: date("scheduled_date"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  completedAt: timestamp("completed_at"),
  timeEstimate: integer("time_estimate"), // in minutes
  notes: text("notes"),
  result: text("result"), // Task result and reflection
  coreValue: text("core_value"), // Connected core value from foundation
  annualGoal: text("annual_goal"), // Connected annual goal
  imageUrls: text("image_urls").array(), // For task planning/content attachments
  fileUrls: jsonb("file_urls").$type<Array<{url: string, name: string, size: number}>>().default([]), // For task planning/content file uploads
  resultImageUrls: text("result_image_urls").array(), // For task result/completion attachments
  resultFileUrls: jsonb("result_file_urls").$type<Array<{url: string, name: string, size: number}>>().default([]), // For task result/completion file uploads
  isCarriedOver: boolean("is_carried_over").default(false), // 이월된 할일인지 표시
  originalScheduledDate: date("original_scheduled_date"), // 원래 예정된 날짜
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  projectId: integer("project_id"), // nullable
  title: text("title").notNull(),
  description: text("description"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  startTime: text("start_time"), // e.g., "14:30"
  endTime: text("end_time"),
  priority: text("priority").notNull(), // 'high', 'medium', 'low'
  color: text("color").default("#64748B"),
  isAllDay: boolean("is_all_day").default(false),
  repeatType: text("repeat_type"), // 'none', 'daily', 'weekly', 'monthly', 'yearly'
  repeatInterval: integer("repeat_interval").default(1), // repeat every N days/weeks/months/years
  repeatEndDate: date("repeat_end_date"), // when to stop repeating
  repeatWeekdays: text("repeat_weekdays"), // JSON array for weekly: ["1","3","5"] (Mon, Wed, Fri)
  coreValue: text("core_value"), // Connected core value from foundation
  annualGoal: text("annual_goal"), // Connected annual goal
  completed: boolean("completed").default(false), // Event completion status
  result: text("result"), // Event result and reflection
  imageUrls: text("image_urls").array(),
  fileUrls: jsonb("file_urls").$type<Array<{url: string, name: string, size: number}>>().default([]), // For general file uploads
  createdAt: timestamp("created_at").defaultNow(),
});

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  excludeWeekends: boolean("exclude_weekends").default(false),
  excludeHolidays: boolean("exclude_holidays").default(false),
  coreValue: text("core_value"), // Connected core value from foundation
  annualGoal: text("annual_goal"), // Connected annual goal
  createdAt: timestamp("created_at").defaultNow(),
});

export const habitLogs = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  completed: boolean("completed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklyReviews = pgTable("weekly_reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  weekStartDate: date("week_start_date").notNull(),
  workHours: integer("work_hours").default(0),
  personalHours: integer("personal_hours").default(0),
  reflection: text("reflection"),
  valueAlignment1: integer("value_alignment_1").default(0), // 0-100
  valueAlignment2: integer("value_alignment_2").default(0), // 0-100
  valueAlignment3: integer("value_alignment_3").default(0), // 0-100
  imageUrls: text("image_urls").array(),
  fileUrls: text("file_urls").array(), // For file download URLs
  fileNames: text("file_names").array(), // For file names
  createdAt: timestamp("created_at").defaultNow(),
});

export const monthlyReviews = pgTable("monthly_reviews", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  workHours: integer("work_hours").default(0),
  personalHours: integer("personal_hours").default(0),
  reflection: text("reflection"),
  valueAlignment1: integer("value_alignment_1").default(0), // 0-100
  valueAlignment2: integer("value_alignment_2").default(0), // 0-100
  valueAlignment3: integer("value_alignment_3").default(0), // 0-100
  imageUrls: text("image_urls").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyReflections = pgTable("daily_reflections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  content: text("content"), // Changed from 'reflection' to 'content'
  reflection: text("reflection"),
  imageUrls: text("image_urls").array(),
  imageNames: text("image_names").array(),
  files: jsonb("files"), // Array of file objects: {name, url, type, size}
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeBlocks = pgTable("time_blocks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(), // e.g., "08:00"
  endTime: text("end_time").notNull(), // e.g., "10:00"
  type: text("type").notNull(), // 'focus', 'meeting', 'break'
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id"), // nullable - linked project
  taskId: integer("task_id"), // nullable - linked task
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  customActivities: text("custom_activities").array().default([]),
  defaultActivities: text("default_activities").array().default([
    "회의", "업무", "휴식", "학습", "운동", "식사", "이동", "개인시간"
  ]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  userId: varchar("user_id").notNull(),
  fileName: text("file_name").notNull(),
  originalFileName: text("original_file_name").notNull(),
  fileSize: integer("file_size").notNull(), // in bytes
  mimeType: text("mime_type").notNull(),
  objectPath: text("object_path").notNull(), // path in object storage
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Type definitions for Replit Auth will be at the end

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertFoundationSchema = createInsertSchema(foundations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnualGoalSchema = createInsertSchema(annualGoals, {
  completed: z.boolean().optional().default(false),
}).omit({
  id: true,
  createdAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertHabitSchema = createInsertSchema(habits).omit({
  id: true,
  createdAt: true,
  currentStreak: true,
  longestStreak: true,
});

export const insertHabitLogSchema = createInsertSchema(habitLogs).omit({
  id: true,
  createdAt: true,
});

export const insertWeeklyReviewSchema = createInsertSchema(weeklyReviews).omit({
  id: true,
  createdAt: true,
});

export const insertMonthlyReviewSchema = createInsertSchema(monthlyReviews).omit({
  id: true,
  createdAt: true,
});

export const insertDailyReflectionSchema = createInsertSchema(dailyReflections).omit({
  id: true,
  createdAt: true,
});

export const insertTimeBlockSchema = createInsertSchema(timeBlocks).omit({
  id: true,
  createdAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({
  id: true,
  uploadedAt: true,
});

// Types
export type User = typeof users.$inferSelect;  
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = z.infer<typeof upsertUserSchema>;

export type Foundation = typeof foundations.$inferSelect;
export type InsertFoundation = z.infer<typeof insertFoundationSchema>;

export type AnnualGoal = typeof annualGoals.$inferSelect;
export type InsertAnnualGoal = z.infer<typeof insertAnnualGoalSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

export type HabitLog = typeof habitLogs.$inferSelect;
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;

export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type InsertWeeklyReview = z.infer<typeof insertWeeklyReviewSchema>;
export type MonthlyReview = typeof monthlyReviews.$inferSelect;
export type InsertMonthlyReview = z.infer<typeof insertMonthlyReviewSchema>;

export type DailyReflection = typeof dailyReflections.$inferSelect;
export type InsertDailyReflection = z.infer<typeof insertDailyReflectionSchema>;

export type TimeBlock = typeof timeBlocks.$inferSelect;
export type InsertTimeBlock = z.infer<typeof insertTimeBlockSchema>;

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;
