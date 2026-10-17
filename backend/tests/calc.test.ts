import { describe, expect, it } from 'vitest';
import {
  distanceFromSets,
  isRealDate,
  periodBounds,
  volumeFromSets,
  weekRange,
} from '../src/dates';

describe('расчёты и даты', () => {
  it('считает объём только там, где указан вес', () => {
    const volume = volumeFromSets([
      { reps: 5, weight_kg: 100 },
      { reps: 8, weight_kg: null },
      { reps: 10, weight_kg: 0 },
    ]);
    expect(volume).toBe(500);
  });

  it('суммирует только введённую дистанцию', () => {
    expect(
      distanceFromSets([{ distance_km: 3.5 }, { distance_km: null }, { distance_km: 1 }]),
    ).toBe(4.5);
  });

  it('отклоняет несуществующую дату', () => {
    expect(isRealDate('2026-02-31')).toBe(false);
    expect(isRealDate('2026-10-16')).toBe(true);
  });

  it('неделя начинается с понедельника', () => {
    expect(weekRange(new Date(2026, 9, 16))).toEqual({
      from: '2026-10-12',
      to: '2026-10-18',
    });
  });

  it('период 7 дней включает сегодня и шесть предыдущих', () => {
    expect(periodBounds('7d', new Date(2026, 9, 16))).toEqual({
      from: '2026-10-10',
      to: '2026-10-16',
    });
    expect(periodBounds('all', new Date(2026, 9, 16)).from).toBeNull();
  });
});
