/**
 * 문서 URL ↔ (버전, 문서 key) 변환. 클라이언트에서도 쓰므로 Node API를 쓰지 않는다.
 *
 *   최신 버전:  /docs/app/getting-started  → { versionId: '17', key: 'app/getting-started' }
 *   이전 버전:  /docs/16/app/getting-started → { versionId: '16', key: 'app/getting-started' }
 */

export type VersionRef = { id: string; latest: boolean };

export function docsBase(version: VersionRef) {
  return version.latest ? '/docs' : `/docs/${version.id}`;
}

export function docsHref(version: VersionRef, key: string) {
  const base = docsBase(version);
  return key ? `${base}/${key}` : base;
}

export function parseDocsPath(pathname: string, versions: readonly VersionRef[]): { versionId: string; key: string } | null {
  if (pathname !== '/docs' && !pathname.startsWith('/docs/')) return null;
  const rest = pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');
  const [first = '', ...others] = rest ? rest.split('/') : [];
  const older = versions.find((version) => !version.latest && version.id === first);
  if (older) return { versionId: older.id, key: others.join('/') };
  const latest = versions.find((version) => version.latest) ?? versions[0];
  return latest ? { versionId: latest.id, key: rest } : null;
}
