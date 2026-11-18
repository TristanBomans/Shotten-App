/**
 * Language preference (no React imports so both client code and plain lib
 * utilities like dateUtils can read it).
 */

export type Language = 'en' | 'nl' | 'fr';

export const LANGUAGES: Language[] = ['en', 'nl', 'fr'];

export const LANGUAGE_STORAGE_KEY = 'language';
export const LANGUAGE_EVENT = 'languageChanged';

/** Default when nothing is stored (matches the pre-existing UI language). */
export const DEFAULT_LANGUAGE: Language = 'en';

export function getLanguage(): Language {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return DEFAULT_LANGUAGE;
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return LANGUAGES.includes(stored as Language) ? (stored as Language) : DEFAULT_LANGUAGE;
}

export function setLanguage(language: Language): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.setAttribute('lang', language);
    window.dispatchEvent(new CustomEvent<Language>(LANGUAGE_EVENT, { detail: language }));
}

/** Locale used for date/time formatting, following the language preference. */
export function dateLocale(): string {
    switch (getLanguage()) {
        case 'nl':
            return 'nl-BE';
        case 'fr':
            return 'fr-BE';
        default:
            return 'en-GB';
    }
}
