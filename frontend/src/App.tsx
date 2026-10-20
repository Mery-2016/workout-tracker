import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, AuthProvider } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { LanguageProvider } from './i18n/LanguageContext';
import { useI18n } from './i18n/LanguageContext';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { WorkoutDetailPage } from './pages/WorkoutDetailPage';
import { WorkoutFormPage } from './pages/WorkoutFormPage';
import { WorkoutsPage } from './pages/WorkoutsPage';
import { ThemeProvider } from './theme/ThemeContext';

function RequireAuth() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  if (loading) return <p className="p-8 text-sm text-slate-500">{t('common.loading')}</p>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

export function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireAuth />}>
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
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
