import { Router } from 'express';
import type Database from 'better-sqlite3';
import { activity, exerciseStats, summary } from '../services/stats';
import { periodSchema, singleQuery } from '../validation';

export function statsRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/summary', (req, res) => {
    const period = periodSchema.safeParse(singleQuery(req.query.period));
    if (!period.success) {
      res.status(400).json({ error: 'validation' });
      return;
    }
    res.json(summary(db, period.data));
  });

  router.get('/activity', (req, res) => {
    const period = periodSchema.safeParse(singleQuery(req.query.period));
    if (!period.success) {
      res.status(400).json({ error: 'validation' });
      return;
    }
    res.json(activity(db, period.data));
  });

  router.get('/exercises', (req, res) => {
    const period = periodSchema.safeParse(singleQuery(req.query.period));
    if (!period.success) {
      res.status(400).json({ error: 'validation' });
      return;
    }
    const exercise = singleQuery(req.query.exercise);
    res.json(exerciseStats(db, period.data, exercise));
  });

  return router;
}
