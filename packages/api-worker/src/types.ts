import type { D1Database } from '@cloudflare/workers-types';
import type { CatalogEntry } from '@brus-lyrics/shared-types';

export interface Env {
  DB?: D1Database;
  ENVIRONMENT?: string;
  GITHUB_TOKEN?: string;
  GITHUB_OWNER?: string;
  GITHUB_REPO?: string;
  GITHUB_BRANCH?: string;
  LOCAL_CATALOG?: CatalogEntry[];
  LOCAL_TTML_MAP?: Record<string, string>;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
}
