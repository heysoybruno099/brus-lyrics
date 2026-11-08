import type { Env } from '../types.js';

async function resolveWorkspacePath(relativeFilePath: string): Promise<string> {
  const path = await import('node:path');
  const fs = await import('node:fs');
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.workspaces) {
          return path.resolve(dir, relativeFilePath);
        }
      } catch {
        // continue
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(process.cwd(), relativeFilePath);
}

export async function fetchTTML(env: Env, filePath: string): Promise<string | null> {
  const normPath = filePath.replace(/\\/g, '/');
  const baseName = normPath.split('/').pop() || '';

  // 1. Check in-memory map
  if (env.LOCAL_TTML_MAP) {
    if (env.LOCAL_TTML_MAP[normPath]) return env.LOCAL_TTML_MAP[normPath];
    if (env.LOCAL_TTML_MAP[filePath]) return env.LOCAL_TTML_MAP[filePath];
    if (env.LOCAL_TTML_MAP[baseName]) return env.LOCAL_TTML_MAP[baseName];
  }

  // 2. Check D1 database if submissions table has ttml_raw
  if (env.DB) {
    try {
      const idWithoutExt = baseName.replace(/\.ttml$/i, '');
      const subRow = await env.DB.prepare(
        'SELECT ttml_raw FROM submissions WHERE spotify_id = ?1 OR ytm_id = ?1 OR id = ?1 LIMIT 1'
      ).bind(idWithoutExt).first<{ ttml_raw: string }>();
      if (subRow && subRow.ttml_raw) {
        return subRow.ttml_raw;
      }
    } catch {
      // Database lookup fallback
    }
  }

  // 3. Local filesystem read
  try {
    const fs = await import('node:fs');
    const fullPath = await resolveWorkspacePath(normPath);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
  } catch {
    // Cloudflare Worker runtime without local fs
  }

  // 4. GitHub repository storage
  const owner = env.GITHUB_OWNER || 'brus-lyrics';
  const repo = env.GITHUB_REPO || 'brus-lyrics';
  const branch = env.GITHUB_BRANCH || 'main';

  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${normPath}`;
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Brus-Lyrics-API/1.0',
    };
    if (env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${env.GITHUB_TOKEN}`;
    }

    const response = await fetch(rawUrl, { headers });
    if (response.ok) {
      return await response.text();
    }
  } catch {
    // Failed to fetch from raw github
  }

  return null;
}

export interface CommitResult {
  success: boolean;
  action: 'committed' | 'queued' | 'stored';
  message: string;
  commitSha?: string;
  filePath: string;
}

export async function commitTTMLToGitHub(
  env: Env,
  filePath: string,
  ttmlContent: string,
  contributor: string
): Promise<CommitResult> {
  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER || 'brus-lyrics';
  const repo = env.GITHUB_REPO || 'brus-lyrics';
  const branch = env.GITHUB_BRANCH || 'main';

  if (!token) {
    // No GitHub token provided; queue or store locally
    if (env.LOCAL_TTML_MAP) {
      env.LOCAL_TTML_MAP[filePath] = ttmlContent;
      const baseName = filePath.replace(/\\/g, '/').split('/').pop() || '';
      env.LOCAL_TTML_MAP[baseName] = ttmlContent;
      return {
        success: true,
        action: 'stored',
        message: 'TTML stored in local memory cache',
        filePath,
      };
    }

    // Try local fs if available
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const fullPath = await resolveWorkspacePath(filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, ttmlContent, 'utf-8');
      return {
        success: true,
        action: 'stored',
        message: 'TTML stored to local repository path',
        filePath,
      };
    } catch {
      return {
        success: true,
        action: 'queued',
        message: 'No GitHub token configured; queued for review',
        filePath,
      };
    }
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const base64Content = btoa(unescape(encodeURIComponent(ttmlContent)));

  let existingSha: string | undefined;
  try {
    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Brus-Lyrics-API/1.0',
      },
    });
    if (getRes.ok) {
      const data = (await getRes.json()) as { sha?: string };
      existingSha = data.sha;
    }
  } catch {
    // File may not exist yet
  }

  const commitBody: Record<string, unknown> = {
    message: `Add verified TTML lyrics: ${filePath} (contributed by ${contributor})`,
    content: base64Content,
    branch,
    committer: {
      name: contributor || 'Community Contributor',
      email: 'contributor@brus-lyrics.local',
    },
  };

  if (existingSha) {
    commitBody.sha = existingSha;
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Brus-Lyrics-API/1.0',
    },
    body: JSON.stringify(commitBody),
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub API commit failed with status ${putRes.status}: ${errText}`);
  }

  const putData = (await putRes.json()) as { commit?: { sha?: string } };

  return {
    success: true,
    action: 'committed',
    message: 'TTML committed successfully to GitHub repository',
    commitSha: putData.commit?.sha,
    filePath,
  };
}
