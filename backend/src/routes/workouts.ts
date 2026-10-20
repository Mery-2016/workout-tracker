import { Router } from 'express';
import { ZodError } from 'zod';
import type { AuthedRequest } from '../auth';
import { requireAuth } from '../auth';
import { isRealDate } from '../dates';
import type { Db } from '../db';
import { deleteWorkout, createWorkout, getWorkout, listWorkouts, updateWorkout } from '../services/workouts';
import { listQuerySchema, parseWorkoutBody, singleQuery } from '../validation';
import { asyncRoute } from './async';

function idParam(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

export function workoutsRouter(db: Db): Router {
  const router = Router();
  router.use(requireAuth);

  router.get(
    '/',
    asyncRoute(async (req, res) => {
      const parsed = listQuerySchema.safeParse({
        search: singleQuery(req.query.search),
        type: singleQuery(req.query.type),
        from: singleQuery(req.query.from),
        to: singleQuery(req.query.to),
        sort: singleQuery(req.query.sort),
        page: singleQuery(req.query.page),
        limit: singleQuery(req.query.limit),
      });
      if (!parsed.success) {
        res.status(400).json({ error: 'validation' });
        return;
      }
      const filters = parsed.data;
      if ((filters.from && !isRealDate(filters.from)) || (filters.to && !isRealDate(filters.to))) {
        res.status(400).json({ error: 'date_invalid' });
        return;
      }
      res.json(await listWorkouts(db, (req as AuthedRequest).userId, filters));
    }),
  );

  router.get(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = idParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'validation' });
        return;
      }
      const workout = await getWorkout(db, (req as AuthedRequest).userId, id);
      if (!workout) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json(workout);
    }),
  );

  router.post(
    '/',
    asyncRoute(async (req, res) => {
      try {
        const input = parseWorkoutBody(req.body);
        const created = await createWorkout(db, (req as AuthedRequest).userId, input);
        res.status(201).json(created);
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ error: 'validation' });
          return;
        }
        throw error;
      }
    }),
  );

  router.put(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = idParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'validation' });
        return;
      }
      try {
        const input = parseWorkoutBody(req.body);
        const updated = await updateWorkout(db, (req as AuthedRequest).userId, id, input);
        if (!updated) {
          res.status(404).json({ error: 'not_found' });
          return;
        }
        res.json(updated);
      } catch (error) {
        if (error instanceof ZodError) {
          res.status(400).json({ error: 'validation' });
          return;
        }
        throw error;
      }
    }),
  );

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      const id = idParam(req.params.id);
      if (!id) {
        res.status(400).json({ error: 'validation' });
        return;
      }
      const removed = await deleteWorkout(db, (req as AuthedRequest).userId, id);
      if (!removed) {
        res.status(404).json({ error: 'not_found' });
        return;
      }
      res.json({ ok: true });
    }),
  );

  return router;
}
