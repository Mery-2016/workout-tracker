import type { Db } from '../db';
import { num, Sql } from '../sql';
import type {
  ExerciseInput,
  ExerciseRow,
  ExerciseWithSets,
  SetRow,
  WorkoutDetails,
  WorkoutInput,
  WorkoutListItem,
  WorkoutRow,
} from '../types';

async function insertChildren(db: Db, workoutId: number, exercises: ExerciseInput[], now: string) {
  for (let index = 0; index < exercises.length; index += 1) {
    const exercise = exercises[index];
    const created = await db.query<{ id: number }>(
      `INSERT INTO exercises (workout_id, name, position, created_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [workoutId, exercise.name, index, now],
    );
    const exerciseId = Number(created[0].id);
    for (let setIndex = 0; setIndex < exercise.sets.length; setIndex += 1) {
      const set = exercise.sets[setIndex];
      await db.query(
        `INSERT INTO exercise_sets
          (exercise_id, set_number, reps, weight_kg, distance_km, duration_seconds)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [exerciseId, setIndex + 1, set.reps, set.weight_kg, set.distance_km, set.duration_seconds],
      );
    }
  }
}

export async function getWorkout(db: Db, userId: number, id: number): Promise<WorkoutDetails | null> {
  const workouts = await db.query<WorkoutRow>('SELECT * FROM workouts WHERE id = $1 AND user_id = $2', [id, userId]);
  const workout = workouts[0];
  if (!workout) return null;

  const exercises = await db.query<ExerciseRow>(
    'SELECT * FROM exercises WHERE workout_id = $1 ORDER BY position ASC, id ASC',
    [id],
  );
  const withSets: ExerciseWithSets[] = [];
  for (const exercise of exercises) {
    const sets = await db.query<SetRow>(
      'SELECT * FROM exercise_sets WHERE exercise_id = $1 ORDER BY set_number ASC, id ASC',
      [exercise.id],
    );
    withSets.push({
      ...exercise,
      id: Number(exercise.id),
      workout_id: Number(exercise.workout_id),
      sets: sets.map((set) => ({
        ...set,
        id: Number(set.id),
        exercise_id: Number(set.exercise_id),
        weight_kg: set.weight_kg === null ? null : num(set.weight_kg),
        distance_km: set.distance_km === null ? null : num(set.distance_km),
        duration_seconds: set.duration_seconds === null ? null : num(set.duration_seconds),
      })),
    });
  }

  return { ...workout, id: Number(workout.id), exercises: withSets };
}

export async function createWorkout(db: Db, userId: number, input: WorkoutInput): Promise<WorkoutDetails> {
  const now = new Date().toISOString();
  const id = await db.transaction(async (tx) => {
    const rows = await tx.query<{ id: number }>(
      `INSERT INTO workouts
        (user_id, title, workout_date, start_time, duration_minutes, workout_type, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        userId,
        input.title,
        input.workout_date,
        input.start_time,
        input.duration_minutes,
        input.workout_type,
        input.notes,
        now,
        now,
      ],
    );
    const workoutId = Number(rows[0].id);
    await insertChildren(tx, workoutId, input.exercises, now);
    return workoutId;
  });

  const created = await getWorkout(db, userId, id);
  if (!created) throw new Error('workout_missing_after_insert');
  return created;
}

export async function updateWorkout(
  db: Db,
  userId: number,
  id: number,
  input: WorkoutInput,
): Promise<WorkoutDetails | null> {
  const now = new Date().toISOString();
  const updated = await db.transaction(async (tx) => {
    const rows = await tx.query<{ id: number }>(
      `UPDATE workouts
       SET title = $1, workout_date = $2, start_time = $3, duration_minutes = $4,
           workout_type = $5, notes = $6, updated_at = $7
       WHERE id = $8 AND user_id = $9
       RETURNING id`,
      [
        input.title,
        input.workout_date,
        input.start_time,
        input.duration_minutes,
        input.workout_type,
        input.notes,
        now,
        id,
        userId,
      ],
    );
    if (!rows[0]) return false;
    await tx.query('DELETE FROM exercises WHERE workout_id = $1', [id]);
    await insertChildren(tx, id, input.exercises, now);
    return true;
  });

  if (!updated) return null;
  return getWorkout(db, userId, id);
}

export async function deleteWorkout(db: Db, userId: number, id: number): Promise<boolean> {
  const rows = await db.query<{ id: number }>('DELETE FROM workouts WHERE id = $1 AND user_id = $2 RETURNING id', [
    id,
    userId,
  ]);
  return rows.length > 0;
}

export interface ListFilters {
  search: string;
  type: string;
  from: string;
  to: string;
  sort: 'asc' | 'desc';
  page: number;
  limit: number;
}

export async function listWorkouts(db: Db, userId: number, filters: ListFilters) {
  const sql = new Sql();
  const where = [`user_id = ${sql.add(userId)}`];

  if (filters.search) {
    where.push(`title LIKE '%' || ${sql.add(escapeLike(filters.search))} || '%' ESCAPE '\\'`);
  }
  if (filters.type) where.push(`workout_type = ${sql.add(filters.type)}`);
  if (filters.from) where.push(`workout_date >= ${sql.add(filters.from)}`);
  if (filters.to) where.push(`workout_date <= ${sql.add(filters.to)}`);

  const whereSql = `WHERE ${where.join(' AND ')}`;
  const direction = filters.sort === 'asc' ? 'ASC' : 'DESC';
  const offset = (filters.page - 1) * filters.limit;
  const totalRows = await db.query<{ total: number }>(
    `SELECT COUNT(*)::int AS total FROM workouts ${whereSql}`,
    [...sql.values()],
  );
  const items = await db.query<WorkoutListItem>(
    `SELECT w.*,
      (SELECT COUNT(*)::int FROM exercises e WHERE e.workout_id = w.id) AS exercise_count
     FROM workouts w
     ${whereSql}
     ORDER BY workout_date ${direction}, id ${direction}
     LIMIT ${sql.add(filters.limit)} OFFSET ${sql.add(offset)}`,
    sql.values(),
  );

  return {
    items: items.map((item) => ({
      ...item,
      id: Number(item.id),
      exercise_count: num(item.exercise_count),
      duration_minutes: num(item.duration_minutes),
    })),
    total: num(totalRows[0]?.total),
    page: filters.page,
    limit: filters.limit,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
