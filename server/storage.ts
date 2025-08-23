import { 
  users, foundations, annualGoals, projects, tasks, events, habits, habitLogs, 
  weeklyReviews, monthlyReviews, dailyReflections, timeBlocks, userSettings, projectFiles,
  type User, type UpsertUser, type Foundation, type InsertFoundation,
  type AnnualGoal, type InsertAnnualGoal, type Project, type InsertProject,
  type Task, type InsertTask, type Event, type InsertEvent,
  type Habit, type InsertHabit, type HabitLog, type InsertHabitLog,
  type WeeklyReview, type InsertWeeklyReview, type MonthlyReview,
  type InsertMonthlyReview, type DailyReflection, type InsertDailyReflection, 
  type TimeBlock, type InsertTimeBlock, type UserSettings, type InsertUserSettings,
  type ProjectFile, type InsertProjectFile
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or } from "drizzle-orm";

export interface IStorage {
  // User methods - (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createLocalUser(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    authType: string;
  }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Foundation methods
  getFoundation(userId: string, year?: number): Promise<Foundation | undefined>;
  getAllFoundations(userId: string): Promise<Foundation[]>;
  upsertFoundation(foundation: InsertFoundation): Promise<Foundation>;
  
  // Annual goals methods
  getAnnualGoals(userId: string, year?: number): Promise<AnnualGoal[]>;
  createAnnualGoal(goal: InsertAnnualGoal): Promise<AnnualGoal>;
  updateAnnualGoal(id: number, updates: Partial<AnnualGoal>): Promise<AnnualGoal | undefined>;
  deleteAnnualGoal(id: number): Promise<boolean>;
  
  // Project methods
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  updateProjectCompletion(projectId: number): Promise<void>;
  
  // Task methods
  getTasks(userId: string, date?: string, projectId?: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByProject(projectId: number): Promise<Task[]>;
  getTasksByPriority(userId: string, priority: string, date?: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Event methods
  getEvents(userId: string, startDate?: string, endDate?: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Habit methods
  getHabits(userId: string): Promise<Habit[]>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(id: number, updates: Partial<Habit>): Promise<Habit | undefined>;
  deleteHabit(id: number): Promise<boolean>;
  
  // Habit log methods
  getHabitLogs(habitId: number, startDate?: string, endDate?: string): Promise<HabitLog[]>;
  getHabitLogsForDate(userId: string, date: string): Promise<HabitLog[]>;
  createHabitLog(log: InsertHabitLog): Promise<HabitLog>;
  updateHabitLog(id: number, updates: Partial<HabitLog>): Promise<HabitLog | undefined>;
  deleteHabitLog(habitId: number, userId: string, date: string): Promise<boolean>;
  
  // Weekly review methods
  getWeeklyReviews(userId: string): Promise<WeeklyReview[]>;
  getWeeklyReview(userId: string, weekStartDate: string): Promise<WeeklyReview | undefined>;
  upsertWeeklyReview(review: InsertWeeklyReview): Promise<WeeklyReview>;
  
  // Monthly review methods
  getMonthlyReviews(userId: string): Promise<MonthlyReview[]>;
  getMonthlyReview(userId: string, year: number, month: number): Promise<MonthlyReview | undefined>;
  upsertMonthlyReview(review: InsertMonthlyReview): Promise<MonthlyReview>;
  
  // Daily reflection methods
  getDailyReflection(userId: string, date: string): Promise<DailyReflection | undefined>;
  upsertDailyReflection(reflection: InsertDailyReflection): Promise<DailyReflection>;
  
  // Time block methods
  getTimeBlocks(userId: string, date: string): Promise<TimeBlock[]>;
  createTimeBlock(block: InsertTimeBlock): Promise<TimeBlock>;
  updateTimeBlock(id: number, updates: Partial<TimeBlock>): Promise<TimeBlock | undefined>;
  deleteTimeBlock(id: number): Promise<boolean>;
  
  // User settings methods
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  
  // Task carryover methods
  carryOverIncompleteTasks(userId: string, fromDate: string, toDate: string): Promise<Task[]>;
  getCarriedOverTasks(userId: string, date: string): Promise<Task[]>;
  
  // Project file methods
  getProjectFiles(projectId: number): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  deleteProjectFile(id: number): Promise<boolean>;
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User methods - (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: userData.password || null,
        authType: userData.authType || 'replit'
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          password: userData.password || null,
          authType: userData.authType || 'replit',
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createLocalUser(userData: {
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    authType: string;
    profileImageUrl?: string | null;
  }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: userData.email,
      password: userData.password || null,
      firstName: userData.firstName,
      lastName: userData.lastName,
      authType: userData.authType,
      profileImageUrl: userData.profileImageUrl || null,
    }).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Foundation methods
  async getFoundation(userId: string, year?: number): Promise<Foundation | undefined> {
    const currentYear = year || new Date().getFullYear();
    const result = await db
      .select()
      .from(foundations)
      .where(and(eq(foundations.userId, userId), eq(foundations.year, currentYear)))
      .orderBy(desc(foundations.updatedAt))
      .limit(1);
    return result[0];
  }

  async getAllFoundations(userId: string): Promise<Foundation[]> {
    return await db.select().from(foundations).where(eq(foundations.userId, userId));
  }

  async upsertFoundation(foundation: InsertFoundation): Promise<Foundation> {
    const existing = await this.getFoundation(foundation.userId, foundation.year);
    
    if (existing) {
      const result = await db
        .update(foundations)
        .set({ ...foundation, updatedAt: new Date() })
        .where(eq(foundations.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(foundations).values(foundation).returning();
      return result[0];
    }
  }

  // Annual goals methods
  async getAnnualGoals(userId: string, year?: number): Promise<AnnualGoal[]> {
    const currentYear = year || new Date().getFullYear();
    return await db
      .select()
      .from(annualGoals)
      .where(and(eq(annualGoals.userId, userId), eq(annualGoals.year, currentYear)));
  }

  async createAnnualGoal(goal: InsertAnnualGoal): Promise<AnnualGoal> {
    const result = await db.insert(annualGoals).values([goal]).returning();
    return result[0];
  }

  async updateAnnualGoal(id: number, updates: Partial<AnnualGoal>): Promise<AnnualGoal | undefined> {
    const result = await db
      .update(annualGoals)
      .set(updates)
      .where(eq(annualGoals.id, id))
      .returning();
    return result[0];
  }

  async deleteAnnualGoal(id: number): Promise<boolean> {
    const result = await db.delete(annualGoals).where(eq(annualGoals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Project methods
  async getProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values([project as any]).returning();
    return result[0];
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const result = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return result[0];
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateProjectCompletion(projectId: number): Promise<void> {
    // 프로젝트의 모든 할일 가져오기
    const projectTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    // 할일이 없으면 완료되지 않은 상태로 설정
    if (projectTasks.length === 0) {
      await db
        .update(projects)
        .set({ completed: false })
        .where(eq(projects.id, projectId));
      return;
    }

    // 모든 할일이 완료되었는지 확인
    const allCompleted = projectTasks.every(task => task.completed);
    
    // 프로젝트 완료 상태 업데이트
    await db
      .update(projects)
      .set({ completed: allCompleted })
      .where(eq(projects.id, projectId));
  }

  // Task methods
  async getTasks(userId: string, date?: string, projectId?: number): Promise<Task[]> {
    let conditions = [eq(tasks.userId, userId)];
    
    if (date) {
      conditions.push(eq(tasks.scheduledDate, date));
    }
    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }
    
    return await db.select().from(tasks).where(and(...conditions));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async getTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async getTasksByPriority(userId: string, priority: string, date?: string): Promise<Task[]> {
    let conditions = [eq(tasks.userId, userId), eq(tasks.priority, priority)];
    
    if (date) {
      conditions.push(eq(tasks.scheduledDate, date));
    }
    
    return await db.select().from(tasks).where(and(...conditions));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values([task as any]).returning();
    return result[0];
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    // Process updates and remove problematic fields
    const processedUpdates = { ...updates };
    
    // Remove id and createdAt fields that shouldn't be updated
    delete (processedUpdates as any).id;
    delete (processedUpdates as any).createdAt;
    
    if (processedUpdates.completed) {
      processedUpdates.completedAt = new Date();
    }
    
    const result = await db
      .update(tasks)
      .set(processedUpdates)
      .where(eq(tasks.id, id))
      .returning();
    
    // 할일이 프로젝트에 속해있고 완료 상태가 변경된 경우, 프로젝트 완료 상태 업데이트
    const task = result[0];
    if (task && task.projectId && updates.completed !== undefined) {
      await this.updateProjectCompletion(task.projectId);
    }
    
    return task;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Event methods
  async getEvents(userId: string, startDate?: string, endDate?: string): Promise<Event[]> {
    let conditions = [eq(events.userId, userId)];
    
    if (startDate && endDate) {
      conditions.push(
        or(
          and(gte(events.startDate, startDate), lte(events.startDate, endDate)),
          and(gte(events.endDate, startDate), lte(events.endDate, endDate)),
          and(lte(events.startDate, startDate), gte(events.endDate, endDate))
        )!
      );
    }
    
    return await db.select().from(events).where(and(...conditions));
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values([event as any]).returning();
    return result[0];
  }

  async updateEvent(id: number, updates: Partial<Event>): Promise<Event | undefined> {
    const result = await db
      .update(events)
      .set(updates)
      .where(eq(events.id, id))
      .returning();
    return result[0];
  }

  async deleteEvent(id: number): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Habit methods
  async getHabits(userId: string): Promise<Habit[]> {
    return await db.select().from(habits).where(eq(habits.userId, userId));
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const result = await db.insert(habits).values([habit]).returning();
    return result[0];
  }

  async updateHabit(id: number, updates: Partial<Habit>): Promise<Habit | undefined> {
    const result = await db
      .update(habits)
      .set(updates)
      .where(eq(habits.id, id))
      .returning();
    return result[0];
  }

  async deleteHabit(id: number): Promise<boolean> {
    const result = await db.delete(habits).where(eq(habits.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Habit log methods
  async getHabitLogs(habitId: number, startDate?: string, endDate?: string): Promise<HabitLog[]> {
    let conditions = [eq(habitLogs.habitId, habitId)];
    
    if (startDate && endDate) {
      conditions.push(gte(habitLogs.date, startDate));
      conditions.push(lte(habitLogs.date, endDate));
    }
    
    return await db.select().from(habitLogs).where(and(...conditions));
  }

  async getHabitLogsForDate(userId: string, date: string): Promise<HabitLog[]> {
    return await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, userId), eq(habitLogs.date, date)));
  }

  async createHabitLog(log: InsertHabitLog): Promise<HabitLog> {
    const result = await db.insert(habitLogs).values([log]).returning();
    return result[0];
  }

  async updateHabitLog(id: number, updates: Partial<HabitLog>): Promise<HabitLog | undefined> {
    const result = await db
      .update(habitLogs)
      .set(updates)
      .where(eq(habitLogs.id, id))
      .returning();
    return result[0];
  }

  async deleteHabitLog(habitId: number, userId: string, date: string): Promise<boolean> {
    const result = await db
      .delete(habitLogs)
      .where(and(
        eq(habitLogs.habitId, habitId),
        eq(habitLogs.userId, userId),
        eq(habitLogs.date, date)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Weekly review methods
  async getWeeklyReviews(userId: string): Promise<WeeklyReview[]> {
    return await db.select().from(weeklyReviews).where(eq(weeklyReviews.userId, userId));
  }

  async getWeeklyReview(userId: string, weekStartDate: string): Promise<WeeklyReview | undefined> {
    const result = await db
      .select()
      .from(weeklyReviews)
      .where(and(eq(weeklyReviews.userId, userId), eq(weeklyReviews.weekStartDate, weekStartDate)))
      .limit(1);
    return result[0];
  }

  async upsertWeeklyReview(review: InsertWeeklyReview): Promise<WeeklyReview> {
    const existing = await this.getWeeklyReview(review.userId, review.weekStartDate);
    
    if (existing) {
      const result = await db
        .update(weeklyReviews)
        .set(review)
        .where(eq(weeklyReviews.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(weeklyReviews).values([review]).returning();
      return result[0];
    }
  }

  // Monthly review methods
  async getMonthlyReviews(userId: string): Promise<MonthlyReview[]> {
    return await db
      .select()
      .from(monthlyReviews)
      .where(eq(monthlyReviews.userId, userId));
  }

  async getMonthlyReview(userId: string, year: number, month: number): Promise<MonthlyReview | undefined> {
    const result = await db
      .select()
      .from(monthlyReviews)
      .where(and(
        eq(monthlyReviews.userId, userId),
        eq(monthlyReviews.year, year),
        eq(monthlyReviews.month, month)
      ))
      .limit(1);
    return result[0];
  }

  async upsertMonthlyReview(review: InsertMonthlyReview): Promise<MonthlyReview> {
    const existing = await this.getMonthlyReview(review.userId, review.year, review.month);
    
    if (existing) {
      const result = await db
        .update(monthlyReviews)
        .set(review)
        .where(eq(monthlyReviews.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(monthlyReviews).values([review]).returning();
      return result[0];
    }
  }

  // Daily reflection methods
  async getDailyReflection(userId: string, date: string): Promise<DailyReflection | undefined> {
    const result = await db
      .select()
      .from(dailyReflections)
      .where(and(eq(dailyReflections.userId, userId), eq(dailyReflections.date, date)))
      .limit(1);
    return result[0];
  }

  async upsertDailyReflection(reflection: InsertDailyReflection): Promise<DailyReflection> {
    const existing = await this.getDailyReflection(reflection.userId, reflection.date);
    
    if (existing) {
      const result = await db
        .update(dailyReflections)
        .set(reflection)
        .where(eq(dailyReflections.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(dailyReflections).values([reflection]).returning();
      return result[0];
    }
  }

  // Time block methods
  async getTimeBlocks(userId: string, date: string): Promise<TimeBlock[]> {
    return await db
      .select()
      .from(timeBlocks)
      .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.date, date)));
  }

  async createTimeBlock(block: InsertTimeBlock): Promise<TimeBlock> {
    const result = await db.insert(timeBlocks).values([block]).returning();
    return result[0];
  }

  async updateTimeBlock(id: number, updates: Partial<TimeBlock>): Promise<TimeBlock | undefined> {
    const result = await db
      .update(timeBlocks)
      .set(updates)
      .where(eq(timeBlocks.id, id))
      .returning();
    return result[0];
  }

  async deleteTimeBlock(id: number): Promise<boolean> {
    const result = await db.delete(timeBlocks).where(eq(timeBlocks.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // User settings methods
  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    const result = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    return result[0];
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(settings.userId);
    
    if (existing) {
      const result = await db
        .update(userSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userSettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(userSettings).values([settings]).returning();
      return result[0];
    }
  }

  // Task carryover methods
  async carryOverIncompleteTasks(userId: string, fromDate: string, toDate: string): Promise<Task[]> {
    const incompleteTasks = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.scheduledDate, fromDate),
        eq(tasks.completed, false)
      ));

    const carriedOverTasks: Task[] = [];
    
    for (const task of incompleteTasks) {
      const carriedOverTask = {
        ...task,
        scheduledDate: toDate,
        isCarriedOver: true,
        originalScheduledDate: task.originalScheduledDate || task.scheduledDate,
      };
      
      delete (carriedOverTask as any).id; // Remove id to let DB auto-generate
      const result = await db.insert(tasks).values([carriedOverTask]).returning();
      carriedOverTasks.push(result[0]);
    }
    
    return carriedOverTasks;
  }

  async getCarriedOverTasks(userId: string, date: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.scheduledDate, date),
        eq(tasks.isCarriedOver, true)
      ));
  }

  // Project file methods
  async getProjectFiles(projectId: number): Promise<ProjectFile[]> {
    return await db
      .select()
      .from(projectFiles)
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.uploadedAt));
  }

  async createProjectFile(file: InsertProjectFile): Promise<ProjectFile> {
    const result = await db.insert(projectFiles).values(file).returning();
    return result[0];
  }

  async deleteProjectFile(id: number): Promise<boolean> {
    const result = await db.delete(projectFiles).where(eq(projectFiles.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const result = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
    return result[0];
  }
}

export const storage = new DatabaseStorage();