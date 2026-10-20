import { Router } from 'express';
import { ZodError } from 'zod';
import {
  checkPassword,
  clearSessionCookie,
  hashPassword,
  requireAuth,
  setSessionCookie,
  signSession,
  type AuthedRequest,
} from '../auth';
import type { Db } from '../db';
import { isUniqueViolation } from '../db';
import { loginSchema, registerSchema } from '../validation';
import { asyncRoute } from './async';

interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash?: string;
}

function publicUser(row: UserRow) {
  return { id: Number(row.id), email: row.email, name: row.name };
}

export function authRouter(db: Db): Router {
  const router = Router();

  router.post(
    '/register',
    asyncRoute(async (req, res) => {
      try {
        const input = registerSchema.parse(req.body);
        const passwordHash = await hashPassword(input.password);
        const createdAt = new Date().toISOString();
        const rows = await db.query<UserRow>(
          `INSERT INTO users (email, password_hash, name, created_at)
           VALUES ($1, $2, $3, $4)
           RETURNING id, email, name`,
          [input.email, passwordHash, input.name, createdAt],
        );
        const user = publicUser(rows[0]);
        setSessionCookie(res, signSession(user.id));
        res.status(201).json(user);
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ error: 'validation' });
          return;
        }
        if (isUniqueViolation(error)) {
          res.status(409).json({ error: 'email_taken' });
          return;
        }
        throw error;
      }
    }),
  );

  router.post(
    '/login',
    asyncRoute(async (req, res) => {
      try {
        const input = loginSchema.parse(req.body);
        const rows = await db.query<UserRow>(
          'SELECT id, email, name, password_hash FROM users WHERE email = $1',
          [input.email],
        );
        const user = rows[0];
        if (!user || !user.password_hash || !(await checkPassword(input.password, user.password_hash))) {
          res.status(401).json({ error: 'invalid_login' });
          return;
        }
        setSessionCookie(res, signSession(Number(user.id)));
        res.json(publicUser(user));
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ error: 'validation' });
          return;
        }
        throw error;
      }
    }),
  );

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.get(
    '/me',
    requireAuth,
    asyncRoute(async (req, res) => {
      const userId = (req as AuthedRequest).userId;
      const rows = await db.query<UserRow>('SELECT id, email, name FROM users WHERE id = $1', [userId]);
      if (!rows[0]) {
        clearSessionCookie(res);
        res.status(401).json({ error: 'unauthorized' });
        return;
      }
      res.json(publicUser(rows[0]));
    }),
  );

  return router;
}
