import type { TranslationKey } from '../i18n/translations';
import type { WorkoutType } from '../types';

const typeKeys: Record<WorkoutType, TranslationKey> = {
  strength: 'types.strength',
  cardio: 'types.cardio',
  stretching: 'types.stretching',
  yoga: 'types.yoga',
  functional: 'types.functional',
  other: 'types.other',
};

export function typeKey(type: WorkoutType): TranslationKey {
  return typeKeys[type];
}

export function formatDate(value: string, locale: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMinutes(minutes: number, t: (key: TranslationKey) => string): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest} ${t('units.min')}`;
  if (rest === 0) return `${hours} ${t('units.h')}`;
  return `${hours} ${t('units.h')} ${rest} ${t('units.min')}`;
}

export function formatMeasure(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

export function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function shortDate(value: string): string {
  const [, month, day] = value.split('-');
  return `${day}.${month}`;
}
