import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertScholarshipSchema, insertJobSchema, insertApplicationSchema, insertPartnerSchema, insertTestimonialSchema, insertBlogPostSchema, insertTeamMemberSchema, insertReferralSchema, insertAnalyticsSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { getChatResponse } from "./ai";

const JWT_SECRET = process.env.JWT_SECRET!;

// Authentication middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'subscribe') {
          (ws as any).subscriptions = data.channels || [];
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (channel: string, data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const subscriptions = (client as any).subscriptions || [];
        if (subscriptions.includes(channel)) {
          client.send(JSON.stringify({ channel, data }));
        }
      }
    });
  };

  // Authentication routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log analytics
      await storage.logAnalytics({
        event: 'user_registered',
        userId: user.id,
        metadata: { email: user.email, role: user.role }
      });

      broadcast('user_activity', { type: 'user_registered', user: { id: user.id, email: user.email } });

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: 'Registration failed', error: error.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Find user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log analytics
      await storage.logAnalytics({
        event: 'user_logged_in',
        userId: user.id,
        metadata: { email: user.email }
      });

      broadcast('user_activity', { type: 'user_logged_in', user: { id: user.id, email: user.email } });

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed', error: error.message });
    }
  });

  // User profile route
  app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profilePicture: user.profilePicture,
        phone: user.phone,
        dateOfBirth: user.dateOfBirth,
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch profile' });
    }
  });

  // Scholarships routes
  app.get('/api/scholarships', async (req, res) => {
    try {
      const scholarships = await storage.getActiveScholarships();
      res.json(scholarships);
    } catch (error) {
      console.error('Scholarships fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch scholarships' });
    }
  });

  app.get('/api/scholarships/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const scholarships = await storage.searchScholarships(q);
      res.json(scholarships);
    } catch (error) {
      console.error('Scholarship search error:', error);
      res.status(500).json({ message: 'Failed to search scholarships' });
    }
  });

  app.post('/api/scholarships', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const scholarshipData = insertScholarshipSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const scholarship = await storage.createScholarship(scholarshipData);
      broadcast('scholarships', { type: 'scholarship_created', scholarship });
      
      res.status(201).json(scholarship);
    } catch (error) {
      console.error('Scholarship creation error:', error);
      res.status(400).json({ message: 'Failed to create scholarship', error: error.message });
    }
  });

  app.put('/api/scholarships/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertScholarshipSchema.partial().parse(req.body);
      
      const scholarship = await storage.updateScholarship(id, updateData);
      broadcast('scholarships', { type: 'scholarship_updated', scholarship });
      
      res.json(scholarship);
    } catch (error) {
      console.error('Scholarship update error:', error);
      res.status(400).json({ message: 'Failed to update scholarship', error: error.message });
    }
  });

  app.delete('/api/scholarships/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteScholarship(id);
      
      if (success) {
        broadcast('scholarships', { type: 'scholarship_deleted', id });
        res.json({ message: 'Scholarship deleted successfully' });
      } else {
        res.status(404).json({ message: 'Scholarship not found' });
      }
    } catch (error) {
      console.error('Scholarship deletion error:', error);
      res.status(500).json({ message: 'Failed to delete scholarship' });
    }
  });

  // Jobs routes
  app.get('/api/jobs', async (req, res) => {
    try {
      const jobs = await storage.getActiveJobs();
      res.json(jobs);
    } catch (error) {
      console.error('Jobs fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch jobs' });
    }
  });

  app.get('/api/jobs/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' });
      }
      
      const jobs = await storage.searchJobs(q);
      res.json(jobs);
    } catch (error) {
      console.error('Job search error:', error);
      res.status(500).json({ message: 'Failed to search jobs' });
    }
  });

  app.post('/api/jobs', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const jobData = insertJobSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      
      const job = await storage.createJob(jobData);
      broadcast('jobs', { type: 'job_created', job });
      
      res.status(201).json(job);
    } catch (error) {
      console.error('Job creation error:', error);
      res.status(400).json({ message: 'Failed to create job', error: error.message });
    }
  });

  app.put('/api/jobs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertJobSchema.partial().parse(req.body);
      
      const job = await storage.updateJob(id, updateData);
      broadcast('jobs', { type: 'job_updated', job });
      
      res.json(job);
    } catch (error) {
      console.error('Job update error:', error);
      res.status(400).json({ message: 'Failed to update job', error: error.message });
    }
  });

  app.delete('/api/jobs/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteJob(id);
      
      if (success) {
        broadcast('jobs', { type: 'job_deleted', id });
        res.json({ message: 'Job deleted successfully' });
      } else {
        res.status(404).json({ message: 'Job not found' });
      }
    } catch (error) {
      console.error('Job deletion error:', error);
      res.status(500).json({ message: 'Failed to delete job' });
    }
  });

  // Applications routes
  app.get('/api/applications', authenticateToken, async (req, res) => {
    try {
      const applications = req.user.role === 'admin' || req.user.role === 'super_admin' 
        ? await storage.getAllApplications()
        : await storage.getUserApplications(req.user.id);
      
      res.json(applications);
    } catch (error) {
      console.error('Applications fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch applications' });
    }
  });

  app.post('/api/applications', authenticateToken, async (req, res) => {
    try {
      const applicationData = insertApplicationSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const application = await storage.createApplication(applicationData);
      broadcast('applications', { type: 'application_created', application });
      
      // Log analytics
      await storage.logAnalytics({
        event: 'application_submitted',
        userId: req.user.id,
        metadata: { 
          type: applicationData.type,
          referenceId: applicationData.referenceId 
        }
      });
      
      res.status(201).json(application);
    } catch (error) {
      console.error('Application creation error:', error);
      res.status(400).json({ message: 'Failed to create application', error: error.message });
    }
  });

  app.put('/api/applications/:id', authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertApplicationSchema.partial().parse(req.body);
      
      // Check if user owns the application or is admin
      const existingApplication = await storage.getApplication(id);
      if (!existingApplication) {
        return res.status(404).json({ message: 'Application not found' });
      }
      
      if (existingApplication.userId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
        return res.status(403).json({ message: 'Not authorized to update this application' });
      }
      
      const application = await storage.updateApplication(id, updateData);
      broadcast('applications', { type: 'application_updated', application });
      
      res.json(application);
    } catch (error) {
      console.error('Application update error:', error);
      res.status(400).json({ message: 'Failed to update application', error: error.message });
    }
  });

  // Partners routes
  app.get('/api/partners', async (req, res) => {
    try {
      const partners = await storage.getActivePartners();
      res.json(partners);
    } catch (error) {
      console.error('Partners fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch partners' });
    }
  });

  app.post('/api/partners', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const partnerData = insertPartnerSchema.parse(req.body);
      const partner = await storage.createPartner(partnerData);
      broadcast('partners', { type: 'partner_created', partner });
      
      res.status(201).json(partner);
    } catch (error) {
      console.error('Partner creation error:', error);
      res.status(400).json({ message: 'Failed to create partner', error: error.message });
    }
  });

  // Testimonials routes
  app.get('/api/testimonials', async (req, res) => {
    try {
      const testimonials = await storage.getApprovedTestimonials();
      res.json(testimonials);
    } catch (error) {
      console.error('Testimonials fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch testimonials' });
    }
  });

  app.post('/api/testimonials', authenticateToken, async (req, res) => {
    try {
      const testimonialData = insertTestimonialSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const testimonial = await storage.createTestimonial(testimonialData);
      broadcast('testimonials', { type: 'testimonial_created', testimonial });
      
      res.status(201).json(testimonial);
    } catch (error) {
      console.error('Testimonial creation error:', error);
      res.status(400).json({ message: 'Failed to create testimonial', error: error.message });
    }
  });

  // Blog posts routes
  app.get('/api/blog-posts', async (req, res) => {
    try {
      const blogPosts = await storage.getPublishedBlogPosts();
      res.json(blogPosts);
    } catch (error) {
      console.error('Blog posts fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch blog posts' });
    }
  });

  app.post('/api/blog-posts', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const blogPostData = insertBlogPostSchema.parse({
        ...req.body,
        authorId: req.user.id,
      });
      
      const blogPost = await storage.createBlogPost(blogPostData);
      broadcast('blog-posts', { type: 'blog_post_created', blogPost });
      
      res.status(201).json(blogPost);
    } catch (error) {
      console.error('Blog post creation error:', error);
      res.status(400).json({ message: 'Failed to create blog post', error: error.message });
    }
  });

  // Team members routes
  app.get('/api/team-members', async (req, res) => {
    try {
      const teamMembers = await storage.getActiveTeamMembers();
      res.json(teamMembers);
    } catch (error) {
      console.error('Team members fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch team members' });
    }
  });

  app.post('/api/team-members', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const teamMemberData = insertTeamMemberSchema.parse(req.body);
      const teamMember = await storage.createTeamMember(teamMemberData);
      broadcast('team-members', { type: 'team_member_created', teamMember });
      
      res.status(201).json(teamMember);
    } catch (error) {
      console.error('Team member creation error:', error);
      res.status(400).json({ message: 'Failed to create team member', error: error.message });
    }
  });

  // Referrals routes
  app.get('/api/referrals', authenticateToken, async (req, res) => {
    try {
      const referrals = await storage.getUserReferrals(req.user.id);
      res.json(referrals);
    } catch (error) {
      console.error('Referrals fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch referrals' });
    }
  });

  app.post('/api/referrals', authenticateToken, async (req, res) => {
    try {
      const referralData = insertReferralSchema.parse({
        ...req.body,
        referrerId: req.user.id,
      });
      
      const referral = await storage.createReferral(referralData);
      broadcast('referrals', { type: 'referral_created', referral });
      
      res.status(201).json(referral);
    } catch (error) {
      console.error('Referral creation error:', error);
      res.status(400).json({ message: 'Failed to create referral', error: error.message });
    }
  });

  // Analytics routes
  app.get('/api/analytics/summary', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const summary = await storage.getAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics summary' });
    }
  });

  app.get('/api/analytics', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const analytics = await storage.getAnalytics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(analytics);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch analytics' });
    }
  });

  // AI Chat route
  app.post('/api/chat', async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ message: 'Message is required' });
      }

      const response = await getChatResponse(message);
      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ message: 'Failed to get chat response', error: error.message });
    }
  });

  return httpServer;
}
