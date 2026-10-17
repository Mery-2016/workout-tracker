import express, { type NextFunction, type Request, type Response } from 'express';
import { openDatabase } from './db';
import { statsRouter } from './routes/stats';
import { workoutsRouter } from './routes/workouts';

export function createApp(dbPath: string) {
  const db = openDatabase(dbPath);
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get() as { ok: number };
    const foreignKeys = Number(db.pragma('foreign_keys', { simple: true }));
    res.json({
      ok: row.ok === 1,
      database: 'ok',
      foreign_keys: foreignKeys === 1,
    });
  });

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
