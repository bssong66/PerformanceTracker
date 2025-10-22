import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import {
  insertFoundationSchema, insertAnnualGoalSchema, insertProjectSchema,
  insertTaskSchema, insertEventSchema, insertHabitSchema, insertHabitLogSchema,
  insertWeeklyReviewSchema, insertMonthlyReviewSchema, insertDailyReflectionSchema, insertTimeBlockSchema,
  insertUserSettingsSchema, insertProjectFileSchema
} from "@shared/schema";
import { supabaseAdmin } from "./supabase";
import { uploadFileToSupabase } from "./supabaseStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads', 'daily-reflections');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploaded files as static
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Multer configuration for file uploads
  const storage_multer = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 15 // Maximum 15 files
    },
    fileFilter: function (req, file, cb) {
      // Accept images, PDFs, Word docs, and text files
      const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only images, PDFs, Word documents, and text files are allowed'));
      }
    }
  });

  // Memory storage for Supabase uploads
  const uploadMem = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 15 // Maximum 15 files
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Supabase auth middleware
  const isAuthenticated = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: '인증 토큰이 필요합니다.' });
      }

      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      
      if (error || !user) {
        return res.status(401).json({ message: '유효하지 않은 토큰입니다.' });
      }

      req.user = { claims: { sub: user.id, email: user.email } };
      next();
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ message: '인증 처리 중 오류가 발생했습니다.' });
    }
  };

  // Supabase auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName) {
        return res.status(400).json({ message: '필수 정보를 입력해주세요.' });
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          first_name: firstName,
          last_name: lastName || '',
        },
        email_confirm: true
      });

      if (error) {
        return res.status(400).json({ message: error.message });
      }

      res.json({ message: '회원가입이 완료되었습니다.', user: data.user });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: '회원가입 중 오류가 발생했습니다.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' });
      }

      // 임시 로컬 인증 (개발용)
      if (email === 'test@example.com' && password === 'password123') {
        const mockUserId = 'dev-user-' + Date.now();

        // 개발용 사용자 생성 또는 업데이트
        await storage.upsertUser({
          id: mockUserId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          authType: 'local',
          password: null
        });

        // 세션에 사용자 정보 저장
        (req.session as any).user = {
          claims: {
            sub: mockUserId,
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User'
          }
        };

        await new Promise((resolve, reject) => {
          req.session.save((err: any) => {
            if (err) reject(err);
            else resolve(true);
          });
        });

        res.json({
          message: '로그인이 완료되었습니다.',
          user: {
            id: mockUserId,
            email: 'test@example.com',
            user_metadata: {
              first_name: 'Test',
              last_name: 'User'
            }
          },
          session: { access_token: 'mock_token_' + Date.now() }
        });
        return;
      }

      // Supabase 인증 (실제 키가 있을 때)
      try {
        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          return res.status(401).json({ message: '이메일 또는 비밀번호가 잘못되었습니다.' });
        }

        res.json({ 
          message: '로그인이 완료되었습니다.', 
          user: data.user,
          session: data.session 
        });
      } catch (supabaseError) {
        console.error('Supabase auth error:', supabaseError);
        return res.status(401).json({ message: '인증 서비스에 연결할 수 없습니다.' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: '로그인 중 오류가 발생했습니다.' });
    }
  });

  app.post('/api/auth/logout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await supabaseAdmin.auth.admin.signOut(token);
      }
      res.json({ message: '로그아웃되었습니다.' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: '로그아웃 중 오류가 발생했습니다.' });
    }
  });

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

      // Return null instead of 404 when foundation doesn't exist (normal for new users)
      res.json(foundation || null);
    } catch (error) {
      console.error("Error fetching foundation:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/foundation/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub; // Use authenticated user ID
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      console.log(`[API] Foundation request - userId: ${userId}, year: ${year}`);
      
      // Debug: Check all foundations for this user
      const allFoundations = await storage.getAllFoundations(userId);
      console.log(`[API] All foundations for user ${userId}:`, allFoundations);
      
      const foundation = await storage.getFoundation(userId, year);
      console.log(`[API] Foundation response for year ${year}:`, foundation);

      // Return null instead of 404 when foundation doesn't exist (normal for new users)
      res.json(foundation || null);
    } catch (error) {
      console.error("Error fetching foundation:", error);
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
      console.log("Foundation request body:", req.body);
      console.log("User ID:", req.user.claims.sub);

      // Ensure user exists in database before creating foundation
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);

      if (!user) {
        // User authenticated but not in database - upsert user record
        console.log("User not found in database, upserting user record...");
        user = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email || '',
          firstName: req.user.claims.first_name || '',
          lastName: req.user.claims.last_name || '',
          profileImageUrl: req.user.claims.profile_image_url || null,
          authType: 'local',
          password: null // No password for session-based auth
        });
        console.log("User upserted:", user.id);
      }

      const foundationData = insertFoundationSchema.parse({
        ...req.body,
        userId: userId
      });
      console.log("Parsed foundation data:", foundationData);
      const foundation = await storage.upsertFoundation(foundationData);
      res.json(foundation);
    } catch (error) {
      console.error("Foundation validation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
      }
      res.status(400).json({
        message: "Invalid foundation data",
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof z.ZodError ? error.errors : undefined
      });
    }
  });

  // Annual goals routes
  app.get("/api/goals/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      console.log(`[API] Goals request - userId: ${userId}, year: ${year}`);
      
      // Debug: Check all goals for this user
      const allGoals = await storage.getAllFoundations(userId); // This will show all foundations, not goals
      console.log(`[API] All foundations for user ${userId}:`, allGoals);
      
      const goals = await storage.getAnnualGoals(userId, year);
      console.log(`[API] Goals response for year ${year}:`, goals);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching goals:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/goals", isAuthenticated, async (req: any, res) => {
    try {
      console.log("Goal request body:", req.body);
      console.log("User ID:", req.user.claims.sub);

      // Ensure user exists in database before creating goal
      const userId = req.user.claims.sub;
      let user = await storage.getUser(userId);

      if (!user) {
        // User authenticated but not in database - upsert user record
        console.log("User not found in database, upserting user record...");
        user = await storage.upsertUser({
          id: userId,
          email: req.user.claims.email || '',
          firstName: req.user.claims.first_name || '',
          lastName: req.user.claims.last_name || '',
          profileImageUrl: req.user.claims.profile_image_url || null,
          authType: 'local',
          password: null // No password for session-based auth
        });
        console.log("User upserted:", user.id);
      }

      const goalData = insertAnnualGoalSchema.parse({
        ...req.body,
        userId: userId
      });
      console.log("Parsed goal data:", goalData);
      const goal = await storage.createAnnualGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Goal validation error:", error);
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", error.errors);
      }
      res.status(400).json({
        message: "Invalid goal data",
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof z.ZodError ? error.errors : undefined
      });
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

  app.delete("/api/goals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      console.log(`[API] Deleting goal ${id} for user ${userId}`);
      console.log(`[API] User object:`, req.user);
      
      // First, let's check all goals for this user to see what exists
      const allUserGoals = await storage.getAnnualGoals(userId, new Date().getFullYear());
      console.log(`[API] All goals for user ${userId}:`, allUserGoals);
      
      // First check if the goal exists and belongs to the user
      const goal = await storage.getAnnualGoal(id);
      if (!goal) {
        console.log(`[API] Goal ${id} not found in database`);
        console.log(`[API] Available goal IDs:`, allUserGoals.map(g => g.id));
        // If goal doesn't exist, it might have been already deleted
        // Return success since the end result is the same
        console.log(`[API] Goal ${id} already deleted or doesn't exist - returning success`);
        return res.json({ success: true, message: "Goal already deleted" });
      }
      
      console.log(`[API] Goal found:`, goal);
      console.log(`[API] Goal userId: ${goal.userId}, Request userId: ${userId}`);
      console.log(`[API] UserId match: ${goal.userId === userId}`);
      
      if (goal.userId !== userId) {
        console.log(`[API] Goal ${id} does not belong to user ${userId}`);
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const deleted = await storage.deleteAnnualGoal(id);
      
      if (!deleted) {
        console.log(`[API] Failed to delete goal ${id}`);
        return res.status(404).json({ message: "Goal not found" });
      }
      
      console.log(`[API] Successfully deleted goal ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting goal:", error);
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

  app.post("/api/projects/:projectId/files", isAuthenticated, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = req.user.claims.sub;
      
      const fileData = insertProjectFileSchema.parse({
        ...req.body,
        projectId,
        userId,
      });
      
      const projectFile = await storage.createProjectFile(fileData);
      
      res.json(projectFile);
    } catch (error) {
      console.error('Create project file error:', error);
      res.status(500).json({ message: "Failed to create project file record" });
    }
  });

  // Legacy object access route - redirect to Supabase
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    res.status(410).json({ message: "Legacy object access deprecated. Use Supabase Storage directly." });
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
      const eventData = insertEventSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
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
  app.get("/api/monthly-review/:userId/:year/:month", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub; // Use authenticated user ID instead of param
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

  app.post("/api/monthly-review", isAuthenticated, async (req: any, res) => {
    try {
      const reviewData = insertMonthlyReviewSchema.parse({
        ...req.body,
        userId: req.user.claims.sub
      });
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

  // Daily reflection with file upload
  app.post("/api/daily-reflection/:userId/:date", upload.array('files', 15), async (req, res) => {
    try {
      const { userId, date } = req.params;
      const { content } = req.body;
      const files = req.files as Express.Multer.File[];

      // Process uploaded files
      const fileData = files?.map(file => ({
        name: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        url: `/uploads/daily-reflections/${file.filename}`,
        type: file.mimetype,
        size: file.size
      })) || [];

      // Get existing reflection to merge files
      const existingReflection = await storage.getDailyReflection(userId, date);
      const existingFiles = existingReflection?.files || [];
      const allFiles = [...existingFiles, ...fileData];

      // Create reflection data
      const reflectionData = {
        userId,
        date,
        content: content || existingReflection?.content || "",
        files: allFiles
      };

      const reflection = await storage.upsertDailyReflection(reflectionData);
      res.json({ ...reflection, files: allFiles });
    } catch (error) {
      console.error("Error saving daily reflection with files:", error);
      res.status(500).json({ message: "Failed to save daily reflection" });
    }
  });

  // Delete file from daily reflection
  app.delete("/api/daily-reflection/:userId/:date/file", async (req, res) => {
    try {
      const { userId, date } = req.params;
      const { fileUrl } = req.body;

      // Get existing reflection
      const existingReflection = await storage.getDailyReflection(userId, date);
      if (!existingReflection) {
        return res.status(404).json({ message: "Daily reflection not found" });
      }

      // Remove file from files array
      const existingFiles = existingReflection.files || [];
      const updatedFiles = existingFiles.filter((file: any) => file.url !== fileUrl);

      // Update reflection data
      const reflectionData = {
        userId,
        date,
        content: existingReflection.content || "",
        files: updatedFiles
      };

      // Delete physical file
      if (fileUrl.startsWith('/uploads/')) {
        const filename = fileUrl.replace('/uploads/daily-reflections/', '');
        const filePath = path.join(uploadsDir, filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      const reflection = await storage.upsertDailyReflection(reflectionData);
      res.json({ ...reflection, files: updatedFiles });
    } catch (error) {
      console.error("Error deleting file from daily reflection:", error);
      res.status(500).json({ message: "Failed to delete file" });
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

  // Copy time blocks from previous day
  app.post("/api/time-blocks/copy/:userId/:fromDate/:toDate", async (req, res) => {
    try {
      const { userId, fromDate, toDate } = req.params;
      const fromBlocks = await storage.getTimeBlocks(userId, fromDate);
      
      // Check if target date already has time blocks
      const existingBlocks = await storage.getTimeBlocks(userId, toDate);
      if (existingBlocks.length > 0) {
        return res.status(400).json({ message: "Target date already has time blocks" });
      }
      
      // Copy blocks to new date
      const copiedBlocks = [];
      for (const block of fromBlocks) {
        const newBlock = {
          userId: block.userId,
          date: toDate,
          startTime: block.startTime,
          endTime: block.endTime,
          type: block.type,
          title: block.title,
          description: block.description,
          projectId: block.projectId,
          taskId: block.taskId
        };
        const created = await storage.createTimeBlock(newBlock);
        copiedBlocks.push(created);
      }
      
      res.json(copiedBlocks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Generate suggested break times
  app.post("/api/time-blocks/suggest-breaks/:userId/:date", async (req, res) => {
    try {
      const { userId, date } = req.params;
      const blocks = await storage.getTimeBlocks(userId, date);
      
      const suggestedBreaks = [];
      
      // Sort blocks by start time (convert to 24-hour format for proper sorting)
      const sortedBlocks = blocks.sort((a, b) => {
        const timeA = convertKoreanTimeTo24Hour(a.startTime);
        const timeB = convertKoreanTimeTo24Hour(b.startTime);
        return timeA.localeCompare(timeB);
      });
      
      for (let i = 0; i < sortedBlocks.length - 1; i++) {
        const currentBlock = sortedBlocks[i];
        const nextBlock = sortedBlocks[i + 1];
        
        // Check if there's a gap between blocks
        const currentEndTime = currentBlock.endTime;
        const nextStartTime = nextBlock.startTime;
        
        if (currentEndTime !== nextStartTime) {
          const gap = calculateTimeDifference(currentEndTime, nextStartTime);
          
          // If gap is between 15 minutes and 2 hours, suggest a break
          if (gap >= 15 && gap <= 120) {
            let breakDuration = 15; // Default 15 minutes
            if (gap >= 60) breakDuration = 30; // 30 minutes for longer gaps
            
            const breakEndTime = addMinutesToTime(currentEndTime, breakDuration);
            
            suggestedBreaks.push({
              startTime: currentEndTime,
              endTime: breakEndTime,
              type: 'break',
              title: gap >= 60 ? '점심시간' : '휴식시간',
              description: null,
              projectId: null,
              taskId: null
            });
          }
        }
      }
      
      res.json(suggestedBreaks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Helper function to convert Korean time format to 24-hour format
  function convertKoreanTimeTo24Hour(timeStr: string): string {
    if (!timeStr) return '00:00';
    
    const isAM = timeStr.includes('오전');
    const timeOnly = timeStr.replace(/(오전|오후)\s*/, '');
    const [hours, minutes] = timeOnly.split(':').map(Number);
    
    let hour24 = hours;
    if (!isAM && hours !== 12) {
      hour24 = hours + 12; // PM이고 12시가 아니면 12시간 추가
    } else if (isAM && hours === 12) {
      hour24 = 0; // AM 12시는 0시로 변환
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // Helper function to convert 24-hour format to Korean time format
  function convert24HourToKoreanTime(time24: string): string {
    const [hour, min] = time24.split(':').map(Number);
    
    let hour12 = hour;
    let period = '오전';
    
    if (hour >= 12) {
      period = '오후';
      if (hour > 12) {
        hour12 = hour - 12;
      }
    } else if (hour === 0) {
      hour12 = 12;
    }
    
    return `${period} ${hour12.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  }

  // Helper function to calculate time difference in minutes
  function calculateTimeDifference(startTime: string, endTime: string): number {
    const start24 = convertKoreanTimeTo24Hour(startTime);
    const end24 = convertKoreanTimeTo24Hour(endTime);
    
    const [startHour, startMin] = start24.split(':').map(Number);
    const [endHour, endMin] = end24.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes - startMinutes;
  }

  // Helper function to add minutes to time
  function addMinutesToTime(time: string, minutes: number): string {
    const time24 = convertKoreanTimeTo24Hour(time);
    const [hour, min] = time24.split(':').map(Number);
    const totalMinutes = hour * 60 + min + minutes;
    
    const newHour = Math.floor(totalMinutes / 60) % 24; // 24시간 형태로 유지
    const newMin = totalMinutes % 60;
    
    const newTime24 = `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
    return convert24HourToKoreanTime(newTime24);
  }

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

  // Task file upload route - Supabase direct upload
  app.post("/api/files/upload", isAuthenticated, uploadMem.array("files", 15), async (req: any, res) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      const userId = req.user.claims.sub;

      if (files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles: string[] = [];
      
      for (const file of files) {
        const storagePath = `tasks/${userId}/${Date.now()}-${file.originalname}`;
        
        const result = await uploadFileToSupabase({
          filePath: storagePath,
          contentType: file.mimetype || "application/octet-stream",
          data: file.buffer,
        });

        uploadedFiles.push(`supabase://${result.bucket}/${result.path}`);
      }

      res.json({ uploadedFiles });
    } catch (error) {
      console.error("Task file upload error:", error);
      res.status(500).json({ message: "Failed to upload files to Supabase" });
    }
  });

  // Generate signed URL for Supabase files
  app.post("/api/files/signed-url", isAuthenticated, async (req: any, res) => {
    try {
      const { bucket, objectPath } = req.body;
      
      if (!bucket || !objectPath) {
        return res.status(400).json({ message: "Bucket and objectPath are required" });
      }

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(objectPath, 60); // 1분 유효

      if (error || !data?.signedUrl) {
        throw error || new Error("Failed to create signed URL");
      }

      res.json({ signedUrl: data.signedUrl });
    } catch (error) {
      console.error("Signed URL generation error:", error);
      res.status(500).json({ message: "Failed to generate signed URL" });
    }
  });

  // Legacy object access route - deprecated
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    res.status(410).json({ message: "Legacy object access deprecated. Use Supabase Storage directly." });
  });

  // Legacy public file serving route - deprecated
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    res.status(410).json({ message: "Legacy public object access deprecated. Use Supabase Storage directly." });
  });

  // Legacy ACL setting endpoint - deprecated
  app.put("/api/files/set-acl", isAuthenticated, async (req: any, res) => {
    res.status(410).json({ message: "Legacy ACL endpoint deprecated. Supabase Storage uses bucket policies." });
  });

  const httpServer = createServer(app);
  return httpServer;
}
