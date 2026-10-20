import 'dotenv/config';
import { createApp } from './app';
import { createPgDatabase } from './db';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Нет DATABASE_URL. Создайте файл backend/.env по образцу .env.example');
  process.exit(1);
}
if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
  console.error('Нет AUTH_SECRET. Добавьте в backend/.env длинную секретную строку, не короче 16 символов.');
  process.exit(1);
}

const { app } = createApp(createPgDatabase(connectionString));
const port = Number(process.env.PORT || 3001);

app.listen(port, () => {
  console.log(`Workout Tracker API: http://localhost:${port}`);
});
