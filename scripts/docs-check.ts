/**
 * 각 문서 버전의 원문이 비교 대상과 달라졌는지 확인한다.
 *
 *   pnpm docs:check            # 결과 출력 + .cache/upstream-status.json 저장
 *   (prebuild에서는 --soft로 실행: 네트워크 오류가 나도 빌드를 막지 않는다)
 *
 * - 최신 버전: nextjs.org가 보여 주는 vercel/next.js canary 브랜치의 docs와 비교
 * - 이전 버전: 같은 메이저의 npm 최신 릴리스 태그와 비교 (예: v16.4.2 → v16.5.0)
 * - 새 메이저(예: 17)가 나왔는지도 알려 준다.
 * 파일 내용은 받지 않고 git 트리(해시 목록)만 비교하며, 번역이 있는 바뀐 페이지만 내용을 받아
 * 번역에 미치는 영향을 계산한다.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getPageUnits, getUnitsFromSource } from '../lib/bilingual/page-units';
import { loadTranslations } from '../lib/bilingual/translations';
import { docFilePath, fileToSlug, isIncludedFile, loadDocsIndex } from '../lib/content/source';
import {
  UPSTREAM_STATUS_FILE,
  upstreamCompareUrl,
  type UpstreamChangedPage,
  type UpstreamStatus,
  type UpstreamVersionStatus,
} from '../lib/content/upstream';
import { getVersions, UPSTREAM_REPO, type DocsVersion } from '../lib/content/versions';

const write = process.argv.includes('--write');
const soft = process.argv.includes('--soft');
const CACHE_REPO = path.join(process.cwd(), '.cache', 'git', 'nextjs-upstream');

function git(...args: string[]) {
  // 자동 gc 안내 메시지가 출력을 어지럽히지 않게 끈다.
  return execFileSync('git', ['-C', CACHE_REPO, '-c', 'gc.auto=0', ...args], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
}

function summarize(keys: string[], limit = 10) {
  return keys.length > limit ? `${keys.slice(0, limit).join(', ')} 외 ${keys.length - limit}개` : keys.join(', ');
}

/** git hash-object와 같은 방식의 blob 해시 */
function blobSha(buffer: Buffer) {
  return createHash('sha1').update(`blob ${buffer.length}\0`).update(buffer).digest('hex');
}

async function fetchNpmLatest() {
  try {
    const response = await fetch('https://registry.npmjs.org/next/latest');
    return ((await response.json()) as { version: string }).version;
  } catch {
    return null;
  }
}

/** 같은 메이저의 npm 최신 안정 릴리스 (예: 16 → 16.5.0) */
function newestInMajor(major: number): string | null {
  try {
    const out = execFileSync('npm', ['view', `next@^${major}.0.0`, 'version', '--json'], { encoding: 'utf8' });
    const parsed = JSON.parse(out) as string | string[];
    return Array.isArray(parsed) ? (parsed.at(-1) ?? null) : parsed;
  } catch {
    return null;
  }
}

function compareVersions(a: string, b: string) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

function ensureRepo() {
  if (fs.existsSync(path.join(CACHE_REPO, '.git'))) return;
  fs.mkdirSync(CACHE_REPO, { recursive: true });
  git('init', '-q');
  git('remote', 'add', 'origin', UPSTREAM_REPO);
}

/** ref를 트리만 받아 오고 로컬 ref 이름을 돌려준다 */
function fetchRef(ref: string) {
  if (ref === 'canary') {
    git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', '+refs/heads/canary:refs/remotes/origin/canary');
    return 'origin/canary';
  }
  git('fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', `+refs/tags/${ref}:refs/tags/${ref}`);
  return `refs/tags/${ref}`;
}

/** 비교 대상 ref의 문서: key → { blob 해시, docs/ 기준 경로 } */
function upstreamDocs(localRef: string) {
  const files = new Map<string, { sha: string; upstreamPath: string }>();
  for (const line of git('ls-tree', '-r', localRef, 'docs').trim().split('\n')) {
    const [meta, filePath] = line.split('\t');
    if (!/\.mdx?$/.test(filePath ?? '')) continue;
    const upstreamPath = filePath.replace(/^docs\//, '');
    if (isIncludedFile(upstreamPath)) files.set(fileToSlug(upstreamPath).join('/'), { sha: meta.split(' ')[2], upstreamPath });
  }
  return files;
}

function compareVersion(version: DocsVersion, ref: string, compareLabel: string, newerRelease: string | null): UpstreamVersionStatus {
  const localRef = fetchRef(ref);
  const [commit, date] = git('log', '-1', '--format=%H%n%cI', localRef).trim().split('\n');
  const remote = upstreamDocs(localRef);
  const docs = loadDocsIndex(version.id);
  const localKeys = new Set(docs.map((doc) => doc.key));

  const changed: UpstreamChangedPage[] = [];
  for (const doc of docs) {
    const upstream = remote.get(doc.key);
    if (!upstream || upstream.sha === blobSha(fs.readFileSync(docFilePath(doc)))) continue;
    const ko = loadTranslations(doc.key);
    const currentIds = getPageUnits(doc).map((unit) => unit.id);
    const latestUnits = getUnitsFromSource(git('show', `${localRef}:docs/${upstream.upstreamPath}`));
    const latestIds = new Set(latestUnits.map((unit) => unit.id));
    changed.push({
      key: doc.key,
      upstreamPath: upstream.upstreamPath,
      translation: {
        stale: currentIds.filter((id) => ko[id] && !latestIds.has(id)).length,
        added: latestUnits.filter((unit) => !ko[unit.id]).length,
      },
    });
  }

  return {
    versionId: version.id,
    tag: version.tag,
    compareRef: ref,
    compareLabel,
    newerRelease,
    upstreamCommit: commit,
    upstreamDate: date,
    changed,
    added: [...remote].filter(([key]) => !localKeys.has(key)).map(([key, value]) => ({ key, upstreamPath: value.upstreamPath })),
    removed: docs.filter((doc) => !remote.has(doc.key)).map((doc) => ({ key: doc.key })),
  };
}

function report(version: DocsVersion, status: UpstreamVersionStatus) {
  console.log(`\n[${version.label}${version.latest ? ' · 최신' : ''}] ${version.tag} ↔ ${status.compareLabel}`);
  if (status.newerRelease) console.log(`  새 릴리스 v${status.newerRelease} 있음 → docs-versions.json의 tag를 올릴 수 있습니다.`);
  if (status.compareRef === version.tag) {
    console.log('  같은 메이저의 최신 릴리스와 같습니다.');
    return;
  }
  console.log(`  차이: 변경 ${status.changed.length} · 추가 ${status.added.length} · 삭제 ${status.removed.length}`);
  const impact = status.changed.filter((page) => page.translation && (page.translation.stale || page.translation.added));
  if (impact.length) {
    const stale = impact.reduce((sum, page) => sum + page.translation!.stale, 0);
    const added = impact.reduce((sum, page) => sum + page.translation!.added, 0);
    console.log(`  번역 영향: 페이지 ${impact.length}개 · 맞지 않게 될 번역 ${stale} · 번역이 필요한 문장 ${added}`);
    for (const page of impact.slice(0, 10)) console.log(`    ${page.key}  ${page.translation!.stale} · ${page.translation!.added}`);
    if (impact.length > 10) console.log(`    … 외 ${impact.length - 10}개`);
  }
  if (status.added.length) console.log(`  비교 대상에만 있는 페이지: ${summarize(status.added.map((page) => page.key))}`);
  if (status.removed.length) console.log(`  비교 대상에서 삭제된 페이지: ${summarize(status.removed.map((page) => page.key))}`);
  console.log(`  전체 비교: ${upstreamCompareUrl(version.tag, status.compareRef)}`);
}

async function main() {
  ensureRepo();
  const npmLatest = await fetchNpmLatest();
  const versions = getVersions();
  const statuses: UpstreamVersionStatus[] = [];

  for (const version of versions) {
    const newest = newestInMajor(version.major);
    const newerRelease = newest && compareVersions(newest, version.release) > 0 ? newest : null;
    let status: UpstreamVersionStatus;
    if (version.latest) {
      status = compareVersion(version, 'canary', 'nextjs.org 최신 문서', newerRelease);
    } else if (newerRelease) {
      status = compareVersion(version, `v${newerRelease}`, `v${newerRelease}(${version.major}.x 최신 릴리스)`, newerRelease);
    } else {
      status = {
        versionId: version.id,
        tag: version.tag,
        compareRef: version.tag,
        compareLabel: `${version.major}.x 최신 릴리스`,
        newerRelease: null,
        upstreamCommit: null,
        upstreamDate: null,
        changed: [],
        added: [],
        removed: [],
      };
    }
    statuses.push(status);
    report(version, status);
  }

  const latestMajor = Number(npmLatest?.split('.')[0]);
  const newMajor = npmLatest && latestMajor > versions[0].major ? latestMajor : null;
  if (newMajor) console.log(`\nNext.js ${newMajor}이(가) 출시되었습니다 (npm ${npmLatest}). docs-versions.json 맨 앞에 추가하면 새 버전 문서를 만들 수 있습니다.`);

  if (write) {
    const result: UpstreamStatus = { checkedAt: new Date().toISOString(), npmLatest, newMajor, versions: statuses };
    fs.mkdirSync(path.dirname(UPSTREAM_STATUS_FILE), { recursive: true });
    fs.writeFileSync(UPSTREAM_STATUS_FILE, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`\n저장: ${path.relative(process.cwd(), UPSTREAM_STATUS_FILE)}`);
  }
}

main().catch((error) => {
  console.warn(`[docs:check] 원문과 비교하지 못했습니다: ${error instanceof Error ? error.message : error}`);
  process.exit(soft ? 0 : 1);
});
