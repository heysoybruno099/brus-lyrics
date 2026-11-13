export const DEFAULT_PRODUCTION_API = 'https://brus-lyrics-api.heysoybruno09.workers.dev';
export const DEFAULT_LOCAL_API = 'http://127.0.0.1:8787';

/**
 * Resolves the appropriate API Worker base URL.
 * Defaults to the production Cloudflare Worker API so all features (catalog, search, submission)
 * work smoothly out of the box in both local development and deployed production.
 * If VITE_API_URL is explicitly set in environment, that override is used.
 */
export function getApiBaseUrl(): string {
  const envUrl = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_API_URL : undefined;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return DEFAULT_PRODUCTION_API;
}
