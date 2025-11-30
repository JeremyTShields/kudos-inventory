// src/controllers/auth.controller.ts
import { Request, Response } from 'express';
import { sequelize } from '../models';
import { hash, compare } from '../services/hash';
import { signAccess, AccessTokenPayload } from '../services/jwt';
import { logAudit } from '../services/auditLog';

const { User } = sequelize.models;

export async function register(req: Request, res: Response) {
  const { name, email, password, role } = req.body as {
    name: string;
    email: string;
    password: string;
    role?: 'ADMIN' | 'ASSOCIATE';
  };

  const passwordHash = await hash(password);

  const newUser = await User.create({
    name,
    email,
    passwordHash,
    role: role || 'ASSOCIATE',
  });

  // Cast to any here to satisfy TS
  const id = (newUser as any).id as number;

  // Log audit - use the creating user's ID if available, otherwise the new user's ID
  const actorId = (req as any).user?.sub || id;
  await logAudit({
    userId: actorId,
    action: 'CREATE',
    entityType: 'USER',
    entityId: id,
    description: `Created user account for ${email} with role ${role || 'ASSOCIATE'}`,
    metadata: { email, role: role || 'ASSOCIATE' }
  });

  return res.status(201).json({ id });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };

  const user = await User.findOne({ where: { email } });

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const ok = await compare(
    password,
    user.get('passwordHash') as string
  );

  if (!ok) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const payload: AccessTokenPayload = {
    sub: (user as any).id as number,            // cast for TS
    email: user.get('email') as string,
    role: user.get('role') as 'ADMIN' | 'ASSOCIATE',
  };

  const accessToken = signAccess(payload);

  // Log audit
  await logAudit({
    userId: payload.sub,
    action: 'LOGIN',
    entityType: 'USER',
    entityId: payload.sub,
    description: `User logged in: ${email}`,
    metadata: { email, role: payload.role }
  });

  return res.json({ accessToken });
}

export async function getAllUsers(req: Request, res: Response) {
  const users = await User.findAll({
    attributes: ['id', 'name', 'email', 'role', 'createdAt'],
    order: [['createdAt', 'DESC']]
  });

  return res.json(users);
}

export async function changePassword(req: Request, res: Response) {
  const { userId } = req.params;
  const { password } = req.body as { password: string };

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const passwordHash = await hash(password);
  await user.update({ passwordHash });

  // Log audit
  const actorId = (req as any).user?.sub || parseInt(userId);
  await logAudit({
    userId: actorId,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: parseInt(userId),
    description: `Changed password for user #${userId}`,
    metadata: { userId }
  });

  return res.json({ message: 'Password updated successfully' });
}

export async function updateUser(req: Request, res: Response) {
  const { userId } = req.params;
  const { name, email, role } = req.body as { name?: string; email?: string; role?: string };

  const user = await User.findByPk(userId);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Check if email already exists for another user
  if (email && email !== user.get('email')) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
  }

  await user.update({
    ...(name && { name }),
    ...(email && { email }),
    ...(role && { role })
  });

  // Log audit
  const actorId = (req as any).user?.sub || parseInt(userId);
  await logAudit({
    userId: actorId,
    action: 'UPDATE',
    entityType: 'USER',
    entityId: parseInt(userId),
    description: `Updated user #${userId}: ${[name && 'name', email && 'email', role && 'role'].filter(Boolean).join(', ')}`,
    metadata: { userId, updates: { name, email, role } }
  });

  return res.json(user);
}
