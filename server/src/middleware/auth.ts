import { Request, Response, NextFunction } from 'express';
import { verifyAccess, AccessTokenPayload } from '../services/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = header.slice(7); // remove "Bearer "

  try {
    const payload = verifyAccess(token);
    (req as any).user = payload as AccessTokenPayload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Alias for convenience
export const authenticate = requireAuth;

export function requireRole(required: 'ADMIN' | 'ASSOCIATE') {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AccessTokenPayload | undefined;

    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // ADMIN can do anything, otherwise must match exactly
    if (user.role === 'ADMIN' || user.role === required) {
      return next();
    }

    return res.status(403).json({ message: 'Forbidden' });
  };
}
