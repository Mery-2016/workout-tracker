import { FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

export function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const { t } = useI18n();
  const { theme } = useTheme();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') await register(name, email, password);
      else await login(email, password);
    } catch (reason) {
      if (reason instanceof ApiError && reason.code === 'email_taken') setError(t('auth.emailTaken'));
      else if (reason instanceof ApiError && reason.code === 'invalid_login') setError(t('auth.invalidLogin'));
      else if (reason instanceof ApiError && reason.code === 'validation') setError(t('auth.validation'));
      else setError(t('errors.server'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white">
            WT
          </span>
          <div>
            <p className="font-semibold">{t('app.name')}</p>
            <p className="text-xs text-slate-500">{theme === 'dark' ? t('theme.dark') : t('theme.light')}</p>
          </div>
        </div>
        <h1 className="text-2xl font-semibold">{mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}</h1>
        <div className="mt-5 space-y-3">
          {mode === 'register' ? (
            <label className="block text-sm">
              {t('auth.name')}
              <input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          ) : null}
          <label className="block text-sm">
            {t('auth.email')}
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          <label className="block text-sm">
            {t('auth.password')}
            <input
              required
              type="password"
              minLength={mode === 'register' ? 8 : 1}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
            />
            {mode === 'register' ? <span className="mt-1 block text-xs text-slate-500">{t('auth.passwordHint')}</span> : null}
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || loading}
          className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {busy ? t('common.loading') : mode === 'login' ? t('auth.submitLogin') : t('auth.submitRegister')}
        </button>
        <button
          type="button"
          className="mt-3 w-full text-sm text-emerald-700 dark:text-emerald-300"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError(null);
          }}
        >
          {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
        </button>
      </form>
    </div>
  );
}
