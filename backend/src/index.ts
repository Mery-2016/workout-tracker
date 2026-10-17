import path from 'node:path';
import { createApp } from './app';
import { defaultDbPath } from './db';

const dbPath = process.env.WORKOUT_DB_PATH
  ? path.resolve(process.env.WORKOUT_DB_PATH)
  : defaultDbPath();
const port = Number(process.env.PORT || 3001);

const { app } = createApp(dbPath);

app.listen(port, () => {
  console.log(`Workout Tracker API: http://localhost:${port}`);
  console.log(`База данных: ${dbPath}`);
});
