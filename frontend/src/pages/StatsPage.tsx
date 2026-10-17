import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CountChart, WeekdayChart, WeightChart } from '../components/Charts';
import { StatCard } from '../components/StatCard';
import { useI18n } from '../i18n/LanguageContext';
import type { TranslationKey } from '../i18n/translations';
import { formatMeasure, formatMinutes } from '../lib/format';
import type { ActivityResponse, ExerciseStatsResponse, SummaryResponse } from '../types';
import { CalendarRange, Clock3, Dumbbell, Weight } from 'lucide-react';

const periods = [
  { id: '7d', key: 'stats.p7' },
  { id: '30d', key: 'stats.p30' },
  { id: '90d', key: 'stats.p90' },
  { id: 'all', key: 'stats.pall' },
] as const;

const weekdayKeys: TranslationKey[] = [
  'weekdays.sun',
  'weekdays.mon',
  'weekdays.tue',
  'weekdays.wed',
  'weekdays.thu',
  'weekdays.fri',
  'weekdays.sat',
];

const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];

export function StatsPage() {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<(typeof periods)[number]['id']>('30d');
  const [exercise, setExercise] = useState('');
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [exercises, setExercises] = useState<ExerciseStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ period });
    if (exercise) params.set('exercise', exercise);
    setLoading(true);
    setError(null);
    Promise.all([
      api<SummaryResponse>(`/api/stats/summary?period=${period}`, { signal: controller.signal }),
      api<ActivityResponse>(`/api/stats/activity?period=${period}`, { signal: controller.signal }),
      api<ExerciseStatsResponse>(`/api/stats/exercises?${params}`, { signal: controller.signal }),
    ])
      .then(([summaryData, activityData, exerciseData]) => {
        setSummary(summaryData);
        setActivity(activityData);
        setExercises(exerciseData);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(t('errors.load'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [period, exercise, t]);

  const weekdayData =
    activity?.by_weekday.map((item) => ({
      weekday: item.weekday,
      count: item.count,
    })) ?? [];
  const orderedWeekdays = weekdayOrder.map((weekday) => ({
    label: t(weekdayKeys[weekday]),
    count: weekdayData.find((item) => item.weekday === weekday)?.count ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t('stats.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('stats.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('stats.period')}>
          {periods.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`rounded-xl px-3 py-2 text-sm ${
                period === item.id
                  ? 'bg-emerald-600 text-white'
                  : 'border border-slate-300 dark:border-slate-700'
              }`}
            >
              {t(item.key)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {summary ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label={t('stats.periodCount')} value={String(summary.period.workouts)} icon={<Dumbbell size={18} />} />
          <StatCard label={t('stats.week')} value={String(summary.week_workouts)} icon={<CalendarRange size={18} />} />
          <StatCard label={t('stats.month')} value={String(summary.month_workouts)} icon={<CalendarRange size={18} />} />
          <StatCard
            label={t('stats.time')}
            value={formatMinutes(summary.period.duration_minutes, t)}
            icon={<Clock3 size={18} />}
          />
          <StatCard
            label={t('stats.volume')}
            value={`${formatMeasure(summary.period.volume_kg, locale)} ${t('units.kg')}`}
            hint={`${t('stats.distance')}: ${formatMeasure(summary.period.distance_km, locale)} ${t('units.km')}`}
            icon={<Weight size={18} />}
          />
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-medium">{t('stats.activity')}</h2>
          {activity ? <CountChart data={activity.series} emptyLabel={t('dashboard.zeroChart')} /> : null}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="mb-3 font-medium">{t('stats.weekday')}</h2>
          <WeekdayChart data={orderedWeekdays} />
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-medium">{t('stats.top')}</h2>
          {exercises && exercises.top.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t('stats.noExercises')}</p>
          ) : null}
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {exercises?.top.map((item) => (
              <li key={item.name} className="flex items-center justify-between gap-3 py-3 text-sm">
                <button type="button" className="text-left font-medium hover:text-emerald-700" onClick={() => setExercise(item.name)}>
                  {item.name}
                </button>
                <span className="text-slate-500">
                  {item.count} {t('stats.sessions')} · {item.total_sets} {t('stats.sets')}
                  {item.total_volume_kg > 0 ? ` · ${formatMeasure(item.total_volume_kg, locale)} ${t('units.kg')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-medium">{t('stats.weightTitle')}</h2>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-slate-500">{t('stats.weightHint')}</span>
            <select
              value={exercise}
              onChange={(event) => setExercise(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">{t('stats.weightHint')}</option>
              {exercises?.names.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4">
            {!exercise ? <p className="text-sm text-slate-500">{t('stats.weightHint')}</p> : null}
            {exercise && !loading && exercises && exercises.weight_series.length === 0 ? (
              <p className="text-sm text-slate-500">{t('stats.noWeight')}</p>
            ) : null}
            {exercise && exercises && exercises.weight_series.length > 0 ? (
              <WeightChart data={exercises.weight_series} />
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}
