import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertFoundationSchema, insertAnnualGoalSchema, insertProjectSchema,
  insertTaskSchema, insertEventSchema, insertHabitSchema, insertHabitLogSchema, 
  insertWeeklyReviewSchema, insertMonthlyReviewSchema, insertDailyReflectionSchema, insertTimeBlockSchema,
  insertUserSettingsSchema, insertProjectFileSchema
} from "@shared/schema";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Development: Admin user switch (개발용 사용자 전환)
  app.post('/api/dev/switch-user', isAuthenticated, async (req: any, res) => {
    try {
      const { targetUserId } = req.body;
      const currentUserId = req.user.claims.sub;
      
      // 현재 사용자가 admin인지 확인하거나 개발 환경에서만 허용
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: "Only available in development" });
      }
      
      // 대상 사용자가 존재하는지 확인
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "Target user not found" });
      }
      
      // 세션에서 사용자 정보 업데이트
      req.user.claims.sub = targetUserId;
      req.user.claims.email = targetUser.email;
      req.user.claims.first_name = targetUser.firstName;
      req.user.claims.last_name = targetUser.lastName;
      
      res.json({ 
        message: "User switched successfully", 
        currentUser: targetUser 
      });
    } catch (error) {
      console.error("Error switching user:", error);
      res.status(500).json({ message: "Failed to switch user" });
    }
  });

  // Development: Get all users for switching (개발용 사용자 목록)
  app.get('/api/dev/users', isAuthenticated, async (req: any, res) => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: "Only available in development" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Foundation routes
  app.get("/api/foundation/auth", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get("/api/foundation/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub; // Use authenticated user ID
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

  app.get("/api/foundations/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foundations = await storage.getAllFoundations(userId);
      res.json(foundations);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/foundation", isAuthenticated, async (req: any, res) => {
    try {
      const foundationData = insertFoundationSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const foundation = await storage.upsertFoundation(foundationData);
      res.json(foundation);
    } catch (error) {
      res.status(400).json({ message: "Invalid foundation data" });
    }
  });

  // Annual goals routes
  app.get("/api/goals/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const goals = await storage.getAnnualGoals(userId, year);
      res.json(goals);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      const goalData = insertAnnualGoalSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
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
  app.get("/api/projects/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects", isAuthenticated, async (req: any, res) => {
    try {
      const projectData = insertProjectSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      console.log('Creating project with userId:', req.user.claims.sub, 'data:', projectData);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error('Project creation error:', error);
      res.status(400).json({ message: "Invalid project data" });
    }
  });

  // Clone project with tasks
  app.post("/api/projects/:id/clone", async (req, res) => {
    try {
      const originalProjectId = parseInt(req.params.id);
      const { title } = req.body;
      
      // Get original project
      const originalProject = await storage.getProject(originalProjectId);
      if (!originalProject) {
        return res.status(404).json({ message: "Original project not found" });
      }

      // Clone project
      const cloneData = {
        ...originalProject,
        title: title || `${originalProject.title} (복사본)`,
        id: undefined // Remove id so new one is generated
      };
      const clonedProject = await storage.createProject(cloneData);

      // Get original project tasks
      const originalTasks = await storage.getTasksByProject(originalProjectId);
      
      // Clone tasks
      const clonedTasks = [];
      for (const task of originalTasks) {
        const taskCloneData = {
          ...task,
          id: undefined, // Remove id so new one is generated
          projectId: clonedProject.id,
          completed: false, // Reset completion status
          completedAt: null
        };
        const clonedTask = await storage.createTask(taskCloneData);
        clonedTasks.push(clonedTask);
      }

      res.json({ 
        project: clonedProject, 
        tasks: clonedTasks,
        message: `프로젝트와 ${clonedTasks.length}개의 할일이 복제되었습니다.`
      });
    } catch (error) {
      console.error('Project clone error:', error);
      res.status(500).json({ message: "프로젝트 복제 중 오류가 발생했습니다." });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      // Process fileUrls if they exist in the updates
      if (updates.fileUrls) {
        console.log('Processing project fileUrls:', updates.fileUrls);
        
        // Ensure fileUrls is an array of proper file objects
        if (Array.isArray(updates.fileUrls)) {
          updates.fileUrls = updates.fileUrls.map((file: any) => {
            // If it's already a proper object, return as is
            if (typeof file === 'object' && file.url && file.name) {
              return {
                url: String(file.url),
                name: String(file.name),
                size: Number(file.size) || 0
              };
            }
            // If it's a string URL, create a basic file object
            if (typeof file === 'string') {
              const fileName = file.split('/').pop() || 'Unknown file';
              return {
                url: file,
                name: fileName,
                size: 0
              };
            }
            // Invalid file data, skip
            return null;
          }).filter(Boolean); // Remove null entries
        } else {
          // Invalid fileUrls format, reset to empty array
          updates.fileUrls = [];
        }
        
        console.log('Processed project fileUrls:', updates.fileUrls);
      }
      
      const project = await storage.updateProject(id, updates);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Project update error:', error);
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

  // Project file routes
  app.get("/api/projects/:projectId/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const files = await storage.getProjectFiles(projectId);
      res.json(files);
    } catch (error) {
      console.error('Get project files error:', error);
      res.status(500).json({ message: "Failed to fetch project files" });
    }
  });

  app.post("/api/projects/:projectId/files/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Get upload URL error:', error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.post("/api/projects/:projectId/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.claims.sub;
      
      const fileData = insertProjectFileSchema.parse({
        ...req.body,
        projectId,
        userId,
      });
      
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(req.body.objectPath);
      
      // Set ACL policy for private file access
      await objectStorageService.trySetObjectEntityAclPolicy(req.body.objectPath, {
        owner: userId,
        visibility: "private",
      });
      
      const projectFile = await storage.createProjectFile({
        ...fileData,
        objectPath: normalizedPath,
      });
      
      res.json(projectFile);
    } catch (error) {
      console.error('Create project file error:', error);
      res.status(500).json({ message: "Failed to create project file record" });
    }
  });

  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: "read" as any,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // File download endpoint
  app.get("/api/projects/:projectId/files/:fileId/download", isAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const userId = req.user.claims.sub;
      
      // Get file info to check ownership
      const file = await storage.getProjectFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if user owns the file
      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const objectStorageService = new ObjectStorageService();
      try {
        const objectFile = await objectStorageService.getObjectEntityFile(file.objectPath);
        objectStorageService.downloadObject(objectFile, res);
      } catch (error) {
        console.error("Error downloading file:", error);
        if (error instanceof ObjectNotFoundError) {
          return res.status(404).json({ message: "File content not found" });
        }
        return res.status(500).json({ message: "Failed to download file" });
      }
    } catch (error) {
      console.error('Download project file error:', error);
      res.status(500).json({ message: "Failed to download project file" });
    }
  });

  app.delete("/api/projects/:projectId/files/:fileId", isAuthenticated, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const userId = req.user.claims.sub;
      
      // Get file info to check ownership
      const file = await storage.getProjectFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      // Check if user owns the file
      if (file.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const success = await storage.deleteProjectFile(fileId);
      
      if (!success) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Delete project file error:', error);
      res.status(500).json({ message: "Failed to delete project file" });
    }
  });

  // Event routes
  app.get("/api/events/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const events = await storage.getEvents(
        userId, 
        startDate as string, 
        endDate as string
      );
      res.json(events);
    } catch (error) {
      console.error('Events API error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/events", isAuthenticated, async (req: any, res) => {
    try {
      console.log('Event creation request body:', JSON.stringify(req.body, null, 2));
      const eventData = insertEventSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      console.log('Parsed event data:', JSON.stringify(eventData, null, 2));
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error('Event creation error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(400).json({ 
        message: "Invalid event data", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
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
  app.get("/api/tasks/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      console.log('Creating task with userId:', req.user.claims.sub, 'data:', taskData);
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error('Task creation error:', error);
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const userId = req.user.claims.sub;
      
      // First check if task exists and belongs to user
      const existingTask = await storage.getTask(id);
      if (!existingTask || existingTask.userId !== userId) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Remove userId from updates to prevent override
      const { userId: _, ...safeUpdates } = updates;
      
      // Process fileUrls if they exist in the updates
      if (safeUpdates.fileUrls) {
        console.log('Processing fileUrls:', safeUpdates.fileUrls);
        
        // Ensure fileUrls is an array of proper file objects
        if (Array.isArray(safeUpdates.fileUrls)) {
          safeUpdates.fileUrls = safeUpdates.fileUrls.map((file: any) => {
            // If it's already a proper object, return as is
            if (typeof file === 'object' && file.url && file.name) {
              return {
                url: String(file.url),
                name: String(file.name),
                size: Number(file.size) || 0
              };
            }
            // If it's a string URL, create a basic file object
            if (typeof file === 'string') {
              const fileName = file.split('/').pop() || 'Unknown file';
              return {
                url: file,
                name: fileName,
                size: 0
              };
            }
            // Invalid file data, skip
            return null;
          }).filter(Boolean); // Remove null entries
        } else {
          // Invalid fileUrls format, reset to empty array
          safeUpdates.fileUrls = [];
        }
        
        console.log('Processed fileUrls:', safeUpdates.fileUrls);
      }
      
      console.log('Updating task:', id, 'with updates:', safeUpdates);
      const task = await storage.updateTask(id, safeUpdates);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Task update error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // Check if task exists and belongs to user
      const existingTask = await storage.getTask(id);
      if (!existingTask || existingTask.userId !== userId) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const deleted = await storage.deleteTask(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Task deletion error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Task completion route
  app.patch("/api/tasks/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { completed } = req.body;
      const userId = req.user.claims.sub;
      
      // Check if task exists and belongs to user
      const existingTask = await storage.getTask(id);
      if (!existingTask || existingTask.userId !== userId) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const task = await storage.updateTask(id, { completed });
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error('Task completion error:', error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Habit routes
  app.get("/api/habits/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('Getting habits for user:', userId);
      const habits = await storage.getHabits(userId);
      console.log('Found habits:', habits);
      res.json(habits);
    } catch (error) {
      console.error('Get habits error:', error);
      res.status(500).json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/habits", isAuthenticated, async (req: any, res) => {
    try {
      console.log('Creating habit with data:', req.body);
      const habitData = insertHabitSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
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
  app.get("/api/habit-logs/:userId/:date", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/habit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const logData = insertHabitLogSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
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
  app.get("/api/weekly-review/:userId/:weekStartDate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post("/api/weekly-review", isAuthenticated, async (req: any, res) => {
    try {
      const reviewData = insertWeeklyReviewSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
      const review = await storage.upsertWeeklyReview(reviewData);
      res.json(review);
    } catch (error) {
      res.status(400).json({ message: "Invalid weekly review data" });
    }
  });

  // Monthly review routes
  app.get("/api/monthly-review/:userId/:year/:month", async (req, res) => {
    try {
      const userId = req.params.userId;
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
      const userId = req.params.userId;
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
      const userId = req.params.userId;
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
      const userId = req.params.userId;
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
      const userId = req.params.userId;
      const date = req.params.date;
      const carriedOverTasks = await storage.getCarriedOverTasks(userId, date);
      res.json(carriedOverTasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to get carried over tasks" });
    }
  });

  // File upload routes
  app.post("/api/files/upload", isAuthenticated, async (req: any, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // File serving route for private objects
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    
    console.log('Accessing object path:', req.path, 'for user:', userId);
    
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: "read" as any,
      });
      if (!canAccess) {
        console.log('Access denied for user:', userId, 'to object:', req.path);
        return res.sendStatus(401);
      }
      
      console.log('Serving object file:', objectFile.name);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        console.log('Object not found:', req.path);
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Public file serving route
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // File ACL setting endpoint
  app.put("/api/files/set-acl", isAuthenticated, async (req: any, res) => {
    try {
      const { fileUrl } = req.body;
      const userId = req.user.claims.sub;
      
      if (!fileUrl) {
        return res.status(400).json({ error: "fileUrl is required" });
      }
      
      const objectStorageService = new ObjectStorageService();
      
      console.log('Setting ACL for file:', fileUrl, 'user:', userId);
      
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileUrl,
        {
          owner: userId,
          visibility: "private",
        },
      );

      console.log('ACL set successfully, object path:', objectPath);

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting file ACL:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
