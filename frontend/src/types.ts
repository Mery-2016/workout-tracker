export const WORKOUT_TYPES = [
  'strength',
  'cardio',
  'stretching',
  'yoga',
  'functional',
  'other',
] as const;

export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export interface SetRecord {
  id: number;
  exercise_id: number;
  set_number: number;
  reps: number;
  weight_kg: number | null;
  distance_km: number | null;
  duration_seconds: number | null;
}

export interface ExerciseRecord {
  id: number;
  workout_id: number;
  name: string;
  position: number;
  created_at: string;
  sets: SetRecord[];
}

export interface WorkoutRecord {
  id: number;
  title: string;
  workout_date: string;
  start_time: string | null;
  duration_minutes: number;
  workout_type: WorkoutType;
  notes: string | null;
  created_at: string;
  updated_at: string;
  exercises: ExerciseRecord[];
}

export interface WorkoutListItem {
  id: number;
  title: string;
  workout_date: string;
  start_time: string | null;
  duration_minutes: number;
  workout_type: WorkoutType;
  notes: string | null;
  exercise_count: number;
}

export interface WorkoutListResponse {
  items: WorkoutListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface SummaryResponse {
  week_workouts: number;
  month_workouts: number;
  total_duration_minutes: number;
  total_volume_kg: number;
  total_distance_km: number;
  total_exercises: number;
  period: {
    key: string;
    from: string | null;
    to: string;
    workouts: number;
    duration_minutes: number;
    volume_kg: number;
    distance_km: number;
    exercises: number;
  };
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export interface ActivityResponse {
  period: string;
  from: string;
  to: string;
  series: ActivityPoint[];
  by_weekday: Array<{ weekday: number; count: number }>;
  last7: ActivityPoint[];
  last30: ActivityPoint[];
}

export interface ExerciseStatsResponse {
  period: string;
  top: Array<{
    name: string;
    count: number;
    total_sets: number;
    total_volume_kg: number;
    total_distance_km: number;
  }>;
  names: string[];
  weight_series: Array<{ date: string; weight_kg: number }>;
}

export interface WorkoutPayload {
  title: string;
  workout_date: string;
  start_time: string | null;
  duration_minutes: number;
  workout_type: WorkoutType;
  notes: string | null;
  exercises: Array<{
    name: string;
    sets: Array<{
      reps: number;
      weight_kg: number | null;
      distance_km: number | null;
      duration_seconds: number | null;
    }>;
  }>;
}
