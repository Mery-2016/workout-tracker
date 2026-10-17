import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { formatLocalDate } from '../src/dates';
import type { WorkoutDetails } from '../src/types';

const dbPath = path.join(os.tmpdir(), `workout-tracker-${Date.now()}-${Math.random().toString(16).slice(2)}.db`);

let app: Express;
let closeDb: () => void;

function today(): string {
  return formatLocalDate(new Date());
}

const sample = {
  title: 'Силовая ноги',
  workout_date: today(),
  start_time: '18:30',
  duration_minutes: 60,
  workout_type: 'strength',
  notes: 'Хорошая тренировка',
  exercises: [
    {
      name: 'Присед',
      sets: [
        { reps: 5, weight_kg: 100, distance_km: null, duration_seconds: null },
        { reps: 8, weight_kg: null, distance_km: null, duration_seconds: null },
      ],
    },
    {
      name: 'Бег',
      sets: [{ reps: 1, weight_kg: null, distance_km: 3.5, duration_seconds: 1200 }],
    },
  ],
};

beforeAll(() => {
  const created = createApp(dbPath);
  app = created.app;
  closeDb = () => created.db.close();
});

afterAll(() => {
  closeDb();
  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(dbPath + suffix, { force: true });
  }
});

describe('API тренировок и статистики', () => {
  it('проверяет сервер и внешние ключи', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, database: 'ok', foreign_keys: true });
  });

  it('на пустой базе отдаёт нули', async () => {
    const response = await request(app).get('/api/stats/summary?period=all');
    expect(response.status).toBe(200);
    expect(response.body.week_workouts).toBe(0);
    expect(response.body.month_workouts).toBe(0);
    expect(response.body.total_duration_minutes).toBe(0);
    expect(response.body.total_volume_kg).toBe(0);
    expect(response.body.total_distance_km).toBe(0);
    expect(response.body.period.workouts).toBe(0);
  });

  it('отклоняет неверные данные', async () => {
    const response = await request(app).post('/api/workouts').send({ title: '', workout_date: '2026-02-31' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  it('создаёт тренировку вместе с упражнениями и подходами', async () => {
    const response = await request(app).post('/api/workouts').send(sample);
    expect(response.status).toBe(201);
    const body = response.body as WorkoutDetails;
    expect(body.title).toBe(sample.title);
    expect(body.exercises).toHaveLength(2);
    expect(body.exercises[0].sets).toHaveLength(2);
    expect(body.exercises[0].sets[0].set_number).toBe(1);
    expect(body.exercises[0].sets[1].weight_kg).toBeNull();
  });

  it('считает объём и дистанцию только по заполненным полям', async () => {
    const response = await request(app).get('/api/stats/summary?period=all');
    expect(response.body.total_volume_kg).toBe(500);
    expect(response.body.total_distance_km).toBe(3.5);
    expect(response.body.total_duration_minutes).toBe(60);
    expect(response.body.total_exercises).toBe(2);
    expect(response.body.week_workouts).toBeGreaterThanOrEqual(1);
    expect(response.body.month_workouts).toBeGreaterThanOrEqual(1);
  });

  it('фильтрует, ищет и сортирует список', async () => {
    await request(app).post('/api/workouts').send({
      title: 'Утренняя йога',
      workout_date: '2020-01-02',
      start_time: null,
      duration_minutes: 20,
      workout_type: 'yoga',
      notes: null,
      exercises: [],
    });

    const search = await request(app).get('/api/workouts').query({ search: 'йога' });
    expect(search.body.total).toBe(1);
    expect(search.body.items[0].title).toBe('Утренняя йога');
    expect(search.body.items[0].exercise_count).toBe(0);

    const byType = await request(app).get('/api/workouts').query({ type: 'strength' });
    expect(byType.body.total).toBe(1);

    const sorted = await request(app).get('/api/workouts').query({ sort: 'asc', limit: 1, page: 1 });
    expect(sorted.body.items[0].workout_date).toBe('2020-01-02');
    expect(sorted.body.total).toBe(2);

    const oldPeriod = await request(app).get('/api/stats/summary').query({ period: '7d' });
    expect(oldPeriod.body.period.workouts).toBe(1);
    expect(oldPeriod.body.total_volume_kg).toBe(500);
  });

  it('обновляет состав и не оставляет старые упражнения', async () => {
    const list = await request(app).get('/api/workouts').query({ search: 'Силовая' });
    const id = list.body.items[0].id as number;
    const updated = await request(app).put(`/api/workouts/${id}`).send({
      title: 'Силовая ноги',
      workout_date: today(),
      start_time: '19:00',
      duration_minutes: 45,
      workout_type: 'strength',
      notes: 'Короче',
      exercises: [
        {
          name: 'Жим',
          sets: [{ reps: 6, weight_kg: 80, distance_km: null, duration_seconds: null }],
        },
      ],
    });
    expect(updated.status).toBe(200);
    expect(updated.body.exercises).toHaveLength(1);
    expect(updated.body.exercises[0].name).toBe('Жим');
    expect(updated.body.duration_minutes).toBe(45);

    const stats = await request(app).get('/api/stats/exercises').query({ period: 'all', exercise: 'Жим' });
    expect(stats.body.names).toContain('Жим');
    expect(stats.body.names).not.toContain('Присед');
    expect(stats.body.weight_series[0].weight_kg).toBe(80);
    expect(stats.body.top[0].total_volume_kg).toBe(480);
  });

  it('удаляет тренировку каскадом и возвращает 404 повторно', async () => {
    const list = await request(app).get('/api/workouts');
    const id = list.body.items[0].id as number;
    const removed = await request(app).delete(`/api/workouts/${id}`);
    expect(removed.status).toBe(200);
    const missing = await request(app).get(`/api/workouts/${id}`);
    expect(missing.status).toBe(404);
    const again = await request(app).delete(`/api/workouts/${id}`);
    expect(again.status).toBe(404);
  });

  it('откатывает транзакцию, если дочерняя запись неверна', () => {
    const created = createApp(dbPath);
    const before = created.db.prepare('SELECT COUNT(*) AS c FROM workouts').get() as { c: number };
    expect(() => {
      const now = new Date().toISOString();
      const tx = created.db.transaction(() => {
        created.db
          .prepare(
            `INSERT INTO workouts
              (title, workout_date, start_time, duration_minutes, workout_type, notes, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run('Слом', '2026-01-01', null, 10, 'other', null, now, now);
        created.db
          .prepare('INSERT INTO exercises (workout_id, name, position, created_at) VALUES (?, ?, ?, ?)')
          .run(999999, 'нет родителя', 0, now);
      });
      tx();
    }).toThrow();
    const after = created.db.prepare('SELECT COUNT(*) AS c FROM workouts').get() as { c: number };
    expect(after.c).toBe(before.c);
    created.db.close();
  });
});
