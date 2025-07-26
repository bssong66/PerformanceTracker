import { 
  users, foundations, annualGoals, projects, tasks, events, habits, habitLogs, 
  weeklyReviews, monthlyReviews, dailyReflections, timeBlocks, userSettings,
  type User, type InsertUser, type Foundation, type InsertFoundation,
  type AnnualGoal, type InsertAnnualGoal, type Project, type InsertProject,
  type Task, type InsertTask, type Event, type InsertEvent,
  type Habit, type InsertHabit, type HabitLog, type InsertHabitLog,
  type WeeklyReview, type InsertWeeklyReview, type MonthlyReview,
  type InsertMonthlyReview, type DailyReflection, type InsertDailyReflection, 
  type TimeBlock, type InsertTimeBlock, type UserSettings, type InsertUserSettings
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Foundation methods
  getFoundation(userId: number, year?: number): Promise<Foundation | undefined>;
  getAllFoundations(userId: number): Promise<Foundation[]>;
  upsertFoundation(foundation: InsertFoundation): Promise<Foundation>;
  
  // Annual goals methods
  getAnnualGoals(userId: number, year?: number): Promise<AnnualGoal[]>;
  createAnnualGoal(goal: InsertAnnualGoal): Promise<AnnualGoal>;
  updateAnnualGoal(id: number, updates: Partial<AnnualGoal>): Promise<AnnualGoal | undefined>;
  deleteAnnualGoal(id: number): Promise<boolean>;
  
  // Project methods
  getProjects(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Task methods
  getTasks(userId: number, date?: string, projectId?: number): Promise<Task[]>;
  getTasksByPriority(userId: number, priority: string, date?: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
  // Event methods
  getEvents(userId: number, startDate?: string, endDate?: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<Event>): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // Habit methods
  getHabits(userId: number): Promise<Habit[]>;
  createHabit(habit: InsertHabit): Promise<Habit>;
  updateHabit(id: number, updates: Partial<Habit>): Promise<Habit | undefined>;
  deleteHabit(id: number): Promise<boolean>;
  
  // Habit log methods
  getHabitLogs(habitId: number, startDate?: string, endDate?: string): Promise<HabitLog[]>;
  getHabitLogsForDate(userId: number, date: string): Promise<HabitLog[]>;
  createHabitLog(log: InsertHabitLog): Promise<HabitLog>;
  updateHabitLog(id: number, updates: Partial<HabitLog>): Promise<HabitLog | undefined>;
  deleteHabitLog(habitId: number, userId: number, date: string): Promise<boolean>;
  
  // Weekly review methods
  getWeeklyReviews(userId: number): Promise<WeeklyReview[]>;
  getWeeklyReview(userId: number, weekStartDate: string): Promise<WeeklyReview | undefined>;
  upsertWeeklyReview(review: InsertWeeklyReview): Promise<WeeklyReview>;
  
  // Monthly review methods
  getMonthlyReviews(userId: number): Promise<MonthlyReview[]>;
  getMonthlyReview(userId: number, year: number, month: number): Promise<MonthlyReview | undefined>;
  upsertMonthlyReview(review: InsertMonthlyReview): Promise<MonthlyReview>;
  
  // Daily reflection methods
  getDailyReflection(userId: number, date: string): Promise<DailyReflection | undefined>;
  upsertDailyReflection(reflection: InsertDailyReflection): Promise<DailyReflection>;
  
  // Time block methods
  getTimeBlocks(userId: number, date: string): Promise<TimeBlock[]>;
  createTimeBlock(block: InsertTimeBlock): Promise<TimeBlock>;
  updateTimeBlock(id: number, updates: Partial<TimeBlock>): Promise<TimeBlock | undefined>;
  deleteTimeBlock(id: number): Promise<boolean>;
  
  // User settings methods
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings>;
  
  // Task carryover methods
  carryOverIncompleteTasks(userId: number, fromDate: string, toDate: string): Promise<Task[]>;
  getCarriedOverTasks(userId: number, date: string): Promise<Task[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private foundations: Map<number, Foundation>;
  private annualGoals: Map<number, AnnualGoal>;
  private projects: Map<number, Project>;
  private tasks: Map<number, Task>;
  private events: Map<number, Event>;
  private habits: Map<number, Habit>;
  private habitLogs: Map<number, HabitLog>;
  private weeklyReviews: Map<number, WeeklyReview>;
  private monthlyReviews: Map<number, MonthlyReview>;
  private dailyReflections: Map<number, DailyReflection>;
  private timeBlocks: Map<number, TimeBlock>;
  private userSettings: Map<number, UserSettings>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.foundations = new Map();
    this.annualGoals = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.events = new Map();
    this.habits = new Map();
    this.habitLogs = new Map();
    this.weeklyReviews = new Map();
    this.monthlyReviews = new Map();
    this.dailyReflections = new Map();
    this.timeBlocks = new Map();
    this.userSettings = new Map();
    this.currentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Foundation methods
  async getFoundation(userId: number, year?: number): Promise<Foundation | undefined> {
    const currentYear = year || new Date().getFullYear();
    return Array.from(this.foundations.values()).find(f => 
      f.userId === userId && f.year === currentYear
    );
  }

  async getAllFoundations(userId: number): Promise<Foundation[]> {
    return Array.from(this.foundations.values()).filter(f => f.userId === userId);
  }

  async upsertFoundation(foundation: InsertFoundation): Promise<Foundation> {
    const existing = await this.getFoundation(foundation.userId);
    if (existing) {
      const updated: Foundation = { 
        ...existing, 
        ...foundation,
        personalMission: foundation.personalMission ?? null,
        coreValue1: foundation.coreValue1 ?? null,
        coreValue2: foundation.coreValue2 ?? null,
        coreValue3: foundation.coreValue3 ?? null,
        updatedAt: new Date()
      };
      this.foundations.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentId++;
      const newFoundation: Foundation = { 
        ...foundation, 
        id,
        personalMission: foundation.personalMission ?? null,
        coreValue1: foundation.coreValue1 ?? null,
        coreValue2: foundation.coreValue2 ?? null,
        coreValue3: foundation.coreValue3 ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.foundations.set(id, newFoundation);
      return newFoundation;
    }
  }

  // Annual goals methods
  async getAnnualGoals(userId: number, year?: number): Promise<AnnualGoal[]> {
    const currentYear = year || new Date().getFullYear();
    return Array.from(this.annualGoals.values())
      .filter(goal => goal.userId === userId && goal.year === currentYear)
      .sort((a, b) => a.id - b.id); // Sort by ID to maintain consistent order
  }

  async createAnnualGoal(goal: InsertAnnualGoal): Promise<AnnualGoal> {
    const id = this.currentId++;
    const newGoal: AnnualGoal = { 
      ...goal, 
      id,
      completed: goal.completed ?? null,
      coreValue: goal.coreValue ?? null,
      createdAt: new Date()
    };
    this.annualGoals.set(id, newGoal);
    return newGoal;
  }

  async updateAnnualGoal(id: number, updates: Partial<AnnualGoal>): Promise<AnnualGoal | undefined> {
    const goal = this.annualGoals.get(id);
    if (!goal) return undefined;
    
    const updated = { ...goal, ...updates };
    this.annualGoals.set(id, updated);
    return updated;
  }

  async deleteAnnualGoal(id: number): Promise<boolean> {
    return this.annualGoals.delete(id);
  }

  // Project methods
  async getProjects(userId: number): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.userId === userId);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.currentId++;
    const newProject: Project = { 
      ...project, 
      id,
      description: project.description ?? null,
      color: project.color ?? "#3B82F6",
      startDate: project.startDate ?? null,
      endDate: project.endDate ?? null,
      coreValue: project.coreValue ?? null,
      annualGoal: project.annualGoal ?? null,
      imageUrls: project.imageUrls ?? null,
      createdAt: new Date()
    };
    this.projects.set(id, newProject);
    return newProject;
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updated = { ...project, ...updates };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Task methods
  async getTasks(userId: number, date?: string, projectId?: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => {
        if (task.userId !== userId) return false;
        if (date && task.scheduledDate !== date) return false;
        if (projectId && task.projectId !== projectId) return false;
        return true;
      });
  }

  async getTasksByPriority(userId: number, priority: string, date?: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => {
        if (task.userId !== userId || task.priority !== priority) return false;
        if (date && task.scheduledDate !== date) return false;
        return true;
      });
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentId++;
    const newTask: Task = { 
      ...task, 
      id,
      projectId: task.projectId ?? null,
      completed: task.completed ?? null,
      scheduledDate: task.scheduledDate ?? null,
      startDate: task.startDate ?? null,
      endDate: task.endDate ?? null,
      timeEstimate: task.timeEstimate ?? null,
      notes: task.notes ?? null,
      coreValue: task.coreValue ?? null,
      annualGoal: task.annualGoal ?? null,
      imageUrls: task.imageUrls ?? null,
      isCarriedOver: task.isCarriedOver ?? false,
      originalScheduledDate: task.originalScheduledDate ?? null,
      completedAt: null,
      createdAt: new Date()
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updated = { 
      ...task, 
      ...updates,
      completedAt: updates.completed ? new Date() : task.completedAt
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: number): Promise<boolean> {
    return this.tasks.delete(id);
  }

  // Event methods
  async getEvents(userId: number, startDate?: string, endDate?: string): Promise<Event[]> {
    return Array.from(this.events.values())
      .filter(event => {
        if (event.userId !== userId) return false;
        if (startDate && event.startDate < startDate) return false;
        if (endDate && event.startDate > endDate) return false;
        return true;
      });
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const id = this.currentId++;
    const newEvent: Event = { 
      ...event, 
      id,
      description: event.description ?? null,
      projectId: event.projectId ?? null,
      endDate: event.endDate ?? null,
      startTime: event.startTime ?? null,
      endTime: event.endTime ?? null,
      color: event.color ?? "#3B82F6",
      isAllDay: event.isAllDay ?? false,
      repeatType: event.repeatType ?? null,
      repeatInterval: event.repeatInterval ?? null,
      repeatEndDate: event.repeatEndDate ?? null,
      repeatWeekdays: event.repeatWeekdays ?? null,
      coreValue: event.coreValue ?? null,
      annualGoal: event.annualGoal ?? null,
      createdAt: new Date()
    };
    this.events.set(id, newEvent);
    return newEvent;
  }

  async updateEvent(id: number, updates: Partial<Event>): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    const updated = { ...event, ...updates };
    this.events.set(id, updated);
    return updated;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // Habit methods
  async getHabits(userId: number): Promise<Habit[]> {
    return Array.from(this.habits.values())
      .filter(habit => habit.userId === userId && habit.isActive !== false);
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const id = this.currentId++;
    const newHabit: Habit = { 
      ...habit, 
      id,
      description: habit.description ?? null,
      isActive: habit.isActive ?? true,
      currentStreak: 0,
      longestStreak: 0,
      coreValue: habit.coreValue ?? null,
      annualGoal: habit.annualGoal ?? null,
      excludeWeekends: habit.excludeWeekends ?? null,
      excludeHolidays: habit.excludeHolidays ?? null,
      createdAt: new Date()
    };
    this.habits.set(id, newHabit);
    return newHabit;
  }

  async updateHabit(id: number, updates: Partial<Habit>): Promise<Habit | undefined> {
    const habit = this.habits.get(id);
    if (!habit) return undefined;
    
    const updated = { ...habit, ...updates };
    this.habits.set(id, updated);
    return updated;
  }

  async deleteHabit(id: number): Promise<boolean> {
    const habit = this.habits.get(id);
    if (!habit) return false;
    
    const updated = { ...habit, isActive: false };
    this.habits.set(id, updated);
    return true;
  }

  // Habit log methods
  async getHabitLogs(habitId: number, startDate?: string, endDate?: string): Promise<HabitLog[]> {
    return Array.from(this.habitLogs.values())
      .filter(log => {
        if (log.habitId !== habitId) return false;
        if (startDate && log.date < startDate) return false;
        if (endDate && log.date > endDate) return false;
        return true;
      });
  }

  async getHabitLogsForDate(userId: number, date: string): Promise<HabitLog[]> {
    const userHabits = await this.getHabits(userId);
    const habitIds = userHabits.map(h => h.id);
    
    return Array.from(this.habitLogs.values())
      .filter(log => habitIds.includes(log.habitId) && log.date === date);
  }

  async createHabitLog(log: InsertHabitLog): Promise<HabitLog> {
    const id = this.currentId++;
    const newLog: HabitLog = { 
      ...log, 
      id,
      completed: log.completed ?? null,
      notes: log.notes ?? null,
      createdAt: new Date()
    };
    this.habitLogs.set(id, newLog);
    return newLog;
  }

  async updateHabitLog(id: number, updates: Partial<HabitLog>): Promise<HabitLog | undefined> {
    const log = this.habitLogs.get(id);
    if (!log) return undefined;
    
    const updated = { ...log, ...updates };
    this.habitLogs.set(id, updated);
    return updated;
  }

  async deleteHabitLog(habitId: number, userId: number, date: string): Promise<boolean> {
    const existingLog = Array.from(this.habitLogs.values())
      .find(log => log.habitId === habitId && log.date === date);
    
    if (existingLog) {
      return this.habitLogs.delete(existingLog.id);
    }
    return false;
  }

  // Weekly review methods
  async getWeeklyReviews(userId: number): Promise<WeeklyReview[]> {
    return Array.from(this.weeklyReviews.values())
      .filter(review => review.userId === userId);
  }

  async getWeeklyReview(userId: number, weekStartDate: string): Promise<WeeklyReview | undefined> {
    return Array.from(this.weeklyReviews.values())
      .find(review => review.userId === userId && review.weekStartDate === weekStartDate);
  }

  async upsertWeeklyReview(review: InsertWeeklyReview): Promise<WeeklyReview> {
    const existing = await this.getWeeklyReview(review.userId, review.weekStartDate);
    if (existing) {
      const updated = { ...existing, ...review };
      this.weeklyReviews.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentId++;
      const newReview: WeeklyReview = { 
        ...review, 
        id,
        workHours: review.workHours ?? null,
        personalHours: review.personalHours ?? null,
        valueAlignment1: review.valueAlignment1 ?? null,
        valueAlignment2: review.valueAlignment2 ?? null,
        valueAlignment3: review.valueAlignment3 ?? null,
        reflection: review.reflection ?? null,
        imageUrls: review.imageUrls ?? null,
        createdAt: new Date()
      };
      this.weeklyReviews.set(id, newReview);
      return newReview;
    }
  }

  // Monthly review methods
  async getMonthlyReviews(userId: number): Promise<MonthlyReview[]> {
    return Array.from(this.monthlyReviews.values())
      .filter(review => review.userId === userId);
  }

  async getMonthlyReview(userId: number, year: number, month: number): Promise<MonthlyReview | undefined> {
    return Array.from(this.monthlyReviews.values())
      .find(review => review.userId === userId && review.year === year && review.month === month);
  }

  async upsertMonthlyReview(review: InsertMonthlyReview): Promise<MonthlyReview> {
    const existing = await this.getMonthlyReview(review.userId, review.year, review.month);
    if (existing) {
      const updated = { ...existing, ...review };
      this.monthlyReviews.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentId++;
      const newReview: MonthlyReview = { 
        ...review, 
        id,
        workHours: review.workHours ?? null,
        personalHours: review.personalHours ?? null,
        valueAlignment1: review.valueAlignment1 ?? null,
        valueAlignment2: review.valueAlignment2 ?? null,
        valueAlignment3: review.valueAlignment3 ?? null,
        reflection: review.reflection ?? null,
        imageUrls: review.imageUrls ?? null,
        createdAt: new Date()
      };
      this.monthlyReviews.set(id, newReview);
      return newReview;
    }
  }

  // Daily reflection methods
  async getDailyReflection(userId: number, date: string): Promise<DailyReflection | undefined> {
    return Array.from(this.dailyReflections.values())
      .find(reflection => reflection.userId === userId && reflection.date === date);
  }

  async upsertDailyReflection(reflection: InsertDailyReflection): Promise<DailyReflection> {
    const existing = await this.getDailyReflection(reflection.userId, reflection.date);
    if (existing) {
      const updated = { ...existing, ...reflection };
      this.dailyReflections.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentId++;
      const newReflection: DailyReflection = { 
        ...reflection, 
        id,
        reflection: reflection.reflection ?? null,
        imageUrls: reflection.imageUrls ?? null,
        imageNames: reflection.imageNames ?? null,
        createdAt: new Date()
      };
      this.dailyReflections.set(id, newReflection);
      return newReflection;
    }
  }

  // Time block methods
  async getTimeBlocks(userId: number, date: string): Promise<TimeBlock[]> {
    return Array.from(this.timeBlocks.values())
      .filter(block => block.userId === userId && block.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  async createTimeBlock(block: InsertTimeBlock): Promise<TimeBlock> {
    const id = this.currentId++;
    const newBlock: TimeBlock = { 
      ...block, 
      id,
      description: block.description ?? null,
      createdAt: new Date()
    };
    this.timeBlocks.set(id, newBlock);
    return newBlock;
  }

  async updateTimeBlock(id: number, updates: Partial<TimeBlock>): Promise<TimeBlock | undefined> {
    const block = this.timeBlocks.get(id);
    if (!block) return undefined;
    
    const updated = { ...block, ...updates };
    this.timeBlocks.set(id, updated);
    return updated;
  }

  async deleteTimeBlock(id: number): Promise<boolean> {
    return this.timeBlocks.delete(id);
  }

  // User settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    return Array.from(this.userSettings.values()).find(settings => settings.userId === userId);
  }

  async upsertUserSettings(settings: InsertUserSettings): Promise<UserSettings> {
    const existing = await this.getUserSettings(settings.userId);
    if (existing) {
      const updated = { ...existing, ...settings, updatedAt: new Date() };
      this.userSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentId++;
      const newSettings: UserSettings = { 
        ...settings, 
        id,
        customActivities: settings.customActivities ?? [],
        defaultActivities: settings.defaultActivities ?? [
          "회의", "업무", "휴식", "학습", "운동", "식사", "이동", "개인시간"
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.userSettings.set(id, newSettings);
      return newSettings;
    }
  }

  // Task carryover methods
  async carryOverIncompleteTasks(userId: number, fromDate: string, toDate: string): Promise<Task[]> {
    const incompleteTasks = Array.from(this.tasks.values())
      .filter(task => 
        task.userId === userId && 
        task.scheduledDate === fromDate && 
        !task.completed
      );

    const carriedOverTasks: Task[] = [];
    
    for (const task of incompleteTasks) {
      const carriedOverTask: Task = {
        ...task,
        id: this.currentId++,
        scheduledDate: toDate,
        isCarriedOver: true,
        originalScheduledDate: task.originalScheduledDate || task.scheduledDate,
        createdAt: new Date()
      };
      
      this.tasks.set(carriedOverTask.id, carriedOverTask);
      carriedOverTasks.push(carriedOverTask);
    }
    
    return carriedOverTasks;
  }

  async getCarriedOverTasks(userId: number, date: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => 
        task.userId === userId && 
        task.scheduledDate === date && 
        task.isCarriedOver === true
      );
  }
}

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, and, inArray } from 'drizzle-orm';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  // Foundation methods
  async getFoundation(userId: number, year?: number): Promise<Foundation | undefined> {
    const currentYear = year || new Date().getFullYear();
    const result = await db
      .select()
      .from(foundations)
      .where(and(eq(foundations.userId, userId), eq(foundations.year, currentYear)))
      .limit(1);
    return result[0];
  }

  async getAllFoundations(userId: number): Promise<Foundation[]> {
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
  async getAnnualGoals(userId: number, year?: number): Promise<AnnualGoal[]> {
    const currentYear = year || new Date().getFullYear();
    return await db
      .select()
      .from(annualGoals)
      .where(and(eq(annualGoals.userId, userId), eq(annualGoals.year, currentYear)));
  }

  async createAnnualGoal(goal: InsertAnnualGoal): Promise<AnnualGoal> {
    const result = await db.insert(annualGoals).values(goal).returning();
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
    return result.rowCount > 0;
  }

  // Project methods
  async getProjects(userId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId));
  }

  async createProject(project: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(project).returning();
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
    return result.rowCount > 0;
  }

  // Task methods
  async getTasks(userId: number, date?: string, projectId?: number): Promise<Task[]> {
    let conditions = [eq(tasks.userId, userId)];
    
    if (date) {
      conditions.push(eq(tasks.scheduledDate, date));
    }
    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }
    
    return await db.select().from(tasks).where(and(...conditions));
  }

  async getTasksByPriority(userId: number, priority: string, date?: string): Promise<Task[]> {
    let conditions = [eq(tasks.userId, userId), eq(tasks.priority, priority)];
    
    if (date) {
      conditions.push(eq(tasks.scheduledDate, date));
    }
    
    return await db.select().from(tasks).where(and(...conditions));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const result = await db.insert(tasks).values(task).returning();
    return result[0];
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    if (updates.completed) {
      updates.completedAt = new Date();
    }
    
    const result = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return result[0];
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return result.rowCount > 0;
  }

  // Event methods
  async getEvents(userId: number, startDate?: string, endDate?: string): Promise<Event[]> {
    let query = db.select().from(events).where(eq(events.userId, userId));
    
    // Note: Date filtering would need proper date comparison operators
    return await query;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(event).returning();
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
    return result.rowCount > 0;
  }

  // Habit methods
  async getHabits(userId: number): Promise<Habit[]> {
    return await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isActive, true)));
  }

  async createHabit(habit: InsertHabit): Promise<Habit> {
    const result = await db.insert(habits).values(habit).returning();
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
    const result = await db
      .update(habits)
      .set({ isActive: false })
      .where(eq(habits.id, id));
    return result.rowCount > 0;
  }

  // Habit log methods
  async getHabitLogs(habitId: number, startDate?: string, endDate?: string): Promise<HabitLog[]> {
    let query = db.select().from(habitLogs).where(eq(habitLogs.habitId, habitId));
    
    // Note: Date filtering would need proper date comparison operators
    return await query;
  }

  async getHabitLogsForDate(userId: number, date: string): Promise<HabitLog[]> {
    const userHabits = await this.getHabits(userId);
    const habitIds = userHabits.map(h => h.id);
    
    if (habitIds.length === 0) return [];
    
    return await db
      .select()
      .from(habitLogs)
      .where(and(
        eq(habitLogs.date, date),
        inArray(habitLogs.habitId, habitIds)
      ));
  }

  async createHabitLog(log: InsertHabitLog): Promise<HabitLog> {
    const result = await db.insert(habitLogs).values(log).returning();
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

  async deleteHabitLog(habitId: number, userId: number, date: string): Promise<boolean> {
    const result = await db
      .delete(habitLogs)
      .where(and(
        eq(habitLogs.habitId, habitId),
        eq(habitLogs.date, date)
      ));
    return result.rowCount > 0;
  }

  // Weekly review methods
  async getWeeklyReviews(userId: number): Promise<WeeklyReview[]> {
    return await db.select().from(weeklyReviews).where(eq(weeklyReviews.userId, userId));
  }

  async getWeeklyReview(userId: number, weekStartDate: string): Promise<WeeklyReview | undefined> {
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
      const result = await db.insert(weeklyReviews).values(review).returning();
      return result[0];
    }
  }

  // Daily reflection methods
  async getDailyReflection(userId: number, date: string): Promise<DailyReflection | undefined> {
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
      const result = await db.insert(dailyReflections).values(reflection).returning();
      return result[0];
    }
  }

  // Time block methods
  async getTimeBlocks(userId: number, date: string): Promise<TimeBlock[]> {
    return await db
      .select()
      .from(timeBlocks)
      .where(and(eq(timeBlocks.userId, userId), eq(timeBlocks.date, date)));
  }

  async createTimeBlock(block: InsertTimeBlock): Promise<TimeBlock> {
    const result = await db.insert(timeBlocks).values(block).returning();
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
    return result.rowCount > 0;
  }

  // User settings methods
  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
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
      const result = await db.insert(userSettings).values(settings).returning();
      return result[0];
    }
  }

  // Task carryover methods
  async carryOverIncompleteTasks(userId: number, fromDate: string, toDate: string): Promise<Task[]> {
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
      const result = await db.insert(tasks).values(carriedOverTask).returning();
      carriedOverTasks.push(result[0]);
    }
    
    return carriedOverTasks;
  }

  async getCarriedOverTasks(userId: number, date: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.scheduledDate, date),
        eq(tasks.isCarriedOver, true)
      ));
  }

  // Monthly review methods
  async getMonthlyReviews(userId: number): Promise<MonthlyReview[]> {
    return await db
      .select()
      .from(monthlyReviews)
      .where(eq(monthlyReviews.userId, userId));
  }

  async getMonthlyReview(userId: number, year: number, month: number): Promise<MonthlyReview | undefined> {
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
      const result = await db.insert(monthlyReviews).values(review).returning();
      return result[0];
    }
  }
}

export const storage = new DatabaseStorage();
