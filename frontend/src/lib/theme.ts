import { useState, useEffect } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type EffectiveTheme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'novacdb_theme';

export function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  try {
    const urlParam = new URLSearchParams(window.location.search).get('theme');
    if (urlParam === 'light' || urlParam === 'dark') {
      return urlParam;
    }
  } catch {}
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export function applyTheme(preference: ThemePreference): EffectiveTheme {
  const effective: EffectiveTheme =
    preference === 'system' ? getSystemTheme() : preference;

  if (effective === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }

  return effective;
}

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(getStoredThemePreference);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    applyTheme(getStoredThemePreference())
  );

  const setPreference = (newPref: ThemePreference) => {
    localStorage.setItem(THEME_STORAGE_KEY, newPref);
    setPreferenceState(newPref);
    const eff = applyTheme(newPref);
    setEffectiveTheme(eff);
  };

  useEffect(() => {
    const eff = applyTheme(preference);
    setEffectiveTheme(eff);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (getStoredThemePreference() === 'system') {
        const updated = applyTheme('system');
        setEffectiveTheme(updated);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preference]);

  return { preference, effectiveTheme, setPreference };
}
