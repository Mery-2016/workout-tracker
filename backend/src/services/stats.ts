import {
  eachDate,
  formatLocalDate,
  monthPrefix,
  periodBounds,
  type PeriodKey,
  weekRange,
} from '../dates';
import type { Db } from '../db';
import { num, Sql } from '../sql';

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

function userRange(userId: number, from: string | null, to: string | null) {
  const sql = new Sql();
  const clauses = [`w.user_id = ${sql.add(userId)}`];
  if (from) clauses.push(`w.workout_date >= ${sql.add(from)}`);
  if (to) clauses.push(`w.workout_date <= ${sql.add(to)}`);
  return { where: `WHERE ${clauses.join(' AND ')}`, params: sql.values() };
}

async function totals(db: Db, userId: number, from: string | null, to: string | null): Promise<Totals> {
  const filter = userRange(userId, from, to);

  const workoutRows = await db.query<{ workouts: number; duration_minutes: number }>(
    `SELECT COUNT(*)::int AS workouts, COALESCE(SUM(w.duration_minutes), 0)::int AS duration_minutes
     FROM workouts w ${filter.where}`,
    filter.params,
  );
  const exerciseRows = await db.query<{ exercises: number }>(
    `SELECT COUNT(*)::int AS exercises
     FROM exercises e
     JOIN workouts w ON w.id = e.workout_id
     ${filter.where}`,
    filter.params,
  );
  const volumeRows = await db.query<{ volume_kg: number }>(
    `SELECT COALESCE(SUM(s.weight_kg * s.reps), 0) AS volume_kg
     FROM exercise_sets s
     JOIN exercises e ON e.id = s.exercise_id
     JOIN workouts w ON w.id = e.workout_id
     ${filter.where} AND s.weight_kg IS NOT NULL`,
    filter.params,
  );
  const distanceRows = await db.query<{ distance_km: number }>(
    `SELECT COALESCE(SUM(s.distance_km), 0) AS distance_km
     FROM exercise_sets s
     JOIN exercises e ON e.id = s.exercise_id
     JOIN workouts w ON w.id = e.workout_id
     ${filter.where} AND s.distance_km IS NOT NULL`,
    filter.params,
  );

  return {
    workouts: num(workoutRows[0]?.workouts),
    duration_minutes: num(workoutRows[0]?.duration_minutes),
    volume_kg: round(num(volumeRows[0]?.volume_kg)),
    distance_km: round(num(distanceRows[0]?.distance_km)),
    exercises: num(exerciseRows[0]?.exercises),
  };
}

export async function summary(db: Db, userId: number, period: PeriodKey, today = new Date()) {
  const week = weekRange(today);
  const month = monthPrefix(today);
  const bounds = periodBounds(period, today);
  const [weekTotals, monthTotals, allTotals, periodTotals] = await Promise.all([
    totals(db, userId, week.from, week.to),
    totals(db, userId, `${month}-01`, `${month}-31`),
    totals(db, userId, null, null),
    totals(db, userId, bounds.from, bounds.to),
  ]);

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

async function series(db: Db, userId: number, from: string, to: string) {
  const rows = await db.query<{ date: string; count: number }>(
    `SELECT workout_date AS date, COUNT(*)::int AS count
     FROM workouts
     WHERE user_id = $1 AND workout_date >= $2 AND workout_date <= $3
     GROUP BY workout_date`,
    [userId, from, to],
  );
  const counts = new Map(rows.map((row) => [String(row.date).slice(0, 10), num(row.count)]));
  return eachDate(from, to).map((date) => ({ date, count: counts.get(date) ?? 0 }));
}

async function weekdayCounts(db: Db, userId: number, from: string | null, to: string) {
  const sql = new Sql();
  const clauses = [`user_id = ${sql.add(userId)}`, `workout_date <= ${sql.add(to)}`];
  if (from) clauses.push(`workout_date >= ${sql.add(from)}`);
  const rows = await db.query<{ weekday: number; count: number }>(
    `SELECT EXTRACT(DOW FROM workout_date::date)::int AS weekday, COUNT(*)::int AS count
     FROM workouts
     WHERE ${clauses.join(' AND ')}
     GROUP BY weekday`,
    sql.values(),
  );
  const counts = new Map(rows.map((row) => [num(row.weekday), num(row.count)]));
  return [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    count: counts.get(weekday) ?? 0,
  }));
}

async function firstWorkoutDate(db: Db, userId: number): Promise<string | null> {
  const rows = await db.query<{ date: string | null }>('SELECT MIN(workout_date) AS date FROM workouts WHERE user_id = $1', [
    userId,
  ]);
  return rows[0]?.date ? String(rows[0].date).slice(0, 10) : null;
}

export async function activity(db: Db, userId: number, period: PeriodKey, today = new Date()) {
  const bounds = periodBounds(period, today);
  const todayText = formatLocalDate(today);
  const last7 = periodBounds('7d', today);
  const last30 = periodBounds('30d', today);

  let from = bounds.from ?? (await firstWorkoutDate(db, userId)) ?? todayText;
  let to = bounds.to;
  if (period === 'all') {
    const latest = await db.query<{ date: string | null }>(
      'SELECT MAX(workout_date) AS date FROM workouts WHERE user_id = $1',
      [userId],
    );
    const latestDate = latest[0]?.date ? String(latest[0].date).slice(0, 10) : null;
    if (latestDate && latestDate > to) to = latestDate;
  }
  if (from > to) from = to;

  const [points, byWeekday, weekPoints, monthPoints] = await Promise.all([
    series(db, userId, from, to),
    weekdayCounts(db, userId, period === 'all' ? null : bounds.from, to),
    series(db, userId, last7.from ?? todayText, last7.to),
    series(db, userId, last30.from ?? todayText, last30.to),
  ]);

  return {
    period,
    from,
    to,
    series: points,
    by_weekday: byWeekday,
    last7: weekPoints,
    last30: monthPoints,
  };
}

export interface ExerciseStat {
  name: string;
  count: number;
  total_sets: number;
  total_volume_kg: number;
  total_distance_km: number;
}

export async function exerciseStats(
  db: Db,
  userId: number,
  period: PeriodKey,
  exerciseName: string | undefined,
  today = new Date(),
) {
  const bounds = periodBounds(period, today);
  const sql = new Sql();
  const clauses = [`w.user_id = ${sql.add(userId)}`, `w.workout_date <= ${sql.add(bounds.to)}`];
  if (bounds.from) clauses.push(`w.workout_date >= ${sql.add(bounds.from)}`);
  const where = clauses.join(' AND ');
  const params = sql.values();

  const top = await db.query<ExerciseStat>(
    `SELECT e.name AS name,
            COUNT(DISTINCT e.id)::int AS count,
            COUNT(s.id)::int AS total_sets,
            COALESCE(SUM(CASE WHEN s.weight_kg IS NOT NULL THEN s.weight_kg * s.reps END), 0) AS total_volume_kg,
            COALESCE(SUM(s.distance_km), 0) AS total_distance_km
     FROM exercises e
     JOIN workouts w ON w.id = e.workout_id
     LEFT JOIN exercise_sets s ON s.exercise_id = e.id
     WHERE ${where}
     GROUP BY e.name
     ORDER BY count DESC, e.name ASC`,
    params,
  );

  const rounded = top.map((item) => ({
    name: item.name,
    count: num(item.count),
    total_sets: num(item.total_sets),
    total_volume_kg: round(num(item.total_volume_kg)),
    total_distance_km: round(num(item.total_distance_km)),
  }));

  let weightSeries: Array<{ date: string; weight_kg: number }> = [];
  if (exerciseName && exerciseName.trim()) {
    const name = exerciseName.trim();
    const weightSql = new Sql();
    const weightClauses = [
      `w.user_id = ${weightSql.add(userId)}`,
      `LOWER(e.name) = LOWER(${weightSql.add(name)})`,
      's.weight_kg IS NOT NULL',
      `w.workout_date <= ${weightSql.add(bounds.to)}`,
    ];
    if (bounds.from) weightClauses.push(`w.workout_date >= ${weightSql.add(bounds.from)}`);
    const rows = await db.query<{ date: string; weight_kg: number }>(
      `SELECT w.workout_date AS date, MAX(s.weight_kg) AS weight_kg
       FROM exercise_sets s
       JOIN exercises e ON e.id = s.exercise_id
       JOIN workouts w ON w.id = e.workout_id
       WHERE ${weightClauses.join(' AND ')}
       GROUP BY w.workout_date
       ORDER BY w.workout_date ASC`,
      weightSql.values(),
    );
    weightSeries = rows.map((row) => ({
      date: String(row.date).slice(0, 10),
      weight_kg: num(row.weight_kg),
    }));
  }

  return {
    period,
    top: rounded.slice(0, 8),
    names: rounded.map((item) => item.name),
    weight_series: weightSeries,
  };
}
