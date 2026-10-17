import { CalendarRange, Clock3, Dumbbell, Plus, Route, Weight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { CountChart } from '../components/Charts';
import { StatCard } from '../components/StatCard';
import { useI18n } from '../i18n/LanguageContext';
import { formatDate, formatMeasure, formatMinutes, typeKey } from '../lib/format';
import type { ActivityResponse, SummaryResponse, WorkoutListResponse } from '../types';

export function DashboardPage() {
  const { t, locale } = useI18n();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [recent, setRecent] = useState<WorkoutListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      api<SummaryResponse>('/api/stats/summary?period=30d', { signal: controller.signal }),
      api<ActivityResponse>('/api/stats/activity?period=30d', { signal: controller.signal }),
      api<WorkoutListResponse>('/api/workouts?sort=desc&limit=5&page=1', { signal: controller.signal }),
    ])
      .then(([summaryData, activityData, recentData]) => {
        setSummary(summaryData);
        setActivity(activityData);
        setRecent(recentData);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof ApiError && reason.code === 'server' ? t('errors.server') : t('errors.load'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadKey, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.dashboard')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('dashboard.subtitle')}</p>
        </div>
        <Link
          to="/workouts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus size={18} />
          {t('dashboard.add')}
        </Link>
      </div>

      {loading ? <p className="text-sm text-slate-500">{t('common.loading')}</p> : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
          <p>{error}</p>
          <button type="button" className="mt-3 underline" onClick={() => setReloadKey((value) => value + 1)}>
            {t('common.retry')}
          </button>
        </div>
      ) : null}

      {summary ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label={t('dashboard.week')} value={String(summary.week_workouts)} icon={<CalendarRange size={18} />} />
          <StatCard label={t('dashboard.month')} value={String(summary.month_workouts)} icon={<Dumbbell size={18} />} />
          <StatCard
            label={t('dashboard.totalTime')}
            value={formatMinutes(summary.total_duration_minutes, t)}
            icon={<Clock3 size={18} />}
          />
          <StatCard
            label={t('dashboard.volume')}
            value={`${formatMeasure(summary.total_volume_kg, locale)} ${t('units.kg')}`}
            icon={<Weight size={18} />}
          />
          <StatCard
            label={t('dashboard.distance')}
            value={`${formatMeasure(summary.total_distance_km, locale)} ${t('units.km')}`}
            icon={<Route size={18} />}
          />
        </section>
      ) : null}

      {activity ? (
        <section className="grid gap-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-medium">{t('dashboard.chart7')}</h2>
            <CountChart data={activity.last7} emptyLabel={t('dashboard.zeroChart')} />
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-medium">{t('dashboard.chart30')}</h2>
            <CountChart data={activity.last30} emptyLabel={t('dashboard.zeroChart')} />
          </article>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-medium">{t('dashboard.recent')}</h2>
          <Link to="/workouts" className="text-sm text-emerald-700 hover:underline dark:text-emerald-300">
            {t('nav.workouts')}
          </Link>
        </div>
        {recent && recent.items.length === 0 ? (
          <p className="px-4 pb-5 text-sm text-slate-500">{t('dashboard.emptyRecent')}</p>
        ) : null}
        <ul>
          {recent?.items.map((item) => (
            <li key={item.id} className="border-t border-slate-100 dark:border-slate-800">
              <Link to={`/workouts/${item.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="text-xs text-slate-500">
                    {formatDate(item.workout_date, locale)} · {t(typeKey(item.workout_type))}
                  </span>
                </span>
                <span className="text-sm text-slate-500">{formatMinutes(item.duration_minutes, t)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
