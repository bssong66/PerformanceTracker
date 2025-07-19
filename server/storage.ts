import { 
  users, foundations, annualGoals, tasks, habits, habitLogs, 
  weeklyReviews, dailyReflections, timeBlocks,
  type User, type InsertUser, type Foundation, type InsertFoundation,
  type AnnualGoal, type InsertAnnualGoal, type Task, type InsertTask,
  type Habit, type InsertHabit, type HabitLog, type InsertHabitLog,
  type WeeklyReview, type InsertWeeklyReview, type DailyReflection, 
  type InsertDailyReflection, type TimeBlock, type InsertTimeBlock
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Foundation methods
  getFoundation(userId: number): Promise<Foundation | undefined>;
  upsertFoundation(foundation: InsertFoundation): Promise<Foundation>;
  
  // Annual goals methods
  getAnnualGoals(userId: number, year?: number): Promise<AnnualGoal[]>;
  createAnnualGoal(goal: InsertAnnualGoal): Promise<AnnualGoal>;
  updateAnnualGoal(id: number, updates: Partial<AnnualGoal>): Promise<AnnualGoal | undefined>;
  deleteAnnualGoal(id: number): Promise<boolean>;
  
  // Task methods
  getTasks(userId: number, date?: string): Promise<Task[]>;
  getTasksByPriority(userId: number, priority: string, date?: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  
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
  
  // Weekly review methods
  getWeeklyReviews(userId: number): Promise<WeeklyReview[]>;
  getWeeklyReview(userId: number, weekStartDate: string): Promise<WeeklyReview | undefined>;
  upsertWeeklyReview(review: InsertWeeklyReview): Promise<WeeklyReview>;
  
  // Daily reflection methods
  getDailyReflection(userId: number, date: string): Promise<DailyReflection | undefined>;
  upsertDailyReflection(reflection: InsertDailyReflection): Promise<DailyReflection>;
  
  // Time block methods
  getTimeBlocks(userId: number, date: string): Promise<TimeBlock[]>;
  createTimeBlock(block: InsertTimeBlock): Promise<TimeBlock>;
  updateTimeBlock(id: number, updates: Partial<TimeBlock>): Promise<TimeBlock | undefined>;
  deleteTimeBlock(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private foundations: Map<number, Foundation>;
  private annualGoals: Map<number, AnnualGoal>;
  private tasks: Map<number, Task>;
  private habits: Map<number, Habit>;
  private habitLogs: Map<number, HabitLog>;
  private weeklyReviews: Map<number, WeeklyReview>;
  private dailyReflections: Map<number, DailyReflection>;
  private timeBlocks: Map<number, TimeBlock>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.foundations = new Map();
    this.annualGoals = new Map();
    this.tasks = new Map();
    this.habits = new Map();
    this.habitLogs = new Map();
    this.weeklyReviews = new Map();
    this.dailyReflections = new Map();
    this.timeBlocks = new Map();
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
  async getFoundation(userId: number): Promise<Foundation | undefined> {
    return Array.from(this.foundations.values()).find(f => f.userId === userId);
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
      .filter(goal => goal.userId === userId && goal.year === currentYear);
  }

  async createAnnualGoal(goal: InsertAnnualGoal): Promise<AnnualGoal> {
    const id = this.currentId++;
    const newGoal: AnnualGoal = { 
      ...goal, 
      id,
      completed: goal.completed ?? null,
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

  // Task methods
  async getTasks(userId: number, date?: string): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => {
        if (task.userId !== userId) return false;
        if (date && task.scheduledDate !== date) return false;
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
      completed: task.completed ?? null,
      scheduledDate: task.scheduledDate ?? null,
      timeEstimate: task.timeEstimate ?? null,
      notes: task.notes ?? null,
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
        weeklyGoal1: review.weeklyGoal1 ?? null,
        weeklyGoal2: review.weeklyGoal2 ?? null,
        weeklyGoal3: review.weeklyGoal3 ?? null,
        workHours: review.workHours ?? null,
        personalHours: review.personalHours ?? null,
        valueAlignment1: review.valueAlignment1 ?? null,
        valueAlignment2: review.valueAlignment2 ?? null,
        valueAlignment3: review.valueAlignment3 ?? null,
        reflection: review.reflection ?? null,
        createdAt: new Date()
      };
      this.weeklyReviews.set(id, newReview);
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
}

export const storage = new MemStorage();
