const STORAGE_KEY = "yoyo-news-config";

export interface UserConfig {
  country: string;
  language: string;
  category: string;
}

export const DEFAULT_CONFIG: UserConfig = {
  country: "US",
  language: "en",
  category: "sports",
};

export const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "ES", label: "Spain" },
];

export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
];

export const CATEGORIES = [
  { value: "sports", label: "Sports" },
  { value: "economy", label: "Economy" },
];

export function loadConfig(): UserConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: UserConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
