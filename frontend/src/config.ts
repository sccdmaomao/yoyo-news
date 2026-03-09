const STORAGE_KEY = "yoyo-news-config";

export interface UserConfig {
  countries: string[];
  language: string;
}

export const DEFAULT_CONFIG: UserConfig = {
  countries: ["us"],
  language: "en",
};

export const COUNTRIES = [
  { value: "canada", label: "Canada" },
  { value: "china", label: "China" },
  { value: "us", label: "United States" },
];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese" },
];

export function loadConfig(): UserConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserConfig & { country?: string; category?: string }>;
      // Migrate old single country to countries array
      const countries = Array.isArray(parsed.countries)
        ? parsed.countries
        : parsed.country
          ? [parsed.country.toLowerCase()]
          : DEFAULT_CONFIG.countries;
      const validCountries = countries.filter((c) => COUNTRIES.some((o) => o.value === c));
      return {
        countries: validCountries.length > 0 ? validCountries : DEFAULT_CONFIG.countries,
        language: LANGUAGES.some((o) => o.value === parsed.language) ? parsed.language! : DEFAULT_CONFIG.language,
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: UserConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
