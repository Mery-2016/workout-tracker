import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <article className="stat-card-3d rounded-2xl border border-white/80 p-4 dark:border-slate-700">
      <div className="relative z-10 flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <span className="stat-icon-3d rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {icon}
        </span>
      </div>
      <p className="relative z-10 mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="relative z-10 mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </article>
  );
}
