import { Request, Response, NextFunction } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../env";
import { storage } from "../storage";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

type AuthTokenPayload = JwtPayload & {
  id?: string | number;
  userId?: string | number;
  role?: string;
};

const getTokenUserId = (decoded: string | JwtPayload) => {
  if (typeof decoded === "string") return null;
  const payload = decoded as AuthTokenPayload;
  const rawUserId = payload.userId ?? payload.id;
  const userId = Number(rawUserId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
};

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userId = getTokenUserId(decoded);
    
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const requireAdminRole = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }

  next();
};

export const requireEditorRole = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const allowedRoles = ['writer', 'editor', 'admin', 'super_admin'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Writer access required' });
  }

  next();
};

export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }

  next();
};

export const requireModerator = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const moderatorRoles = ['moderator', 'admin', 'super_admin'];
  if (!moderatorRoles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Moderator access required' });
  }

  next();
};
