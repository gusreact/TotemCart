export type Language = 'es' | 'en'

const LANGUAGE_STORAGE_KEY = 'totemcart-language'

export function readStoredLanguage(): Language | null {
  const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  return language === 'es' || language === 'en' ? language : null
}

export function storeLanguage(language: Language): void {
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
}
