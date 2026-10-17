import { z } from 'zod';
import { isRealDate } from './dates';
import { WORKOUT_TYPES, type WorkoutInput } from './types';

const emptyToNull = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const optionalMeasure = z.preprocess(
  (value) => (value === '' || value === undefined ? null : value),
  z.number().finite().min(0).nullable(),
);

const setSchema = z.object({
  reps: z.number().int().min(0).max(10000),
  weight_kg: optionalMeasure,
  distance_km: optionalMeasure,
  duration_seconds: z.preprocess(
    (value) => (value === '' || value === undefined ? null : value),
    z.number().int().min(0).max(86400).nullable(),
  ),
});

const exerciseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sets: z.array(setSchema).max(100).default([]),
});

export const workoutBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  workout_date: z.string().refine(isRealDate, 'date_invalid'),
  start_time: z.preprocess(
    (value) => (value == null ? null : emptyToNull(value)),
    z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
  ),
  duration_minutes: z.number().int().min(0).max(1440),
  workout_type: z.enum(WORKOUT_TYPES),
  notes: z.preprocess(
    (value) => (value == null ? null : emptyToNull(value)),
    z.string().max(4000).nullable(),
  ),
  exercises: z.array(exerciseSchema).max(100).default([]),
});

export const listQuerySchema = z.object({
  search: z.string().trim().max(200).optional().default(''),
  type: z.union([z.enum(WORKOUT_TYPES), z.literal('')]).optional().default(''),
  from: z.string().optional().default(''),
  to: z.string().optional().default(''),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export const periodSchema = z.enum(['7d', '30d', '90d', 'all']).optional().default('30d');

export function parseWorkoutBody(body: unknown): WorkoutInput {
  return workoutBodySchema.parse(body);
}

export function singleQuery(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
