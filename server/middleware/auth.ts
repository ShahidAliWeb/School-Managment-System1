import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../src/types/index.ts';
import { store } from '../db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'gbps_kando_lund_jwt_secret_key_2026';

export interface JwtPayloadUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  linkedStudentIds: string[];
  linkedStaffId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayloadUser;
}

export function signToken(payload: JwtPayloadUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayloadUser;
    const liveUser = store.getState().users.find((u) => u.id === decoded.id);
    req.user = liveUser
      ? {
          id: liveUser.id,
          name: liveUser.name,
          email: liveUser.email,
          role: liveUser.role,
          linkedStudentIds: liveUser.linkedStudentIds,
          linkedStaffId: liveUser.linkedStaffId,
        }
      : decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(', ')}.`,
      });
      return;
    }
    next();
  };
}
