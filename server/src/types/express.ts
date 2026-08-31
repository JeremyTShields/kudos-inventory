import type { AccessTokenPayload } from '../services/jwt';

// requireAuth attaches the verified token payload to the request;
// this makes req.user available without casts across controllers.
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

export {};
