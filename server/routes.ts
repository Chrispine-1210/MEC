import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { storage } from "./storage";
import {
  insertUserSchema,
  insertScholarshipSchema,
  insertJobSchema,
  insertApplicationSchema,
  insertPartnerSchema,
  insertTestimonialSchema,
  insertBlogPostSchema,
  insertTeamMemberSchema,
  insertReferralSchema,
  insertAnalyticsSchema,
} from "@shared/schema";

import { getChatResponse } from "./ai";

/* =========================
   ENV SAFETY
========================= */

const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

/* =========================
   TYPES
========================= */

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/* =========================
   AUTH MIDDLEWARE
========================= */

const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = decoded as any;
    next();
  });
};

const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user || !["admin", "super_admin"].includes(req.user.role)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

/* =========================
   ROUTES REGISTRATION
========================= */

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  /* =========================
     WEBSOCKET SETUP
  ========================= */

  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    verifyClient: (info, done) => done(true)
  });

  wss.on("connection", (ws: WebSocket, req) => {
    const origin = req.headers.origin;

    if (
      NODE_ENV === "production" &&
      FRONTEND_URL &&
      origin !== FRONTEND_URL
    ) {
      ws.close();
      return;
    }

    (ws as any).subscriptions = [];

    ws.on("message", (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        if (data.type === "subscribe") {
          (ws as any).subscriptions = data.channels || [];
        }
      } catch {
        // ignore malformed messages
      }
    });
  });

  const broadcast = (channel: string, payload: any) => {
    wss.clients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        (client as any).subscriptions?.includes(channel)
      ) {
        client.send(JSON.stringify({ channel, data: payload }));
      }
    });
  };

  /* =========================
     AUTH ROUTES
  ========================= */

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      if (await storage.getUserByEmail(userData.email)) {
        return res.status(400).json({ message: "User already exists" });
      }

      const password = await bcrypt.hash(userData.password, 10);

      const user = await storage.createUser({
        ...userData,
        password,
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      await storage.logAnalytics({
        event: "user_registered",
        userId: user.id,
        metadata: { email: user.email },
      });

      broadcast("user_activity", { type: "registered", userId: user.id });

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (err: any) {
      res.status(400).json({
        message: "Registration failed",
        ...(NODE_ENV !== "production" && { error: err.message }),
      });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      await storage.logAnalytics({
        event: "user_logged_in",
        userId: user.id,
      });

      broadcast("user_activity", { type: "login", userId: user.id });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch {
      res.status(500).json({ message: "Login failed" });
    }
  });

  /* =========================
     USER
  ========================= */

  app.get("/api/user/profile", authenticateToken, async (req: AuthRequest, res) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  /* =========================
     GENERIC HELPERS
  ========================= */

  const adminCreate =
    (schema: any, createFn: Function, channel: string) =>
    async (req: AuthRequest, res: Response) => {
      try {
        const data = schema.parse({ ...req.body, createdBy: req.user!.id });
        const item = await createFn(data);
        broadcast(channel, item);
        res.status(201).json(item);
      } catch (err: any) {
        res.status(400).json({
          message: "Operation failed",
          ...(NODE_ENV !== "production" && { error: err.message }),
        });
      }
    };

  /* =========================
     SCHOLARSHIPS / JOBS / ETC
     (logic unchanged, just safer)
  ========================= */

  app.get("/api/scholarships", async (_, res) =>
    res.json(await storage.getActiveScholarships())
  );

  app.post(
    "/api/scholarships",
    authenticateToken,
    requireAdmin,
    adminCreate(insertScholarshipSchema, storage.createScholarship, "scholarships")
  );

  app.get("/api/jobs", async (_, res) =>
    res.json(await storage.getActiveJobs())
  );

  app.post(
    "/api/jobs",
    authenticateToken,
    requireAdmin,
    adminCreate(insertJobSchema, storage.createJob, "jobs")
  );

  /* =========================
     AI CHAT
  ========================= */

  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ message: "Message required" });
      const response = await getChatResponse(message);
      res.json({ response });
    } catch {
      res.status(500).json({ message: "AI service error" });
    }
  });

  return httpServer;
}
