import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useI18n, type Language } from '../i18n/LanguageContext';
import { useTheme, type Theme } from '../theme/ThemeContext';

export function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [health, setHealth] = useState<'loading' | 'ok' | 'fail'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    api<{ ok: boolean; database: string }>('/api/health', { signal: controller.signal })
      .then((result) => setHealth(result.ok && result.database === 'ok' ? 'ok' : 'fail'))
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setHealth('fail');
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-medium">{t('settings.aboutTitle')}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('settings.aboutText')}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-medium">{t('settings.unitsTitle')}</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <li>{t('settings.kg')}</li>
          <li>{t('settings.km')}</li>
          <li>{t('settings.min')}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-medium">{t('settings.storageTitle')}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{t('settings.storageText')}</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-medium">{t('settings.appearance')}</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {(['ru', 'uz'] as Language[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLang(item)}
              className={`rounded-xl px-3 py-2 text-sm ${
                lang === item ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-700'
              }`}
            >
              {item === 'ru' ? t('lang.ru') : t('lang.uz')}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['light', 'dark'] as Theme[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTheme(item)}
              className={`rounded-xl px-3 py-2 text-sm ${
                theme === item ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-slate-700'
              }`}
            >
              {item === 'light' ? t('theme.light') : t('theme.dark')}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="font-medium">{t('settings.health')}</h2>
        <p className="mt-2 text-sm">
          {health === 'loading' ? t('common.loading') : null}
          {health === 'ok' ? t('settings.healthOk') : null}
          {health === 'fail' ? t('settings.healthFail') : null}
        </p>
        <button
          type="button"
          onClick={() => {
            setHealth('loading');
            api<{ ok: boolean; database: string }>('/api/health')
              .then((result) => setHealth(result.ok && result.database === 'ok' ? 'ok' : 'fail'))
              .catch(() => setHealth('fail'));
          }}
          className="mt-3 text-sm text-emerald-700 underline dark:text-emerald-300"
        >
          {t('common.retry')}
        </button>
      </section>
    </div>
  );
}
