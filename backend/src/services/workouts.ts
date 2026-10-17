import type Database from 'better-sqlite3';
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

function insertChildren(db: Database.Database, workoutId: number, exercises: ExerciseInput[], now: string) {
  const insertExercise = db.prepare(
    `INSERT INTO exercises (workout_id, name, position, created_at)
     VALUES (?, ?, ?, ?)`,
  );
  const insertSet = db.prepare(
    `INSERT INTO exercise_sets
      (exercise_id, set_number, reps, weight_kg, distance_km, duration_seconds)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  exercises.forEach((exercise, index) => {
    const result = insertExercise.run(workoutId, exercise.name, index, now);
    const exerciseId = Number(result.lastInsertRowid);
    exercise.sets.forEach((set, setIndex) => {
      insertSet.run(
        exerciseId,
        setIndex + 1,
        set.reps,
        set.weight_kg,
        set.distance_km,
        set.duration_seconds,
      );
    });
  });
}

export function getWorkout(db: Database.Database, id: number): WorkoutDetails | null {
  const workout = db.prepare('SELECT * FROM workouts WHERE id = ?').get(id) as WorkoutRow | undefined;
  if (!workout) return null;

  const exercises = db
    .prepare('SELECT * FROM exercises WHERE workout_id = ? ORDER BY position ASC, id ASC')
    .all(id) as ExerciseRow[];
  const setsStatement = db.prepare(
    'SELECT * FROM exercise_sets WHERE exercise_id = ? ORDER BY set_number ASC, id ASC',
  );

  const withSets: ExerciseWithSets[] = exercises.map((exercise) => ({
    ...exercise,
    sets: setsStatement.all(exercise.id) as SetRow[],
  }));

  return { ...workout, exercises: withSets };
}

export function createWorkout(db: Database.Database, input: WorkoutInput): WorkoutDetails {
  const now = new Date().toISOString();
  const insertWorkout = db.prepare(
    `INSERT INTO workouts
      (title, workout_date, start_time, duration_minutes, workout_type, notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const run = db.transaction((data: WorkoutInput) => {
    const result = insertWorkout.run(
      data.title,
      data.workout_date,
      data.start_time,
      data.duration_minutes,
      data.workout_type,
      data.notes,
      now,
      now,
    );
    const id = Number(result.lastInsertRowid);
    insertChildren(db, id, data.exercises, now);
    return id;
  });

  const id = run(input);
  const created = getWorkout(db, id);
  if (!created) throw new Error('workout_missing_after_insert');
  return created;
}

export function updateWorkout(
  db: Database.Database,
  id: number,
  input: WorkoutInput,
): WorkoutDetails | null {
  const now = new Date().toISOString();
  const update = db.prepare(
    `UPDATE workouts
     SET title = ?, workout_date = ?, start_time = ?, duration_minutes = ?,
         workout_type = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
  );
  const removeExercises = db.prepare('DELETE FROM exercises WHERE workout_id = ?');

  const run = db.transaction((data: WorkoutInput) => {
    const result = update.run(
      data.title,
      data.workout_date,
      data.start_time,
      data.duration_minutes,
      data.workout_type,
      data.notes,
      now,
      id,
    );
    if (result.changes === 0) return false;
    removeExercises.run(id);
    insertChildren(db, id, data.exercises, now);
    return true;
  });

  const updated = run(input);
  if (!updated) return null;
  return getWorkout(db, id);
}

export function deleteWorkout(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM workouts WHERE id = ?').run(id);
  return result.changes > 0;
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

export function listWorkouts(db: Database.Database, filters: ListFilters): {
  items: WorkoutListItem[];
  total: number;
  page: number;
  limit: number;
} {
  const where: string[] = [];
  const params: Array<string | number> = [];

  if (filters.search) {
    where.push("title LIKE '%' || ? || '%' ESCAPE '\\'");
    params.push(escapeLike(filters.search));
  }
  if (filters.type) {
    where.push('workout_type = ?');
    params.push(filters.type);
  }
  if (filters.from) {
    where.push('workout_date >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    where.push('workout_date <= ?');
    params.push(filters.to);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
  const direction = filters.sort === 'asc' ? 'ASC' : 'DESC';
  const offset = (filters.page - 1) * filters.limit;

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM workouts ${whereSql}`)
    .get(...params) as { total: number };

  const items = db
    .prepare(
      `SELECT w.*,
        (SELECT COUNT(*) FROM exercises e WHERE e.workout_id = w.id) AS exercise_count
       FROM workouts w
       ${whereSql}
       ORDER BY workout_date ${direction}, id ${direction}
       LIMIT ? OFFSET ?`,
    )
    .all(...params, filters.limit, offset) as WorkoutListItem[];

  return {
    items,
    total: totalRow.total,
    page: filters.page,
    limit: filters.limit,
  };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
