import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { SupportedLanguage } from '../types/models';
import fiTranslations from './locales/fi.json';
import enTranslations from './locales/en.json';

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  localeCode: string;
}

/**
 * Central SUPPORTED_LANGUAGES config array.
 * Adding a new language (e.g., 'sv' or 'es') requires only adding a JSON file and one entry here.
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'fi', label: 'FI', localeCode: 'fi-FI' },
  { code: 'en', label: 'EN', localeCode: 'en-US' },
];

const LANGUAGE_STORAGE_KEY = 'club36_preferred_language';

function getInitialLanguage(): SupportedLanguage {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as SupportedLanguage | null;
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
  } catch {
    // ignore storage errors
  }
  return 'fi'; // Default language: Finnish ('fi')
}

void i18n.use(initReactI18next).init({
  resources: {
    fi: { translation: fiTranslations },
    en: { translation: enTranslations },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'fi',
  interpolation: {
    escapeValue: false,
  },
});

export function setAppLanguage(lang: SupportedLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // ignore storage errors
  }
  void i18n.changeLanguage(lang);
}

export function formatLocalizedDate(isoDate: string, lang: SupportedLanguage = 'fi'): string {
  try {
    const [year, month, day] = isoDate.split('-').map(Number);
    const dateObj = new Date(year, (month || 1) - 1, day || 1);
    const locale = lang === 'fi' ? 'fi-FI' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(dateObj);
  } catch {
    return isoDate;
  }
}

export default i18n;
