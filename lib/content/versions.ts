import fs from 'node:fs';
import path from 'node:path';

/**
 * 문서 버전 목록(docs-versions.json)과 각 버전의 원문 위치.
 *
 * 원문은 다음 순서로 찾는다.
 * 1. .cache/docs/<tag>/docs  — pnpm docs:sync가 GitHub 태그에서 받아 둔 원본
 * 2. node_modules/next/dist/docs — 태그가 설치된 next 버전과 같을 때 (네트워크 없이 동작)
 */

export type DocsVersion = {
  /** URL에 쓰는 이름. 최신 버전은 URL에 나타나지 않는다 (/docs/..., 이전 버전은 /docs/<id>/...) */
  id: string;
  /** vercel/next.js 저장소 태그 (예: v16.4.2) */
  tag: string;
  label: string;
  latest: boolean;
  /** 태그에서 v를 뺀 릴리스 버전 */
  release: string;
  major: number;
  /** 원문 docs 폴더의 절대 경로 */
  root: string;
  source: 'cache' | 'package';
};

type VersionConfig = { id: string; tag: string; label?: string };

export const UPSTREAM_REPO = 'https://github.com/vercel/next.js';

// 앱 코드는 .cache/docs만 참조한다. (빌드 도구가 이 경로를 추적하므로 git 저장소 같은 다른 캐시는 넣지 않는다)
const DOCS_CACHE_DIR = path.join(process.cwd(), '.cache', 'docs');

export function versionCacheDir(tag: string) {
  return path.join(DOCS_CACHE_DIR, tag);
}

export function readVersionConfig(): VersionConfig[] {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'docs-versions.json'), 'utf8')) as { versions: VersionConfig[] };
  if (!raw.versions?.length) throw new Error('docs-versions.json에 버전이 하나 이상 있어야 합니다.');
  return raw.versions;
}

/** 이 사이트를 실행하는 next 패키지 버전 (문서 버전과는 별개) */
export function installedNextVersion(): string {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'node_modules', 'next', 'package.json'), 'utf8')).version;
}

function resolveRoot(tag: string): Pick<DocsVersion, 'root' | 'source'> | null {
  const cached = path.join(versionCacheDir(tag), 'docs');
  if (fs.existsSync(cached)) return { root: cached, source: 'cache' };
  const packaged = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'docs');
  if (tag === `v${installedNextVersion()}` && fs.existsSync(packaged)) return { root: packaged, source: 'package' };
  return null;
}

let cachedVersions: DocsVersion[] | null = null;

/** 원문을 찾을 수 있는 버전만 돌려준다. 최신 버전의 원문이 없으면 에러. */
export function getVersions(): DocsVersion[] {
  if (cachedVersions) return cachedVersions;
  const versions: DocsVersion[] = [];
  readVersionConfig().forEach((entry, index) => {
    const resolved = resolveRoot(entry.tag);
    const release = entry.tag.replace(/^v/, '');
    if (!resolved) {
      const message = `[docs] ${entry.tag} 원문이 없습니다. pnpm docs:sync를 실행하세요.`;
      if (index === 0) throw new Error(message);
      console.warn(`${message} (이 버전은 건너뜁니다)`);
      return;
    }
    versions.push({
      id: entry.id,
      tag: entry.tag,
      label: entry.label ?? `v${release}`,
      latest: index === 0,
      release,
      major: Number(release.split('.')[0]),
      ...resolved,
    });
  });
  cachedVersions = versions;
  return versions;
}

export function getLatestVersion() {
  return getVersions()[0];
}

export function getVersion(id: string) {
  return getVersions().find((version) => version.id === id);
}
