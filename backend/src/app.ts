import express, { type NextFunction, type Request, type Response } from 'express';
import type { Db } from './db';
import { ensureSchema } from './db';
import { authRouter } from './routes/auth';
import { statsRouter } from './routes/stats';
import { workoutsRouter } from './routes/workouts';

export function createApp(db: Db) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(async (_req, _res, next) => {
    try {
      await ensureSchema(db);
      next();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/health', async (_req, res, next) => {
    try {
      await db.query('SELECT 1 AS ok');
      res.json({
        ok: true,
        database: 'ok',
        foreign_keys: true,
      });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/auth', authRouter(db));
  app.use('/api/workouts', workoutsRouter(db));
  app.use('/api/stats', statsRouter(db));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError) {
      res.status(400).json({ error: 'invalid_json' });
      return;
    }
    console.error(error);
    res.status(500).json({ error: 'server' });
  });

  return { app, db };
}
