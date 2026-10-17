import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ru, uz, type TranslationKey } from './translations';

export type Language = 'ru' | 'uz';

interface LanguageValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  locale: string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

function readLanguage(): Language {
  return localStorage.getItem('wt-lang') === 'uz' ? 'uz' : 'ru';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(readLanguage);

  useEffect(() => {
    localStorage.setItem('wt-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      setLang: setLangState,
      t: (key) => (lang === 'ru' ? ru[key] : uz[key]),
      locale: lang === 'ru' ? 'ru-RU' : 'uz-UZ',
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is missing');
  return value;
}
