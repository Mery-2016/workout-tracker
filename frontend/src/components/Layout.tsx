import { BarChart3, Dumbbell, LayoutDashboard, Menu, Moon, Plus, Settings, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useI18n, type Language } from '../i18n/LanguageContext';
import { useTheme } from '../theme/ThemeContext';

const links = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/workouts', key: 'nav.workouts', icon: Dumbbell, end: true },
  { to: '/stats', key: 'nav.stats', icon: BarChart3, end: false },
  { to: '/settings', key: 'nav.settings', icon: Settings, end: false },
] as const;

export function Layout() {
  const { t, lang, setLang, locale } = useI18n();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const message = (location.state as { flash?: string } | null)?.flash;
    if (!message) return;
    setFlash(message);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const today = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen">
      {open ? (
        <button
          type="button"
          aria-label={t('common.close')}
          className="fixed inset-0 z-20 bg-slate-950/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-white px-4 py-5 transition-transform dark:border-slate-800 dark:bg-slate-900 ${
          open ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="flex items-center gap-3 px-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white">
            WT
          </span>
          <div>
            <p className="font-semibold">{t('app.name')}</p>
            <p className="text-xs text-slate-500">SQLite</p>
          </div>
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`
                }
              >
                <Icon size={18} />
                {t(link.key)}
              </NavLink>
            );
          })}
        </nav>
        <NavLink
          to="/workouts/new"
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Plus size={18} />
          {t('dashboard.add')}
        </NavLink>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-slate-200 bg-slate-100/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <button
            type="button"
            className="rounded-xl p-2 hover:bg-white md:hidden dark:hover:bg-slate-800"
            aria-label={t('nav.menu')}
            onClick={() => setOpen(true)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{t('app.name')}</p>
            <p className="truncate text-xs capitalize text-slate-500">{today}</p>
          </div>
          <label className="sr-only" htmlFor="lang-switch">
            {t('lang.label')}
          </label>
          <select
            id="lang-switch"
            value={lang}
            onChange={(event) => setLang(event.target.value as Language)}
            className="rounded-xl border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="ru">{t('lang.ru')}</option>
            <option value="uz">{t('lang.uz')}</option>
          </select>
          <button
            type="button"
            onClick={toggle}
            aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
            className="rounded-xl border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        {flash ? (
          <div className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 md:mx-8 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            {flash}
          </div>
        ) : null}

        <main className="px-4 py-5 md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
