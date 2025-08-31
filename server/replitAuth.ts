import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";



export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}



export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy for username/password authentication
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  }, async (email, password, done) => {
    try {
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return done(null, false, { message: '이메일 또는 비밀번호가 잘못되었습니다.' });
      }

      if (user.authType !== 'local') {
        return done(null, false, { message: '이 이메일은 다른 방식으로 가입되었습니다.' });
      }

      const isValid = await bcrypt.compare(password, user.password || '');
      if (!isValid) {
        return done(null, false, { message: '이메일 또는 비밀번호가 잘못되었습니다.' });
      }

      return done(null, {
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        }
      });
    } catch (error) {
      return done(error);
    }
  }));




  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));


  // Local login route
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "서버 오류가 발생했습니다." });
      }
      if (!user) {
        return res.status(401).json({ message: info.message || "로그인에 실패했습니다." });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "로그인 처리 중 오류가 발생했습니다." });
        }
        return res.json({ message: "로그인이 완료되었습니다.", user: user.claims });
      });
    })(req, res, next);
  });



  // Local signup route
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password || !firstName) {
        return res.status(400).json({ message: "필수 정보를 입력해주세요." });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "이미 가입된 이메일입니다." });
      }

      // Hash password (reduced rounds for faster processing)
      const hashedPassword = await bcrypt.hash(password, 8);

      // Create user
      const newUser = await storage.createLocalUser({
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || '',
        authType: 'local'
      });

      // Auto login after signup
      const userForSession = {
        claims: {
          sub: newUser.id,
          email: newUser.email,
          first_name: newUser.firstName,
          last_name: newUser.lastName,
          profile_image_url: newUser.profileImageUrl
        }
      };

      req.logIn(userForSession, (err) => {
        if (err) {
          return res.status(500).json({ message: "회원가입 후 로그인 처리 중 오류가 발생했습니다." });
        }
        return res.json({ message: "회원가입이 완료되었습니다.", user: userForSession.claims });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "회원가입 중 오류가 발생했습니다." });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  // Fast logout endpoint that returns JSON instead of redirect
  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "로그아웃되었습니다." });
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
};