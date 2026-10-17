import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useI18n } from '../i18n/LanguageContext';
import { formatDate, formatMinutes, typeKey } from '../lib/format';
import { WORKOUT_TYPES, type WorkoutListResponse, type WorkoutType } from '../types';

export function WorkoutsPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'' | WorkoutType>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<WorkoutListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ sort, page: String(page), limit: '8' });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    setLoading(true);
    setError(null);
    api<WorkoutListResponse>(`/api/workouts?${params}`, { signal: controller.signal })
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(t('errors.load'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [search, type, from, to, sort, page, t]);

  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 8));

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api(`/api/workouts/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      setData((current) =>
        current ? { ...current, items: current.items.filter((item) => item.id !== deleteId), total: current.total - 1 } : current,
      );
      navigate('/workouts', { state: { flash: t('common.deleted') } });
    } catch {
      setError(t('errors.server'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t('workouts.title')}</h1>
        <Link
          to="/workouts/new"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus size={18} />
          {t('dashboard.add')}
        </Link>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-6 dark:border-slate-800 dark:bg-slate-900">
        <label className="xl:col-span-2">
          <span className="mb-1 block text-xs text-slate-500">{t('common.search')}</span>
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={t('workouts.searchPlaceholder')}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">{t('form.type')}</span>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as '' | WorkoutType);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">{t('common.all')}</option>
            {WORKOUT_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(typeKey(item))}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">{t('workouts.dateFrom')}</span>
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-slate-500">{t('workouts.dateTo')}</span>
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setSort((current) => (current === 'desc' ? 'asc' : 'desc'));
              setPage(1);
            }}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
          >
            {sort === 'desc' ? t('workouts.sortNewest') : t('workouts.sortOldest')}
          </button>
        </div>
        <div className="flex items-end xl:col-span-6">
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setType('');
              setFrom('');
              setTo('');
              setSort('desc');
              setPage(1);
            }}
            className="text-sm text-slate-600 underline dark:text-slate-300"
          >
            {t('common.reset')}
          </button>
        </div>
      </div>

      {loading ? <p className="text-sm text-slate-500">{t('common.loading')}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {data && data.items.length === 0 && !loading ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
          {t('workouts.empty')}
        </p>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3">{t('workouts.colDate')}</th>
                  <th className="px-4 py-3">{t('workouts.colTitle')}</th>
                  <th className="px-4 py-3">{t('workouts.colType')}</th>
                  <th className="px-4 py-3">{t('workouts.colDuration')}</th>
                  <th className="px-4 py-3">{t('workouts.colExercises')}</th>
                  <th className="px-4 py-3">{t('workouts.colNotes')}</th>
                  <th className="px-4 py-3">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(item.workout_date, locale)}</td>
                    <td className="px-4 py-3 font-medium">{item.title}</td>
                    <td className="px-4 py-3">{t(typeKey(item.workout_type))}</td>
                    <td className="px-4 py-3">{formatMinutes(item.duration_minutes, t)}</td>
                    <td className="px-4 py-3">{item.exercise_count}</td>
                    <td className="max-w-48 truncate px-4 py-3 text-slate-500">{item.notes || t('common.dash')}</td>
                    <td className="px-4 py-3">
                      <RowActions id={item.id} onDelete={() => setDeleteId(item.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {data.items.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(item.workout_date, locale)} · {t(typeKey(item.workout_type))}
                </p>
                <p className="mt-2 text-sm">
                  {formatMinutes(item.duration_minutes, t)} · {item.exercise_count}
                </p>
                <p className="mt-1 text-sm text-slate-500">{item.notes || t('common.dash')}</p>
                <div className="mt-3">
                  <RowActions id={item.id} onDelete={() => setDeleteId(item.id)} />
                </div>
              </article>
            ))}
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-slate-500">
              {t('workouts.page')} {data.page} {t('workouts.of')} {pages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-40 dark:border-slate-700"
              >
                {t('workouts.prev')}
              </button>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-xl border border-slate-300 px-3 py-2 disabled:opacity-40 dark:border-slate-700"
              >
                {t('workouts.next')}
              </button>
            </div>
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={deleteId !== null}
        busy={deleting}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function RowActions({ id, onDelete }: { id: number; onDelete: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-1">
      <Link to={`/workouts/${id}`} aria-label={t('common.view')} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
        <Eye size={16} />
      </Link>
      <Link to={`/workouts/${id}/edit`} aria-label={t('common.edit')} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
        <Pencil size={16} />
      </Link>
      <button type="button" aria-label={t('common.delete')} onClick={onDelete} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950">
        <Trash2 size={16} />
      </button>
    </div>
  );
}
