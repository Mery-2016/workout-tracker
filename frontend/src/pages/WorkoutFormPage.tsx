import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { useI18n } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { isRealDate, todayInputValue, typeKey } from '../lib/format';
import { WORKOUT_TYPES, type WorkoutPayload, type WorkoutRecord, type WorkoutType } from '../types';

interface SetDraft {
  reps: string;
  weight_kg: string;
  distance_km: string;
  duration_minutes: string;
}

interface ExerciseDraft {
  name: string;
  sets: SetDraft[];
}

interface Draft {
  title: string;
  workout_date: string;
  start_time: string;
  duration_minutes: string;
  workout_type: WorkoutType;
  notes: string;
  exercises: ExerciseDraft[];
}

type FieldErrors = Record<string, TranslationKey>;

function emptySet(): SetDraft {
  return { reps: '', weight_kg: '', distance_km: '', duration_minutes: '' };
}

function emptyDraft(): Draft {
  return {
    title: '',
    workout_date: todayInputValue(),
    start_time: '',
    duration_minutes: '',
    workout_type: 'strength',
    notes: '',
    exercises: [],
  };
}

function fromRecord(workout: WorkoutRecord): Draft {
  return {
    title: workout.title,
    workout_date: workout.workout_date,
    start_time: workout.start_time ?? '',
    duration_minutes: String(workout.duration_minutes),
    workout_type: workout.workout_type,
    notes: workout.notes ?? '',
    exercises: workout.exercises.map((exercise) => ({
      name: exercise.name,
      sets: exercise.sets.map((set) => ({
        reps: String(set.reps),
        weight_kg: set.weight_kg == null ? '' : String(set.weight_kg),
        distance_km: set.distance_km == null ? '' : String(set.distance_km),
        duration_minutes: set.duration_seconds == null ? '' : String(set.duration_seconds / 60),
      })),
    })),
  };
}

function optionalNumber(value: string): number | null | 'invalid' {
  if (value.trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 'invalid';
  return number;
}

function validate(draft: Draft): { errors: FieldErrors; payload: WorkoutPayload | null } {
  const errors: FieldErrors = {};
  if (!draft.title.trim()) errors.title = 'form.errTitle';
  if (!isRealDate(draft.workout_date)) errors.date = 'form.errDate';
  const duration = Number(draft.duration_minutes);
  if (
    draft.duration_minutes.trim() === '' ||
    !Number.isInteger(duration) ||
    duration < 0 ||
    duration > 1440
  ) {
    errors.duration = 'form.errDuration';
  }

  const exercises: WorkoutPayload['exercises'] = [];
  draft.exercises.forEach((exercise, exerciseIndex) => {
    if (!exercise.name.trim()) errors[`exercise-${exerciseIndex}-name`] = 'form.errExerciseName';
    const sets: WorkoutPayload['exercises'][number]['sets'] = [];
    exercise.sets.forEach((set, setIndex) => {
      const reps = Number(set.reps);
      if (set.reps.trim() === '' || !Number.isInteger(reps) || reps < 0) {
        errors[`exercise-${exerciseIndex}-set-${setIndex}-reps`] = 'form.errReps';
      }
      const weight = optionalNumber(set.weight_kg);
      if (weight === 'invalid') errors[`exercise-${exerciseIndex}-set-${setIndex}-weight`] = 'form.errWeight';
      const distance = optionalNumber(set.distance_km);
      if (distance === 'invalid') errors[`exercise-${exerciseIndex}-set-${setIndex}-distance`] = 'form.errDistance';
      const minutes = optionalNumber(set.duration_minutes);
      if (minutes === 'invalid') {
        errors[`exercise-${exerciseIndex}-set-${setIndex}-duration`] = 'form.errExerciseDuration';
      }
      if (!errors[`exercise-${exerciseIndex}-set-${setIndex}-reps`] && weight !== 'invalid' && distance !== 'invalid' && minutes !== 'invalid') {
        sets.push({
          reps,
          weight_kg: weight,
          distance_km: distance,
          duration_seconds: minutes == null ? null : Math.round(minutes * 60),
        });
      }
    });
    if (!errors[`exercise-${exerciseIndex}-name`]) {
      exercises.push({ name: exercise.name.trim(), sets });
    }
  });

  if (Object.keys(errors).length > 0) return { errors, payload: null };
  return {
    errors,
    payload: {
      title: draft.title.trim(),
      workout_date: draft.workout_date,
      start_time: draft.start_time || null,
      duration_minutes: duration,
      workout_type: draft.workout_type,
      notes: draft.notes.trim() || null,
      exercises,
    },
  };
}

const fieldClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950';

export function WorkoutFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    api<WorkoutRecord>(`/api/workouts/${id}`, { signal: controller.signal })
      .then((workout) => setDraft(fromRecord(workout)))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setLoadError(reason instanceof ApiError && reason.status === 404 ? t('detail.notFound') : t('errors.load'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, t]);

  function updateExercise(index: number, next: ExerciseDraft) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, exerciseIndex) => (exerciseIndex === index ? next : exercise)),
    }));
  }

  function patchSet(exerciseIndex: number, setIndex: number, patch: Partial<SetDraft>) {
    setDraft((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, index) => {
        if (index !== exerciseIndex) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set, indexInSets) =>
            indexInSets === setIndex ? { ...set, ...patch } : set,
          ),
        };
      }),
    }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validate(draft);
    setErrors(result.errors);
    if (!result.payload) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await api<WorkoutRecord>(editing ? `/api/workouts/${id}` : '/api/workouts', {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(result.payload),
      });
      navigate(`/workouts/${saved.id}`, { state: { flash: t('common.saved') } });
    } catch (reason) {
      setSaveError(reason instanceof ApiError && reason.code === 'validation' ? t('errors.validation') : t('errors.server'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  if (loadError) return <p className="text-sm text-rose-600">{loadError}</p>;

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-2xl font-semibold">{editing ? t('form.editTitle') : t('form.createTitle')}</h1>
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 dark:border-slate-800 dark:bg-slate-900">
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm">{t('form.title')}</span>
          <input
            value={draft.title}
            onChange={(event) => {
              const value = event.target.value;
              setDraft((current) => ({ ...current, title: value }));
            }}
            placeholder={t('form.titlePlaceholder')}
            className={fieldClass}
          />
          {errors.title ? <span className="mt-1 block text-xs text-rose-600">{t(errors.title)}</span> : null}
        </label>
        <label>
          <span className="mb-1 block text-sm">{t('form.date')}</span>
          <input
            type="date"
            value={draft.workout_date}
            onChange={(event) => {
              const value = event.target.value;
              setDraft((current) => ({ ...current, workout_date: value }));
            }}
            className={fieldClass}
          />
          {errors.date ? <span className="mt-1 block text-xs text-rose-600">{t(errors.date)}</span> : null}
        </label>
        <label>
          <span className="mb-1 block text-sm">
            {t('form.startTime')} <span className="text-slate-400">({t('common.optional')})</span>
          </span>
          <input
            type="time"
            value={draft.start_time}
            onChange={(event) => {
              const value = event.target.value;
              setDraft((current) => ({ ...current, start_time: value }));
            }}
            className={fieldClass}
          />
        </label>
        <label>
          <span className="mb-1 block text-sm">{t('form.duration')}</span>
          <input
            type="number"
            min={0}
            max={1440}
            step={1}
            value={draft.duration_minutes}
            onChange={(event) => {
              const value = event.target.value;
              setDraft((current) => ({ ...current, duration_minutes: value }));
            }}
            className={fieldClass}
          />
          {errors.duration ? <span className="mt-1 block text-xs text-rose-600">{t(errors.duration)}</span> : null}
        </label>
        <label>
          <span className="mb-1 block text-sm">{t('form.type')}</span>
          <select
            value={draft.workout_type}
            onChange={(event) => {
              const value = event.target.value as WorkoutType;
              setDraft((current) => ({ ...current, workout_type: value }));
            }}
            className={fieldClass}
          >
            {WORKOUT_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(typeKey(item))}
              </option>
            ))}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block text-sm">{t('form.notes')}</span>
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(event) => {
              const value = event.target.value;
              setDraft((current) => ({ ...current, notes: value }));
            }}
            placeholder={t('form.notesPlaceholder')}
            className={fieldClass}
          />
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">{t('form.exercises')}</h2>
          <button
            type="button"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                exercises: [...current.exercises, { name: '', sets: [emptySet()] }],
              }))
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          >
            <Plus size={16} />
            {t('form.addExercise')}
          </button>
        </div>
        {draft.exercises.length === 0 ? <p className="text-sm text-slate-500">{t('form.noExercises')}</p> : null}
        {draft.exercises.map((exercise, exerciseIndex) => (
          <article key={exerciseIndex} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="mb-1 block text-sm">{t('form.exerciseName')}</span>
                <input
                  value={exercise.name}
                  onChange={(event) => updateExercise(exerciseIndex, { ...exercise, name: event.target.value })}
                  className={fieldClass}
                />
                {errors[`exercise-${exerciseIndex}-name`] ? (
                  <span className="mt-1 block text-xs text-rose-600">{t(errors[`exercise-${exerciseIndex}-name`])}</span>
                ) : null}
              </label>
              <button
                type="button"
                aria-label={t('form.removeExercise')}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    exercises: current.exercises.filter((_, index) => index !== exerciseIndex),
                  }))
                }
                className="mt-6 rounded-xl p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {exercise.sets.map((set, setIndex) => (
                <div key={setIndex} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {t('form.set')} {setIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateExercise(exerciseIndex, {
                          ...exercise,
                          sets: exercise.sets.filter((_, index) => index !== setIndex),
                        })
                      }
                      className="text-rose-600"
                    >
                      {t('form.removeSet')}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <NumberField
                      label={t('form.reps')}
                      value={set.reps}
                      error={errors[`exercise-${exerciseIndex}-set-${setIndex}-reps`]}
                      onChange={(value) => patchSet(exerciseIndex, setIndex, { reps: value })}
                    />
                    <NumberField
                      label={`${t('form.weight')} (${t('common.optional')})`}
                      value={set.weight_kg}
                      step="0.5"
                      error={errors[`exercise-${exerciseIndex}-set-${setIndex}-weight`]}
                      onChange={(value) => patchSet(exerciseIndex, setIndex, { weight_kg: value })}
                    />
                    <NumberField
                      label={`${t('form.distance')} (${t('common.optional')})`}
                      value={set.distance_km}
                      step="0.1"
                      error={errors[`exercise-${exerciseIndex}-set-${setIndex}-distance`]}
                      onChange={(value) => patchSet(exerciseIndex, setIndex, { distance_km: value })}
                    />
                    <NumberField
                      label={`${t('form.exerciseDuration')} (${t('common.optional')})`}
                      value={set.duration_minutes}
                      step="1"
                      error={errors[`exercise-${exerciseIndex}-set-${setIndex}-duration`]}
                      onChange={(value) => patchSet(exerciseIndex, setIndex, { duration_minutes: value })}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateExercise(exerciseIndex, { ...exercise, sets: [...exercise.sets, emptySet()] })}
                className="text-sm text-emerald-700 dark:text-emerald-300"
              >
                + {t('form.addSet')}
              </button>
            </div>
          </article>
        ))}
      </section>

      {saveError ? <p className="text-sm text-rose-600">{saveError}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {t('common.save')}
        </button>
        <Link
          to={editing ? `/workouts/${id}` : '/workouts'}
          className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t('common.cancel')}
        </Link>
      </div>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
  error,
  step = '1',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: TranslationKey;
  step?: string;
}) {
  const { t } = useI18n();
  return (
    <label>
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass}
      />
      {error ? <span className="mt-1 block text-xs text-rose-600">{t(error)}</span> : null}
    </label>
  );
}
