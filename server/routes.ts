import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertFoundationSchema, insertAnnualGoalSchema, insertProjectSchema,
  insertTaskSchema, insertEventSchema, insertHabitSchema, insertHabitLogSchema, 
  insertWeeklyReviewSchema, insertMonthlyReviewSchema, insertDailyReflectionSchema, insertTimeBlockSchema,
  insertUserSettingsSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Foundation routes
  app.get("/api/foundation/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const foundation = await storage.getFoundation(userId, year);
      
      if (!foundation) {
        return res.status(404).json({ message: "Foundation not found" });
      }
      
      res.json(foundation);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/foundations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const foundations = await storage.getAllFoundations(userId);
      res.json(foundations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/foundation", async (req, res) => {
    try {
      const foundationData = insertFoundationSchema.parse(req.body);
      const foundation = await storage.upsertFoundation(foundationData);
      res.json(foundation);
    } catch (error) {
      res.status(400).json({ message: "Invalid foundation data" });
    }
  });

  // Annual goals routes
  app.get("/api/goals/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const goals = await storage.getAnnualGoals(userId, year);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/goals", async (req, res) => {
    try {
      const goalData = insertAnnualGoalSchema.parse(req.body);
      const goal = await storage.createAnnualGoal(goalData);
      res.json(goal);
    } catch (error) {
      res.status(400).json({ message: "Invalid goal data" });
    }
  });

  app.patch("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const goal = await storage.updateAnnualGoal(id, updates);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAnnualGoal(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Project routes
  app.get("/api/projects/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const project = await storage.updateProject(id, updates);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteProject(id);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Event routes
  app.get("/api/events/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { startDate, endDate } = req.query;
      const events = await storage.getEvents(
        userId, 
        startDate as string, 
        endDate as string
      );
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid event data" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Remove fields that shouldn't be updated
      const { id: _, createdAt, ...validUpdates } = updates;
      
      const event = await storage.updateEvent(id, validUpdates);
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      console.error('Update event error:', error);
      res.status(400).json({ message: "Invalid event data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteEvent(id);
      
      if (!success) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Event completion route
  app.patch("/api/events/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = req.body;
      const event = await storage.updateEvent(id, { completed });
      
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      res.json(event);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task routes
  app.get("/api/tasks/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const date = req.query.date as string;
      const priority = req.query.priority as string;
      
      let tasks;
      if (priority) {
        tasks = await storage.getTasksByPriority(userId, priority, date);
      } else {
        tasks = await storage.getTasks(userId, date);
      }
      
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const task = await storage.updateTask(id, updates);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTask(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task completion route
  app.patch("/api/tasks/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = req.body;
      const task = await storage.updateTask(id, { completed });
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Habit routes
  app.get("/api/habits/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log('Getting habits for user:', userId);
      const habits = await storage.getHabits(userId);
      console.log('Found habits:', habits);
      res.json(habits);
    } catch (error) {
      console.error('Get habits error:', error);
      res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/habits", async (req, res) => {
    try {
      console.log('Creating habit with data:', req.body);
      const habitData = insertHabitSchema.parse(req.body);
      console.log('Parsed habit data:', habitData);
      const habit = await storage.createHabit(habitData);
      res.json(habit);
    } catch (error) {
      console.error('Habit creation error:', error);
      res.status(400).json({ message: "Invalid habit data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/habits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const habit = await storage.updateHabit(id, updates);
      
      if (!habit) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      res.json(habit);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/habits/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteHabit(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Habit not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Habit log routes
  app.get("/api/habit-logs/:userId/:date", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const date = req.params.date;
      console.log('Getting habit logs for user:', userId, 'date:', date);
      const logs = await storage.getHabitLogsForDate(userId, date);
      console.log('Found habit logs:', logs);
      res.json(logs);
    } catch (error) {
      console.error('Get habit logs error:', error);
      res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/habit-logs", async (req, res) => {
    try {
      const logData = insertHabitLogSchema.parse(req.body);
      const log = await storage.createHabitLog(logData);
      res.json(log);
    } catch (error) {
      res.status(400).json({ message: "Invalid habit log data" });
    }
  });

  app.patch("/api/habit-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const log = await storage.updateHabitLog(id, updates);
      
      if (!log) {
        return res.status(404).json({ message: "Habit log not found" });
      }
      
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/habit-logs", async (req, res) => {
    try {
      const { habitId, userId, date } = req.body;
      const success = await storage.deleteHabitLog(habitId, userId, date);
      res.json({ success });
    } catch (error) {
      console.error('Delete habit log error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Weekly review routes
  app.get("/api/weekly-review/:userId/:weekStartDate", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const weekStartDate = req.params.weekStartDate;
      const review = await storage.getWeeklyReview(userId, weekStartDate);
      
      if (!review) {
        return res.status(404).json({ message: "Weekly review not found" });
      }
      
      res.json(review);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/weekly-review", async (req, res) => {
    try {
      const reviewData = insertWeeklyReviewSchema.parse(req.body);
      const review = await storage.upsertWeeklyReview(reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid weekly review data" });
    }
  });

  // Monthly review routes
  app.get("/api/monthly-review/:userId/:year/:month", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      const review = await storage.getMonthlyReview(userId, year, month);
      
      if (!review) {
        return res.status(404).json({ message: "Monthly review not found" });
      }
      
      res.json(review);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/monthly-review", async (req, res) => {
    try {
      const reviewData = insertMonthlyReviewSchema.parse(req.body);
      const review = await storage.upsertMonthlyReview(reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid monthly review data" });
    }
  });

  // Daily reflection routes
  app.get("/api/daily-reflection/:userId/:date", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const date = req.params.date;
      const reflection = await storage.getDailyReflection(userId, date);
      
      if (!reflection) {
        return res.status(404).json({ message: "Daily reflection not found" });
      }
      
      res.json(reflection);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/daily-reflection", async (req, res) => {
    try {
      const reflectionData = insertDailyReflectionSchema.parse(req.body);
      const reflection = await storage.upsertDailyReflection(reflectionData);
      res.json(reflection);
    } catch (error) {
      res.status(400).json({ message: "Invalid daily reflection data" });
    }
  });

  // Time block routes
  app.get("/api/time-blocks/:userId/:date", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const date = req.params.date;
      const blocks = await storage.getTimeBlocks(userId, date);
      res.json(blocks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/time-blocks", async (req, res) => {
    try {
      const blockData = insertTimeBlockSchema.parse(req.body);
      const block = await storage.createTimeBlock(blockData);
      res.json(block);
    } catch (error) {
      res.status(400).json({ message: "Invalid time block data" });
    }
  });

  app.patch("/api/time-blocks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const block = await storage.updateTimeBlock(id, updates);
      
      if (!block) {
        return res.status(404).json({ message: "Time block not found" });
      }
      
      res.json(block);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/time-blocks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTimeBlock(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Time block not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User settings routes
  app.get("/api/user-settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          userId,
          customActivities: [],
          defaultActivities: [
            "회의", "업무", "휴식", "학습", "운동", "식사", "이동", "개인시간"
          ]
        };
        return res.json(defaultSettings);
      }
      
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/user-settings", async (req, res) => {
    try {
      const settingsData = insertUserSettingsSchema.parse(req.body);
      const settings = await storage.upsertUserSettings(settingsData);
      res.json(settings);
    } catch (error) {
      res.status(400).json({ message: "Invalid settings data" });
    }
  });

  // Task carryover routes
  app.post("/api/tasks/carryover", async (req, res) => {
    try {
      const { userId, fromDate, toDate } = req.body;
      const carriedOverTasks = await storage.carryOverIncompleteTasks(userId, fromDate, toDate);
      res.json(carriedOverTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to carry over tasks" });
    }
  });

  app.get("/api/tasks/carried-over/:userId/:date", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const date = req.params.date;
      const carriedOverTasks = await storage.getCarriedOverTasks(userId, date);
      res.json(carriedOverTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get carried over tasks" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
