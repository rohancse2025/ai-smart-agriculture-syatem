import { translations } from '../translations';

/**
 * A custom hook for handling multi-language translations.
 * @param lang The current language code (e.g., "EN", "HI", "MR", "KN")
 * @returns An object containing the translation function `t`
 */
export const useTranslation = (lang: string) => {
  const t = (key: string, replacements?: Record<string, string | number>): string => {
    // 1. Get translations for the current language
    const currentLang = (translations as any)[lang] || (translations as any)['EN'];
    
    // 2. Get the raw string
    let value = (currentLang && currentLang[key]) ? currentLang[key] : ((translations as any)['EN'][key] || key);
    
    // 3. Process replacements if any
    if (replacements && typeof value === 'string') {
      Object.entries(replacements).forEach(([k, v]) => {
        value = value.replace(`{${k}}`, String(v));
      });
    }
    
    return value;
  };

  return { t };
};
