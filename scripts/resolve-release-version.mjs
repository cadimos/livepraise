#!/usr/bin/env node
/**
 * Resolve a versão da próxima release com base em package.json e releases no GitHub.
 *
 * Regras:
 * - Se existir release **draft** → reutiliza essa versão (rebuild dos instaladores).
 * - Senão, com base só em releases **publicadas**:
 *   - package.json ainda não publicado → usa essa versão (ex.: mudança manual para 1.0.0).
 *   - já publicada → incrementa (alpha.2, 1.0.1…).
 *
 * A release permanece em draft até publicação manual no GitHub.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncAppVersion } from './sync-app-version.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PKG_PATH = path.join(ROOT, 'package.json');
const LOCK_PATH = path.join(ROOT, 'package-lock.json');

/** @param {string} tag */
function tagToVersion(tag) {
  return String(tag).replace(/^v/i, '');
}

/** @param {string} version */
function parsePrerelease(version) {
  const match = version.match(/^(\d+\.\d+\.\d+)-([a-zA-Z]+)\.(\d+)$/);
  if (!match) return null;
  return { core: match[1], id: match[2], num: Number(match[3]) };
}

/** @param {string} version */
function parseStable(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: match[1],
    minor: match[2],
    patch: Number(match[3]),
  };
}

/**
 * @param {string} baseVersion
 * @param {string[]} publishedVersions
 */
export function resolveNextReleaseVersion(baseVersion, publishedVersions) {
  const published = new Set(publishedVersions);

  if (!published.has(baseVersion)) {
    return baseVersion;
  }

  const prerelease = parsePrerelease(baseVersion);
  if (prerelease) {
    const prefix = `${prerelease.core}-${prerelease.id}.`;
    let max = 0;
    for (const version of publishedVersions) {
      if (!version.startsWith(prefix)) continue;
      const suffix = version.slice(prefix.length);
      const num = Number(suffix);
      if (Number.isInteger(num) && num >= 0) max = Math.max(max, num);
    }
    return `${prerelease.core}-${prerelease.id}.${max + 1}`;
  }

  const stable = parseStable(baseVersion);
  if (stable) {
    let maxPatch = -1;
    for (const version of publishedVersions) {
      const parsed = parseStable(version);
      if (!parsed) continue;
      if (parsed.major === stable.major && parsed.minor === stable.minor) {
        maxPatch = Math.max(maxPatch, parsed.patch);
      }
    }
    return `${stable.major}.${stable.minor}.${maxPatch + 1}`;
  }

  throw new Error(
    `Versão "${baseVersion}" já publicada e formato não suportado para incremento automático.`,
  );
}

/**
 * @param {string} baseVersion
 * @param {string[]} publishedVersions
 * @param {string[]} draftVersions — mais recente primeiro (ordem da API GitHub)
 */
export function resolveReleaseVersion(baseVersion, publishedVersions, draftVersions) {
  if (draftVersions.length > 0) {
    return { version: draftVersions[0], mode: 'reuse-draft' };
  }
  return {
    version: resolveNextReleaseVersion(baseVersion, publishedVersions),
    mode: 'new-draft',
  };
}

/** @returns {Promise<{ publishedVersions: string[], draftVersions: string[] } | null>} */
async function fetchGitHubReleaseLists() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!token || !repo) return null;

  /** @type {string[]} */
  const publishedVersions = [];
  /** @type {string[]} */
  const draftVersions = [];
  let page = 1;

  while (page <= 20) {
    const res = await fetch(
      `https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );
    if (!res.ok) {
      throw new Error(`GitHub API releases → ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const release of data) {
      const version = tagToVersion(release.tag_name ?? '');
      if (!version) continue;
      if (release.draft) draftVersions.push(version);
      else publishedVersions.push(version);
    }

    if (data.length < 100) break;
    page += 1;
  }

  return { publishedVersions, draftVersions };
}

function fetchGitTagVersions() {
  try {
    const out = execSync('git tag -l v*', { encoding: 'utf8', cwd: ROOT }).trim();
    if (!out) return [];
    return out
      .split('\n')
      .map((tag) => tag.trim().replace(/^v/i, ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function loadReleaseState() {
  const fromApi = await fetchGitHubReleaseLists();
  if (fromApi) return fromApi;

  const fromTags = fetchGitTagVersions();
  return {
    publishedVersions: fromTags,
    draftVersions: [],
  };
}

function writePackageVersion(version) {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(PKG_PATH, `${JSON.stringify(pkg, null, 2)}\n`);

  if (fs.existsSync(LOCK_PATH)) {
    const lock = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    lock.version = version;
    if (lock.packages?.['']) lock.packages[''].version = version;
    fs.writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);
  }
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(PKG_PATH, 'utf8'));
  const baseVersion = pkg.version;
  const { publishedVersions, draftVersions } = await loadReleaseState();
  const { version, mode } = resolveReleaseVersion(
    baseVersion,
    publishedVersions,
    draftVersions,
  );

  const apply = !process.argv.includes('--dry-run');
  if (apply) {
    writePackageVersion(version);
    syncAppVersion(version);
  }

  console.log(`base=${baseVersion}`);
  console.log(`published=${publishedVersions.length}`);
  console.log(`drafts=${draftVersions.length}`);
  console.log(`mode=${mode}`);
  console.log(`version=${version}`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `tag=v${version}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\n`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
