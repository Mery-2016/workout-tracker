import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../i18n/LanguageContext';
import { shortDate } from '../lib/format';
import { useTheme } from '../theme/ThemeContext';

const barColor = '#f97316';

export function CountChart({
  data,
  emptyLabel,
}: {
  data: Array<{ date: string; count: number }>;
  emptyLabel: string;
}) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const peak = Math.max(1, ...data.map((item) => item.count));
  const barSize = data.length <= 8 ? 96 : data.length <= 16 ? 56 : 36;
  const plotWidth = data.length <= 8 ? '100%' : `${Math.max(1100, data.length * 64)}px`;
  const axis = theme === 'dark' ? '#94a3b8' : '#64748b';
  const grid = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <div>
      {total === 0 ? <p className="mb-2 text-sm text-slate-500">{emptyLabel}</p> : null}
      <div className="h-[32rem] overflow-x-auto">
        <div className="h-full" style={{ width: plotWidth, minWidth: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.map((item) => ({ ...item, label: shortDate(item.date) }))} barCategoryGap="12%">
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: axis, fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, peak]} allowDecimals={false} tick={{ fill: axis, fontSize: 13 }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              formatter={(value) => [value, t('chart.workouts')]}
              labelFormatter={(_label, payload) => {
                const row = payload?.[0]?.payload as { date?: string } | undefined;
                return row?.date ?? '';
              }}
            />
            <Bar dataKey="count" fill={barColor} radius={[10, 10, 0, 0]} barSize={barSize} maxBarSize={120} />
          </BarChart>
        </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function WeekdayChart({ data }: { data: Array<{ label: string; count: number }> }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const axis = theme === 'dark' ? '#94a3b8' : '#64748b';
  const grid = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  const peak = Math.max(1, ...data.map((item) => item.count));

  return (
    <div className="h-[32rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barCategoryGap="12%">
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: axis, fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, peak]} allowDecimals={false} tick={{ fill: axis, fontSize: 13 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip formatter={(value) => [value, t('chart.workouts')]} />
          <Bar dataKey="count" fill={barColor} radius={[10, 10, 0, 0]} barSize={72} maxBarSize={96} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeightChart({ data }: { data: Array<{ date: string; weight_kg: number }> }) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const axis = theme === 'dark' ? '#94a3b8' : '#64748b';
  const grid = theme === 'dark' ? '#1e293b' : '#e2e8f0';

  return (
    <div className="h-[32rem]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((item) => ({ ...item, label: shortDate(item.date) }))}>
          <CartesianGrid stroke={grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fill: axis, fontSize: 13 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: axis, fontSize: 13 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            formatter={(value) => [value, t('chart.weight')]}
            labelFormatter={(_label, payload) => {
              const row = payload?.[0]?.payload as { date?: string } | undefined;
              return row?.date ?? '';
            }}
          />
          <Line type="monotone" dataKey="weight_kg" stroke={barColor} strokeWidth={4} dot={{ r: 6, fill: barColor }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
