// src/services/jwt.ts
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// Narrow the type so TypeScript is happy with expiresIn
const JWT_EXPIRES: SignOptions['expiresIn'] =
  (process.env.JWT_EXPIRES || '15m') as any;

// Shape of the data we put inside the token
export interface AccessTokenPayload {
  sub: number;          // user id
  email: string;
  role: 'ADMIN' | 'ASSOCIATE';
  iat?: number;         // added by jwt
  exp?: number;         // added by jwt
}

export function signAccess(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: JWT_EXPIRES,
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

export function verifyAccess(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET);

  // jwt.verify can return a string or an object; we only accept object
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }

  // We know at runtime this is the shape we put in the token
  return decoded as unknown as AccessTokenPayload;
}
