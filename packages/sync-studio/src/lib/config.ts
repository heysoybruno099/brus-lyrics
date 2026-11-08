export const DEFAULT_PRODUCTION_API = 'https://brus-lyrics-api.heysoybruno09.workers.dev';
export const DEFAULT_LOCAL_API = 'http://127.0.0.1:8787';

/**
 * Resolves the appropriate API Worker base URL.
 * In production (e.g. brus-lyrics.pages.dev), it automatically routes to the live Cloudflare Worker.
 * In local development, it checks VITE_API_URL or defaults to local worker at http://127.0.0.1:8787.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return (import.meta as any).env?.VITE_API_URL || DEFAULT_LOCAL_API;
    }
  }
  return (import.meta as any).env?.VITE_API_URL || DEFAULT_PRODUCTION_API;
}
