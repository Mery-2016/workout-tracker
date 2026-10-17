import { Router } from 'express';
import type Database from 'better-sqlite3';
import { ZodError } from 'zod';
import { isRealDate } from '../dates';
import { deleteWorkout, createWorkout, getWorkout, listWorkouts, updateWorkout } from '../services/workouts';
import { listQuerySchema, parseWorkoutBody, singleQuery } from '../validation';

function idParam(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

export function workoutsRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (req, res) => {
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
    res.json(listWorkouts(db, filters));
  });

  router.get('/:id', (req, res) => {
    const id = idParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'validation' });
      return;
    }
    const workout = getWorkout(db, id);
    if (!workout) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json(workout);
  });

  router.post('/', (req, res) => {
    try {
      const input = parseWorkoutBody(req.body);
      const created = createWorkout(db, input);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: 'validation' });
        return;
      }
      throw error;
    }
  });

  router.put('/:id', (req, res) => {
    const id = idParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'validation' });
      return;
    }
    try {
      const input = parseWorkoutBody(req.body);
      const updated = updateWorkout(db, id, input);
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
  });

  router.delete('/:id', (req, res) => {
    const id = idParam(req.params.id);
    if (!id) {
      res.status(400).json({ error: 'validation' });
      return;
    }
    const removed = deleteWorkout(db, id);
    if (!removed) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    res.json({ ok: true });
  });

  return router;
}
