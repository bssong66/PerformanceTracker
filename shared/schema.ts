import { pgTable, text, serial, integer, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const foundations = pgTable("foundations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  personalMission: text("personal_mission"),
  coreValue1: text("core_value_1"),
  coreValue2: text("core_value_2"),
  coreValue3: text("core_value_3"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const annualGoals = pgTable("annual_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  year: integer("year").notNull(),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  priority: text("priority").notNull(), // 'A', 'B', 'C'
  completed: boolean("completed").default(false),
  scheduledDate: date("scheduled_date"),
  completedAt: timestamp("completed_at"),
  timeEstimate: integer("time_estimate"), // in minutes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const habits = pgTable("habits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const habitLogs = pgTable("habit_logs", {
  id: serial("id").primaryKey(),
  habitId: integer("habit_id").notNull(),
  date: date("date").notNull(),
  completed: boolean("completed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const weeklyReviews = pgTable("weekly_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekStartDate: date("week_start_date").notNull(),
  weeklyGoal1: text("weekly_goal_1"),
  weeklyGoal2: text("weekly_goal_2"),
  weeklyGoal3: text("weekly_goal_3"),
  workHours: integer("work_hours").default(0),
  personalHours: integer("personal_hours").default(0),
  reflection: text("reflection"),
  valueAlignment1: integer("value_alignment_1").default(0), // 0-100
  valueAlignment2: integer("value_alignment_2").default(0), // 0-100
  valueAlignment3: integer("value_alignment_3").default(0), // 0-100
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyReflections = pgTable("daily_reflections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),
  reflection: text("reflection"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const timeBlocks = pgTable("time_blocks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: date("date").notNull(),
  startTime: text("start_time").notNull(), // e.g., "08:00"
  endTime: text("end_time").notNull(), // e.g., "10:00"
  type: text("type").notNull(), // 'focus', 'meeting', 'break'
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertFoundationSchema = createInsertSchema(foundations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnnualGoalSchema = createInsertSchema(annualGoals).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
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

export const insertDailyReflectionSchema = createInsertSchema(dailyReflections).omit({
  id: true,
  createdAt: true,
});

export const insertTimeBlockSchema = createInsertSchema(timeBlocks).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Foundation = typeof foundations.$inferSelect;
export type InsertFoundation = z.infer<typeof insertFoundationSchema>;

export type AnnualGoal = typeof annualGoals.$inferSelect;
export type InsertAnnualGoal = z.infer<typeof insertAnnualGoalSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Habit = typeof habits.$inferSelect;
export type InsertHabit = z.infer<typeof insertHabitSchema>;

export type HabitLog = typeof habitLogs.$inferSelect;
export type InsertHabitLog = z.infer<typeof insertHabitLogSchema>;

export type WeeklyReview = typeof weeklyReviews.$inferSelect;
export type InsertWeeklyReview = z.infer<typeof insertWeeklyReviewSchema>;

export type DailyReflection = typeof dailyReflections.$inferSelect;
export type InsertDailyReflection = z.infer<typeof insertDailyReflectionSchema>;

export type TimeBlock = typeof timeBlocks.$inferSelect;
export type InsertTimeBlock = z.infer<typeof insertTimeBlockSchema>;
