import { Router } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { requireAuth, requireAdminRole, requireSuperAdmin, requireEditorRole } from "./middleware/auth";
import { uploadMiddleware, processImage, generateImageSizes, isValidImageFile, removeUploadedFile } from "./services/upload";
import { moderateContent, generateContentSuggestions, analyzeChatConversation } from "./services/openai";
import {
  insertUserSchema,
  insertScholarshipSchema,
  insertJobOpportunitySchema,
  insertPartnerInstitutionSchema,
  insertBlogPostSchema,
  insertTeamMemberSchema,
  insertApplicationSchema,
  insertSettingsSchema,
} from "@shared/schema";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import path from "path";
import { createServer } from "http";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required for admin routes");
}
const PASSWORD_HASH_ROUNDS = 12;
const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128, "Password must be 128 characters or fewer")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol")
  .refine((password) => !/admin123|password|qwerty|mtendere/i.test(password), "Password is too common");

// Helper function to validate request body
const validateBody = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      next(error);
    }
  };
};

const requireAuthWithUser = (req: any, res: any, next: any) => {
  requireAuth(req, res, () => {
    next();
  });
};

// Authentication routes
router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in HTTP-only cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Update last login
    await storage.updateUser(user.id, { lastLogin: new Date() } as any);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profileImage: user.profileImage,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
});

router.post("/auth/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token missing" });
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const newToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
});

router.get("/api/user", requireAuth, (req: any, res) => {
  res.json(req.user);
});

router.post("/auth/register", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Self-service admin registration is disabled" });
    }

    const { username, email, password, firstName, lastName } = req.body;
    const role = ["viewer", "writer"].includes(req.body?.role) ? req.body.role : "viewer";

    if (!username || !password || !email) {
      return res.status(400).json({ message: "Required fields missing" });
    }
    strongPasswordSchema.parse(password);

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
    });

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Registration validation error:", JSON.stringify(error.flatten()));
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Admin Dashboard
router.get("/api/admin/dashboard/stats", requireAuth, requireAdminRole, async (req, res) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Failed to fetch dashboard statistics" });
  }
});

router.get("/api/admin/dashboard/recent-activity", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json({ activity: stats.recentActivity, total: stats.recentActivity.length });
  } catch (error) {
    console.error("Recent activity error:", error);
    res.status(500).json({ message: "Failed to fetch recent activity" });
  }
});

// Users Management
router.get("/api/admin/users", requireAuth as any, requireSuperAdmin as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    
    const offset = (page - 1) * limit;
    const result = await storage.getUsers(limit, offset, search);
    
    res.json(result);
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

router.get("/api/admin/users/:id", requireAuth as any, requireSuperAdmin as any, async (req: any, res) => {
  try {
    const user = await storage.getUser(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

router.put("/api/admin/users/:id", requireAuth as any, requireSuperAdmin as any, validateBody(insertUserSchema.partial()), async (req: any, res) => {
  try {
    const user = await storage.updateUser(req.params.id, req.validatedBody);
    res.json(user);
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
});

router.delete("/api/admin/users/:id", requireAuth as any, requireSuperAdmin as any, async (req: any, res) => {
  try {
    await storage.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// Scholarships Management
router.get("/api/admin/scholarships", requireAuth as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    
    const offset = (page - 1) * limit;
    const result = await storage.getScholarships(limit, offset, search, status);
    
    res.json(result);
  } catch (error) {
    console.error("Get scholarships error:", error);
    res.status(500).json({ message: "Failed to fetch scholarships" });
  }
});

router.post("/api/admin/scholarships", requireAuth as any, requireEditorRole as any, validateBody(insertScholarshipSchema), async (req: any, res) => {
  try {
    const scholarship = await storage.createScholarship(req.validatedBody, req.user.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/scholarships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scholarship)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(201).json(scholarship);
  } catch (error) {
    console.error("Create scholarship error:", error);
    res.status(500).json({ message: "Failed to create scholarship" });
  }
});

router.put("/api/admin/scholarships/:id", requireAuth as any, requireEditorRole as any, validateBody(insertScholarshipSchema.partial()), async (req: any, res) => {
  try {
    const scholarship = await storage.updateScholarship(req.params.id, req.validatedBody);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/scholarships/${req.params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scholarship)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.json(scholarship);
  } catch (error) {
    console.error("Update scholarship error:", error);
    res.status(500).json({ message: "Failed to update scholarship" });
  }
});

router.delete("/api/admin/scholarships/:id", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    await storage.deleteScholarship(req.params.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/scholarships/${req.params.id}`, {
          method: "DELETE"
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete scholarship error:", error);
    res.status(500).json({ message: "Failed to delete scholarship" });
  }
});

// Jobs Management
router.get("/api/admin/jobs", requireAuth as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    
    const offset = (page - 1) * limit;
    const result = await storage.getJobOpportunities(limit, offset, search, status);
    
    res.json(result);
  } catch (error) {
    console.error("Get jobs error:", error);
    res.status(500).json({ message: "Failed to fetch job opportunities" });
  }
});

router.post("/api/admin/jobs", requireAuth as any, requireEditorRole as any, validateBody(insertJobOpportunitySchema), async (req: any, res) => {
  try {
    const job = await storage.createJobOpportunity(req.validatedBody, req.user.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(job)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(201).json(job);
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({ message: "Failed to create job opportunity" });
  }
});

router.put("/api/admin/jobs/:id", requireAuth as any, requireEditorRole as any, validateBody(insertJobOpportunitySchema.partial()), async (req: any, res) => {
  try {
    const job = await storage.updateJobOpportunity(req.params.id, req.validatedBody);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/jobs/${req.params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(job)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.json(job);
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({ message: "Failed to update job opportunity" });
  }
});

router.delete("/api/admin/jobs/:id", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    await storage.deleteJobOpportunity(req.params.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/jobs/${req.params.id}`, {
          method: "DELETE"
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({ message: "Failed to delete job opportunity" });
  }
});

// Partners Management
router.get("/api/admin/partners", requireAuth as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    
    const offset = (page - 1) * limit;
    const result = await storage.getPartnerInstitutions(limit, offset, search);
    
    res.json(result);
  } catch (error) {
    console.error("Get partners error:", error);
    res.status(500).json({ message: "Failed to fetch partner institutions" });
  }
});

router.post("/api/admin/partners", requireAuth as any, requireEditorRole as any, validateBody(insertPartnerInstitutionSchema), async (req: any, res) => {
  try {
    const partner = await storage.createPartnerInstitution(req.validatedBody, req.user.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/partners`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partner)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(201).json(partner);
  } catch (error) {
    console.error("Create partner error:", error);
    res.status(500).json({ message: "Failed to create partner institution" });
  }
});

router.put("/api/admin/partners/:id", requireAuth as any, requireEditorRole as any, validateBody(insertPartnerInstitutionSchema.partial()), async (req: any, res) => {
  try {
    const partner = await storage.updatePartnerInstitution(req.params.id, req.validatedBody);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/partners/${req.params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(partner)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.json(partner);
  } catch (error) {
    console.error("Update partner error:", error);
    res.status(500).json({ message: "Failed to update partner institution" });
  }
});

router.delete("/api/admin/partners/:id", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    await storage.deletePartnerInstitution(req.params.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/partners/${req.params.id}`, {
          method: "DELETE"
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete partner error:", error);
    res.status(500).json({ message: "Failed to delete partner institution" });
  }
});

// Blog Management
router.get("/api/admin/blog", requireAuth as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    
    const offset = (page - 1) * limit;
    const result = await storage.getBlogPosts(limit, offset, search, status);
    
    res.json(result);
  } catch (error) {
    console.error("Get blog posts error:", error);
    res.status(500).json({ message: "Failed to fetch blog posts" });
  }
});

router.post("/api/admin/blog", requireAuth as any, requireEditorRole as any, validateBody(insertBlogPostSchema), async (req: any, res) => {
  try {
    const post = await storage.createBlogPost(req.validatedBody, req.user.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/blog`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(post)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(201).json(post);
  } catch (error) {
    console.error("Create blog post error:", error);
    res.status(500).json({ message: "Failed to create blog post" });
  }
});

router.put("/api/admin/blog/:id", requireAuth as any, requireEditorRole as any, validateBody(insertBlogPostSchema.partial()), async (req: any, res) => {
  try {
    const post = await storage.updateBlogPost(req.params.id, req.validatedBody);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/blog/${req.params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(post)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.json(post);
  } catch (error) {
    console.error("Update blog post error:", error);
    res.status(500).json({ message: "Failed to update blog post" });
  }
});

router.delete("/api/admin/blog/:id", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    await storage.deleteBlogPost(req.params.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/blog/${req.params.id}`, {
          method: "DELETE"
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete blog post error:", error);
    res.status(500).json({ message: "Failed to delete blog post" });
  }
});

// Team Management
router.get("/api/admin/team", requireAuth as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    
    const offset = (page - 1) * limit;
    const result = await storage.getTeamMembers(limit, offset, search);
    
    res.json(result);
  } catch (error) {
    console.error("Get team members error:", error);
    res.status(500).json({ message: "Failed to fetch team members" });
  }
});

router.post("/api/admin/team", requireAuth as any, requireEditorRole as any, validateBody(insertTeamMemberSchema), async (req: any, res) => {
  try {
    const member = await storage.createTeamMember(req.validatedBody, req.user.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/team`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(member)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(201).json(member);
  } catch (error) {
    console.error("Create team member error:", error);
    res.status(500).json({ message: "Failed to create team member" });
  }
});

router.put("/api/admin/team/:id", requireAuth as any, requireEditorRole as any, validateBody(insertTeamMemberSchema.partial()), async (req: any, res) => {
  try {
    const member = await storage.updateTeamMember(req.params.id, req.validatedBody);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/team/${req.params.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(member)
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.json(member);
  } catch (error) {
    console.error("Update team member error:", error);
    res.status(500).json({ message: "Failed to update team member" });
  }
});

router.delete("/api/admin/team/:id", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    await storage.deleteTeamMember(req.params.id);
    
    // Sync to external website
    const syncUrl = process.env.EXTERNAL_SITE_URL;
    if (syncUrl) {
      try {
        await fetch(`${syncUrl}/api/sync/team/${req.params.id}`, {
          method: "DELETE"
        });
      } catch (syncError) {
        console.error("External sync error:", syncError);
      }
    }

    res.status(204).send();
  } catch (error) {
    console.error("Delete team member error:", error);
    res.status(500).json({ message: "Failed to delete team member" });
  }
});

// Application Routes
router.get("/api/admin/applications", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";
    
    const offset = (page - 1) * limit;
    const result = await storage.getApplications(limit, offset, search, status);
    
    res.json(result);
  } catch (error) {
    console.error("Get applications error:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

router.put("/api/admin/applications/:id", requireAuth as any, requireAdminRole as any, validateBody(insertApplicationSchema.partial()), async (req: any, res) => {
  try {
    const application = await storage.updateApplication(req.params.id, {
      ...req.validatedBody,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    });
    res.json(application);
  } catch (error) {
    console.error("Update application error:", error);
    res.status(500).json({ message: "Failed to update application" });
  }
});

// AI Chat Monitoring Routes (Ensuring Role Protection)
router.get("/api/admin/ai-chat/conversations", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const offset = (page - 1) * limit;
    const result = await storage.getChatConversations(limit, offset);
    
    res.json(result);
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ message: "Failed to fetch chat conversations" });
  }
});

router.get("/api/admin/ai-chat/conversations/:id", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    const conversation = await storage.getChatConversation(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }
    res.json(conversation);
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ message: "Failed to fetch conversation" });
  }
});

// Roles Management
router.get("/api/admin/roles", requireAuth as any, requireSuperAdmin as any, async (req: any, res) => {
  try {
    const result = await storage.getRoles();
    res.json(result);
  } catch (error) {
    console.error("Get roles error:", error);
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

router.post("/api/admin/roles", requireAuth as any, requireSuperAdmin as any, async (req: any, res) => {
  try {
    const { name, description, permissions } = req.body;
    if (!name) return res.status(400).json({ message: "Role name is required" });
    const role = await storage.createRole({ name, description: description || "", permissions: permissions || [] });
    res.status(201).json(role);
  } catch (error) {
    console.error("Create role error:", error);
    res.status(500).json({ message: "Failed to create role" });
  }
});

router.put("/api/admin/roles/:id", requireAuth as any, requireSuperAdmin as any, async (req: any, res) => {
  try {
    const { name, description, permissions } = req.body;
    const role = await storage.updateRole(req.params.id, { name, description, permissions });
    res.json(role);
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ message: "Failed to update role" });
  }
});

router.delete("/api/admin/roles/:id", requireAuth as any, requireSuperAdmin as any, async (req: any, res) => {
  try {
    await storage.deleteRole(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Delete role error:", error);
    res.status(500).json({ message: "Failed to delete role" });
  }
});

// File Upload
router.post("/api/admin/upload", requireAuth as any, requireEditorRole as any, uploadMiddleware.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!isValidImageFile(req.file.path)) {
      await removeUploadedFile(req.file.path);
      return res.status(400).json({ message: "Uploaded file content does not match the declared image type." });
    }

    const filePath = `/uploads/${req.file.filename}`;
    
    // If it's an image, process it
    if (req.file.mimetype.startsWith('image/')) {
      try {
        const processedPath = await processImage(req.file.path);
        const sizes = await generateImageSizes(req.file.path);
        
        // Sync to external website if scholarship/blog/etc
        const syncUrl = process.env.EXTERNAL_SITE_URL;
        if (syncUrl) {
          try {
            await fetch(`${syncUrl}/api/sync/upload`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                url: filePath,
                filename: req.file.filename,
                mimetype: req.file.mimetype
              })
            });
          } catch (syncError) {
            console.error("External sync error:", syncError);
          }
        }
        
        res.json({
          url: filePath,
          processedUrl: processedPath.replace(process.cwd(), ''),
          sizes: Object.fromEntries(
            Object.entries(sizes).map(([key, path]) => [key, path.replace(process.cwd(), '')])
          ),
          originalName: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype,
        });
      } catch (error) {
        console.error("Image processing error:", error);
        // Return original file if processing fails
        res.json({
          url: filePath,
          originalName: req.file.originalname,
          size: req.file.size,
          type: req.file.mimetype,
        });
      }
    } else {
      res.json({
        url: filePath,
        originalName: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

// Platform Settings Routes
router.get("/api/admin/settings", requireAuth as any, requireSuperAdmin as any, async (req: any, res) => {
  try {
    const settings = await storage.getSettings();
    res.json(settings);
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ message: "Failed to fetch platform settings" });
  }
});

router.put("/api/admin/settings", requireAuth as any, requireSuperAdmin as any, validateBody(insertSettingsSchema.partial()), async (req: any, res) => {
  try {
    const settings = await storage.updateSettings(req.validatedBody);
    res.json(settings);
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ message: "Failed to update platform settings" });
  }
});

// AI Content Moderation
router.post("/api/admin/moderate", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const result = await moderateContent(content);
    res.json(result);
  } catch (error) {
    console.error("Content moderation error:", error);
    res.status(500).json({ message: "Failed to moderate content" });
  }
});

// AI Content Suggestions
router.post("/api/admin/suggestions", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    const { topic, contentType } = req.body;
    if (!topic || !contentType) {
      return res.status(400).json({ message: "Topic and content type are required" });
    }

    const suggestions = await generateContentSuggestions(topic, contentType);
    res.json({ suggestions });
  } catch (error) {
    console.error("Content suggestions error:", error);
    res.status(500).json({ message: "Failed to generate content suggestions" });
  }
});

// Notifications
router.get("/api/admin/notifications", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const offset = (page - 1) * limit;
    const result = await storage.getAdminNotifications(limit, offset, req.user.id);
    
    res.json(result);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

router.put("/api/admin/notifications/:id/read", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    await storage.markNotificationAsRead(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// Audit Logs
router.get("/api/admin/audit-logs", requireAuth as any, requireAdminRole as any, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const userId = req.query.userId as string;
    const entityType = req.query.entityType as string;
    
    const offset = (page - 1) * limit;
    const result = await storage.getAuditLogs(limit, offset, userId, entityType);
    
    res.json(result);
  } catch (error) {
    console.error("Get audit logs error:", error);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
});

// Serve uploaded files
router.use("/uploads", (req, res, next) => {
  // Basic security check
  const filePath = path.normalize(req.path);
  if (filePath.includes("..") || !filePath.startsWith("/")) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
});

export default router;

export function registerRoutes(app: any) {
  app.use(router);
  
  // Return the HTTP server for WebSocket setup
  const server = createServer(app);
  
  return server;
}
