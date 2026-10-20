import type { Express, Request, Response } from 'express';
import express from 'express';
import { createApp } from '../backend/src/app';
import { createPgDatabase } from '../backend/src/db';

let app: Express | null = null;

function application(): Express {
  if (app) return app;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const missing = express();
    missing.use((_req, res) => {
      res.status(500).json({ error: 'server' });
    });
    return missing;
  }
  app = createApp(createPgDatabase(connectionString)).app;
  return app;
}

export default function handler(req: Request, res: Response) {
  return application()(req, res);
}
