export const WORKOUT_TYPES = [
  'strength',
  'cardio',
  'stretching',
  'yoga',
  'functional',
  'other',
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export interface SetInput {
  reps: number;
  weight_kg: number | null;
  distance_km: number | null;
  duration_seconds: number | null;
}

export interface ExerciseInput {
  name: string;
  sets: SetInput[];
}

export interface WorkoutInput {
  title: string;
  workout_date: string;
  start_time: string | null;
  duration_minutes: number;
  workout_type: WorkoutType;
  notes: string | null;
  exercises: ExerciseInput[];
}

export interface WorkoutRow {
  id: number;
  title: string;
  workout_date: string;
  start_time: string | null;
  duration_minutes: number;
  workout_type: WorkoutType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExerciseRow {
  id: number;
  workout_id: number;
  name: string;
  position: number;
  created_at: string;
}

export interface SetRow {
  id: number;
  exercise_id: number;
  set_number: number;
  reps: number;
  weight_kg: number | null;
  distance_km: number | null;
  duration_seconds: number | null;
}

export interface WorkoutListItem extends WorkoutRow {
  exercise_count: number;
}

export interface ExerciseWithSets extends ExerciseRow {
  sets: SetRow[];
}

export interface WorkoutDetails extends WorkoutRow {
  exercises: ExerciseWithSets[];
}
