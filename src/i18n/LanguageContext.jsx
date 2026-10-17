import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { translations } from './translations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'tinzel_language';

/**
 * Holds the visitor's chosen language ('en' | 'sw' | null).
 * `null` means the visitor has not chosen yet, so the language
 * selection page is shown first on every fresh visit.
 */
export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(null);

  const setLang = useCallback((next) => {
    setLangState(next);
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, next);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable, ignore */
    }
  }, []);

  const value = useMemo(() => {
    const active = lang || 'en';
    /** Look up a UI string. Supports {placeholders} via the vars object. */
    const t = (key, vars) => {
      const entry = translations[key];
      let text = entry ? entry[active] ?? entry.en : key;
      if (vars) {
        Object.keys(vars).forEach((name) => {
          text = text.replace(new RegExp(`\\{${name}\\}`, 'g'), vars[name]);
        });
      }
      return text;
    };
    return { lang, setLang, t, isSwahili: active === 'sw' };
  }, [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

/**
 * Pick the localized value of a form property.
 * For Swahili reads `${key}Sw` and falls back to the English value when empty.
 */
export function localized(obj, key, lang) {
  if (!obj) return '';
  if (lang === 'sw') {
    const sw = obj[`${key}Sw`];
    if (typeof sw === 'string' && sw.trim()) return sw;
  }
  return obj[key] ?? '';
}

/**
 * Localized option/row list. Swahili entries are matched by index with the
 * English list (answers are always stored with the English value).
 */
export function localizedList(obj, key, lang) {
  const base = obj?.[key] || [];
  if (lang !== 'sw') return base;
  const sw = obj?.[`${key}Sw`] || [];
  return base.map((item, index) => (String(sw[index] || '').trim() ? sw[index] : item));
}
