import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '@/lib/translations';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const I18nContext = createContext(null);
const STORAGE_KEY = 'saqr_lang';

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'ar';
  });
  const { user } = useAuth();
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // Set document lang/dir immediately and persist
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, dir]);

  // When user logs in, sync to their saved preference
  useEffect(() => {
    if (!user?.id) return;
    const saved = user.preferred_language;
    if (saved && saved !== lang) {
      setLangState(saved);
    } else if (!saved) {
      // Save current local choice to profile
      base44.auth.updateMe({ preferred_language: lang }).catch(() => {});
    }
  }, [user?.id]);

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    if (user?.id) {
      base44.auth.updateMe({ preferred_language: newLang }).catch(() => {});
    }
  }, [user?.id]);

  const t = useCallback((key) => {
    const keys = key.split('.');
    let result = translations[lang];
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) break;
    }
    return result !== undefined ? result : key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, dir, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) return { lang: 'ar', setLang: () => {}, dir: 'rtl', t: (k) => k };
  return ctx;
}

/**
 * Get a localized content field from an entity.
 * Returns item[field_en] if lang is 'en' and it exists, else item[field].
 */
export function localized(item, field, lang) {
  if (!item) return '';
  const enField = `${field}_en`;
  if (lang === 'en' && item[enField]) return item[enField];
  return item[field] || item[enField] || '';
}