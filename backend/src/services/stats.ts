import type Database from 'better-sqlite3';
import {
  eachDate,
  formatLocalDate,
  monthPrefix,
  periodBounds,
  type PeriodKey,
  weekRange,
} from '../dates';

interface Totals {
  workouts: number;
  duration_minutes: number;
  volume_kg: number;
  distance_km: number;
  exercises: number;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function totals(db: Database.Database, from: string | null, to: string | null): Totals {
  const clauses: string[] = [];
  const params: string[] = [];
  if (from) {
    clauses.push('w.workout_date >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('w.workout_date <= ?');
    params.push(to);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const workoutRow = db
    .prepare(
      `SELECT COUNT(*) AS workouts, COALESCE(SUM(w.duration_minutes), 0) AS duration_minutes
       FROM workouts w ${where}`,
    )
    .get(...params) as { workouts: number; duration_minutes: number };

  const exerciseRow = db
    .prepare(
      `SELECT COUNT(*) AS exercises
       FROM exercises e
       JOIN workouts w ON w.id = e.workout_id
       ${where}`,
    )
    .get(...params) as { exercises: number };

  const volumeRow = db
    .prepare(
      `SELECT COALESCE(SUM(s.weight_kg * s.reps), 0) AS volume_kg
       FROM exercise_sets s
       JOIN exercises e ON e.id = s.exercise_id
       JOIN workouts w ON w.id = e.workout_id
       ${where ? `${where} AND` : 'WHERE'} s.weight_kg IS NOT NULL`,
    )
    .get(...params) as { volume_kg: number };

  const distanceRow = db
    .prepare(
      `SELECT COALESCE(SUM(s.distance_km), 0) AS distance_km
       FROM exercise_sets s
       JOIN exercises e ON e.id = s.exercise_id
       JOIN workouts w ON w.id = e.workout_id
       ${where ? `${where} AND` : 'WHERE'} s.distance_km IS NOT NULL`,
    )
    .get(...params) as { distance_km: number };

  return {
    workouts: workoutRow.workouts,
    duration_minutes: workoutRow.duration_minutes,
    volume_kg: round(volumeRow.volume_kg),
    distance_km: round(distanceRow.distance_km),
    exercises: exerciseRow.exercises,
  };
}

export function summary(db: Database.Database, period: PeriodKey, today = new Date()) {
  const week = weekRange(today);
  const month = monthPrefix(today);
  const bounds = periodBounds(period, today);
  const weekTotals = totals(db, week.from, week.to);
  const monthTotals = totals(db, `${month}-01`, `${month}-31`);
  const allTotals = totals(db, null, null);
  const periodTotals = totals(db, bounds.from, bounds.to);

  return {
    week_workouts: weekTotals.workouts,
    month_workouts: monthTotals.workouts,
    total_duration_minutes: allTotals.duration_minutes,
    total_volume_kg: allTotals.volume_kg,
    total_distance_km: allTotals.distance_km,
    total_exercises: allTotals.exercises,
    period: {
      key: period,
      from: bounds.from,
      to: bounds.to,
      workouts: periodTotals.workouts,
      duration_minutes: periodTotals.duration_minutes,
      volume_kg: periodTotals.volume_kg,
      distance_km: periodTotals.distance_km,
      exercises: periodTotals.exercises,
    },
  };
}

function series(db: Database.Database, from: string, to: string) {
  const rows = db
    .prepare(
      `SELECT workout_date AS date, COUNT(*) AS count
       FROM workouts
       WHERE workout_date >= ? AND workout_date <= ?
       GROUP BY workout_date`,
    )
    .all(from, to) as Array<{ date: string; count: number }>;
  const counts = new Map(rows.map((row) => [row.date, row.count]));
  return eachDate(from, to).map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

function weekdayCounts(db: Database.Database, from: string | null, to: string) {
  const params: string[] = [];
  const clauses = ['workout_date <= ?'];
  params.push(to);
  if (from) {
    clauses.push('workout_date >= ?');
    params.push(from);
  }
  const rows = db
    .prepare(
      `SELECT CAST(strftime('%w', workout_date) AS INTEGER) AS weekday, COUNT(*) AS count
       FROM workouts
       WHERE ${clauses.join(' AND ')}
       GROUP BY weekday`,
    )
    .all(...params) as Array<{ weekday: number; count: number }>;
  const counts = new Map(rows.map((row) => [row.weekday, row.count]));
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    count: counts.get(weekday) ?? 0,
  }));
}

export function activity(db: Database.Database, period: PeriodKey, today = new Date()) {
  const bounds = periodBounds(period, today);
  const todayText = formatLocalDate(today);
  const last7 = periodBounds('7d', today);
  const last30 = periodBounds('30d', today);

  let from = bounds.from ?? firstWorkoutDate(db) ?? todayText;
  let to = bounds.to;
  if (period === 'all') {
    const latest = db.prepare('SELECT MAX(workout_date) AS date FROM workouts').get() as {
      date: string | null;
    };
    if (latest.date && latest.date > to) to = latest.date;
  }
  if (from > to) from = to;

  return {
    period,
    from,
    to,
    series: series(db, from, to),
    by_weekday: weekdayCounts(db, period === 'all' ? null : bounds.from, to),
    last7: series(db, last7.from ?? todayText, last7.to),
    last30: series(db, last30.from ?? todayText, last30.to),
  };
}

function firstWorkoutDate(db: Database.Database): string | null {
  const row = db.prepare('SELECT MIN(workout_date) AS date FROM workouts').get() as {
    date: string | null;
  };
  return row.date;
}

export interface ExerciseStat {
  name: string;
  count: number;
  total_sets: number;
  total_volume_kg: number;
  total_distance_km: number;
}

export function exerciseStats(
  db: Database.Database,
  period: PeriodKey,
  exerciseName: string | undefined,
  today = new Date(),
) {
  const bounds = periodBounds(period, today);
  const clauses = ['w.workout_date <= ?'];
  const params: string[] = [bounds.to];
  if (bounds.from) {
    clauses.push('w.workout_date >= ?');
    params.push(bounds.from);
  }
  const where = clauses.join(' AND ');

  const top = db
    .prepare(
      `SELECT e.name AS name,
              COUNT(DISTINCT e.id) AS count,
              COUNT(s.id) AS total_sets,
              COALESCE(SUM(CASE WHEN s.weight_kg IS NOT NULL THEN s.weight_kg * s.reps END), 0) AS total_volume_kg,
              COALESCE(SUM(s.distance_km), 0) AS total_distance_km
       FROM exercises e
       JOIN workouts w ON w.id = e.workout_id
       LEFT JOIN exercise_sets s ON s.exercise_id = e.id
       WHERE ${where}
       GROUP BY e.name
       ORDER BY count DESC, e.name ASC`,
    )
    .all(...params) as ExerciseStat[];

  const rounded = top.map((item) => ({
    ...item,
    total_volume_kg: round(item.total_volume_kg),
    total_distance_km: round(item.total_distance_km),
  }));

  let weightSeries: Array<{ date: string; weight_kg: number }> = [];
  if (exerciseName && exerciseName.trim()) {
    const name = exerciseName.trim();
    weightSeries = db
      .prepare(
        `SELECT w.workout_date AS date, MAX(s.weight_kg) AS weight_kg
         FROM exercise_sets s
         JOIN exercises e ON e.id = s.exercise_id
         JOIN workouts w ON w.id = e.workout_id
         WHERE e.name = ? COLLATE NOCASE
           AND s.weight_kg IS NOT NULL
           AND ${where}
         GROUP BY w.workout_date
         ORDER BY w.workout_date ASC`,
      )
      .all(name, ...params) as Array<{ date: string; weight_kg: number }>;
  }

  return {
    period,
    top: rounded.slice(0, 8),
    names: rounded.map((item) => item.name),
    weight_series: weightSeries,
  };
}
