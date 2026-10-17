import { Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useI18n } from '../i18n/LanguageContext';
import { formatDate, formatMeasure, formatMinutes, typeKey } from '../lib/format';
import type { WorkoutRecord } from '../types';

export function WorkoutDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const [workout, setWorkout] = useState<WorkoutRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<WorkoutRecord>(`/api/workouts/${id}`, { signal: controller.signal })
      .then(setWorkout)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof ApiError && reason.status === 404 ? t('detail.notFound') : t('errors.load'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, t]);

  async function remove() {
    setDeleting(true);
    try {
      await api(`/api/workouts/${id}`, { method: 'DELETE' });
      navigate('/workouts', { state: { flash: t('common.deleted') } });
    } catch {
      setError(t('errors.server'));
      setDeleting(false);
      setConfirm(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-500">{t('common.loading')}</p>;
  if (error || !workout) return <p className="text-sm text-rose-600">{error || t('detail.notFound')}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{formatDate(workout.workout_date, locale)}</p>
          <h1 className="text-2xl font-semibold">{workout.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t(typeKey(workout.workout_type))} · {formatMinutes(workout.duration_minutes, t)}
            {workout.start_time ? ` · ${t('detail.start')} ${workout.start_time}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/workouts/${workout.id}/edit`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          >
            <Pencil size={16} />
            {t('common.edit')}
          </Link>
          <button
            type="button"
            onClick={() => setConfirm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm text-white"
          >
            <Trash2 size={16} />
            {t('common.delete')}
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-medium">{t('form.notes')}</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
          {workout.notes || t('detail.noNotes')}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">{t('detail.exercises')}</h2>
        {workout.exercises.length === 0 ? <p className="text-sm text-slate-500">{t('detail.noExercises')}</p> : null}
        {workout.exercises.map((exercise) => (
          <article key={exercise.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="font-medium">{exercise.name}</h3>
            {exercise.sets.length === 0 ? <p className="mt-2 text-sm text-slate-500">{t('detail.noSets')}</p> : null}
            {exercise.sets.length > 0 ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      <th className="py-1 pr-3">{t('form.set')}</th>
                      <th className="py-1 pr-3">{t('form.reps')}</th>
                      <th className="py-1 pr-3">{t('units.kg')}</th>
                      <th className="py-1 pr-3">{t('units.km')}</th>
                      <th className="py-1">{t('units.min')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exercise.sets.map((set) => (
                      <tr key={set.id} className="border-t border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-3">{set.set_number}</td>
                        <td className="py-2 pr-3">{set.reps}</td>
                        <td className="py-2 pr-3">{set.weight_kg == null ? t('common.dash') : formatMeasure(set.weight_kg, locale)}</td>
                        <td className="py-2 pr-3">{set.distance_km == null ? t('common.dash') : formatMeasure(set.distance_km, locale)}</td>
                        <td className="py-2">
                          {set.duration_seconds == null ? t('common.dash') : formatMeasure(set.duration_seconds / 60, locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </article>
        ))}
      </section>

      <ConfirmDialog open={confirm} busy={deleting} onCancel={() => setConfirm(false)} onConfirm={() => void remove()} />
    </div>
  );
}
