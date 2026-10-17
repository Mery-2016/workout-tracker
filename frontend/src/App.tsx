import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LanguageProvider } from './i18n/LanguageContext';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { WorkoutDetailPage } from './pages/WorkoutDetailPage';
import { WorkoutFormPage } from './pages/WorkoutFormPage';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { ThemeProvider } from './theme/ThemeContext';

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="workouts" element={<WorkoutsPage />} />
              <Route path="workouts/new" element={<WorkoutFormPage />} />
              <Route path="workouts/:id" element={<WorkoutDetailPage />} />
              <Route path="workouts/:id/edit" element={<WorkoutFormPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}
