import fs from 'node:fs';
import path from 'node:path';
import { UPSTREAM_REPO } from './versions';

/** scripts/docs-check.ts가 만드는 결과 파일. 없으면 사이트는 비교 정보 없이 동작한다. */
export const UPSTREAM_STATUS_FILE = path.join(process.cwd(), '.cache', 'status', 'upstream-status.json');

export type UpstreamChangedPage = {
  key: string;
  /** 'docs/' 기준 원본 경로 (예: 01-app/02-guides/forms.mdx) */
  upstreamPath: string;
  /** 비교 대상 원문 기준: 맞지 않게 되는 번역 수와 아직 번역이 없는 문장 수 */
  translation?: { stale: number; added: number };
};

export type UpstreamVersionStatus = {
  versionId: string;
  tag: string;
  /** 비교 대상 git ref. 최신 버전은 canary(nextjs.org), 이전 버전은 같은 메이저의 최신 릴리스 태그 */
  compareRef: string;
  compareLabel: string;
  /** 같은 메이저에 이 태그보다 새 릴리스가 있으면 그 버전 */
  newerRelease: string | null;
  upstreamCommit: string | null;
  upstreamDate: string | null;
  changed: UpstreamChangedPage[];
  added: { key: string; upstreamPath: string }[];
  removed: { key: string }[];
};

export type UpstreamStatus = {
  checkedAt: string;
  /** npm의 next 최신 버전 */
  npmLatest: string | null;
  /** docs-versions.json의 최신 버전보다 높은 메이저가 나왔으면 그 메이저 */
  newMajor: number | null;
  versions: UpstreamVersionStatus[];
};

export function readUpstreamStatus(): UpstreamStatus | null {
  try {
    const json = JSON.parse(fs.readFileSync(UPSTREAM_STATUS_FILE, 'utf8')) as UpstreamStatus;
    return Array.isArray(json.versions) ? json : null;
  } catch {
    return null;
  }
}

export function readVersionUpstream(versionId: string) {
  return readUpstreamStatus()?.versions.find((status) => status.versionId === versionId) ?? null;
}

export function upstreamHistoryUrl(ref: string, upstreamPath: string) {
  return `${UPSTREAM_REPO}/commits/${ref}/docs/${upstreamPath}`;
}

export function upstreamCompareUrl(fromTag: string, toRef: string) {
  return `${UPSTREAM_REPO}/compare/${fromTag}...${toRef}`;
}
