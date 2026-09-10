export const GEMINI_API_KEY_STORAGE_KEY = 'personal_ai_gemini_api_key';

/**
 * Retrieves the user-provided Gemini API key from localStorage.
 */
export function getStoredGeminiApiKey(): string {
  if (typeof window === 'undefined') return '';
  try {
    const key = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    return key ? key.trim() : '';
  } catch {
    return '';
  }
}

/**
 * Saves the user-provided Gemini API key into localStorage.
 */
export function setStoredGeminiApiKey(apiKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = apiKey ? apiKey.trim() : '';
    if (trimmed) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota/access errors
  }
}

/**
 * Removes the stored Gemini API key from localStorage.
 */
export function removeStoredGeminiApiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Checks whether an API key is stored.
 */
export function hasStoredGeminiApiKey(): boolean {
  return Boolean(getStoredGeminiApiKey());
}
