import { Router } from 'express';
import type { AuthedRequest } from '../auth';
import { requireAuth } from '../auth';
import type { Db } from '../db';
import { activity, exerciseStats, summary } from '../services/stats';
import { periodSchema, singleQuery } from '../validation';
import { asyncRoute } from './async';

export function statsRouter(db: Db): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/summary',
    asyncRoute(async (req, res) => {
      const period = periodSchema.safeParse(singleQuery(req.query.period));
      if (!period.success) {
        res.status(400).json({ error: 'validation' });
        return;
      }
      res.json(await summary(db, (req as AuthedRequest).userId, period.data));
    }),
  );

  router.get(
    '/activity',
    asyncRoute(async (req, res) => {
      const period = periodSchema.safeParse(singleQuery(req.query.period));
      if (!period.success) {
        res.status(400).json({ error: 'validation' });
        return;
      }
      res.json(await activity(db, (req as AuthedRequest).userId, period.data));
    }),
  );

  router.get(
    '/exercises',
    asyncRoute(async (req, res) => {
      const period = periodSchema.safeParse(singleQuery(req.query.period));
      if (!period.success) {
        res.status(400).json({ error: 'validation' });
        return;
      }
      const exercise = singleQuery(req.query.exercise);
      res.json(await exerciseStats(db, (req as AuthedRequest).userId, period.data, exercise));
    }),
  );

  return router;
}
