import { cacheLife } from 'next/cache';
import { getPageUnits } from '../bilingual/page-units';
import { hasTranslation, loadTranslations } from '../bilingual/translations';
import { unitId } from '../bilingual/units';
import { getFlatOrder, getSidebarSections } from './nav';
import { docsHref } from './paths';
import { findDoc, loadDocsIndex } from './source';
import { readUpstreamStatus, readVersionUpstream, upstreamCompareUrl, upstreamHistoryUrl } from './upstream';
import { getLatestVersion, getVersion, getVersions, type DocsVersion } from './versions';

/** nextjs.org의 같은 문서 주소. 최신이 아닌 버전은 /docs/<메이저>/... 형태를 쓴다. */
function originUrl(version: DocsVersion, key: string) {
  const base = version.latest ? '/docs' : `/docs/${version.major}`;
  return `https://nextjs.org${key ? `${base}/${key}` : base}`;
}

/** 헤더의 버전 선택에 쓰는 정보 (버전을 바꿀 때 같은 문서가 있는지 확인하려고 key 목록도 넘긴다) */
export async function getVersionSummaries() {
  'use cache';
  cacheLife('max');
  return getVersions().map((version) => ({
    id: version.id,
    label: version.label,
    tag: version.tag,
    release: version.release,
    latest: version.latest,
    keys: loadDocsIndex(version.id).map((doc) => doc.key),
  }));
}

/** 버전별 사이드바 트리, 번역 파일이 있는 문서, 비교 대상과 달라진 문서 */
export async function getSidebarData() {
  'use cache';
  cacheLife('max');
  return getVersions().map((version) => {
    const docs = loadDocsIndex(version.id);
    return {
      id: version.id,
      latest: version.latest,
      sections: getSidebarSections(version.id),
      translatedKeys: docs.filter((doc) => hasTranslation(doc.key)).map((doc) => doc.key),
      changedKeys: readVersionUpstream(version.id)?.changed.map((page) => page.key) ?? [],
    };
  });
}

export async function getSiteStats() {
  'use cache';
  cacheLife('max');
  const latest = getLatestVersion();
  const docs = loadDocsIndex(latest.id);
  const status = readUpstreamStatus();
  const upstream = status?.versions.find((entry) => entry.versionId === latest.id);
  return {
    release: latest.release,
    versions: getVersions().map((version) => ({ id: version.id, label: version.label, tag: version.tag, latest: version.latest, href: docsHref(version, '') })),
    total: docs.length,
    translated: docs.filter((doc) => hasTranslation(doc.key)).length,
    upstream:
      status && upstream
        ? {
            checkedAt: status.checkedAt,
            npmLatest: status.npmLatest,
            newMajor: status.newMajor,
            newerRelease: upstream.newerRelease,
            compareLabel: upstream.compareLabel,
            upstreamDate: upstream.upstreamDate,
            changed: upstream.changed.map((page) => ({
              ...page,
              title: findDoc(latest.id, page.key)?.navTitle ?? page.key,
              href: docsHref(latest, page.key),
            })),
            added: upstream.added.map((page) => ({ ...page, url: originUrl(latest, page.key) })),
            removed: upstream.removed,
            compareUrl: upstreamCompareUrl(latest.tag, upstream.compareRef),
          }
        : null,
  };
}

export type DocLinkInfo = { href: string; title: string; koTitle?: string; description?: string; koDescription?: string };

function linkInfo(versionId: string, key: string): DocLinkInfo | null {
  const doc = findDoc(versionId, key);
  if (!doc) return null;
  const ko = loadTranslations(doc.key);
  return {
    href: doc.href,
    title: doc.navTitle,
    koTitle: ko[unitId(doc.title)],
    description: doc.description,
    koDescription: doc.description ? ko[unitId(doc.description)] : undefined,
  };
}

/** 문서 본문을 제외한 머리글·관련 문서·이전/다음·버전 정보 */
export async function getDocContext(versionId: string, key: string) {
  'use cache';
  cacheLife('max');
  const version = getVersion(versionId)!;
  const latest = getLatestVersion();
  const doc = findDoc(versionId, key)!;
  const ko = loadTranslations(doc.key);
  const units = getPageUnits(doc);
  const translatedUnits = units.filter((unit) => ko[unit.id]).length;

  const breadcrumbs = doc.slug
    .slice(0, -1)
    .map((_, index) => findDoc(versionId, doc.slug.slice(0, index + 1).join('/')))
    .filter((parent) => parent !== undefined)
    .map((parent) => ({ href: parent.href, title: parent.navTitle }));

  const order = getFlatOrder(versionId);
  const position = order.findIndex((node) => node.key === doc.key);
  const prev = position > 0 ? linkInfo(versionId, order[position - 1].key) : null;
  const next = position >= 0 && position < order.length - 1 ? linkInfo(versionId, order[position + 1].key) : null;

  const status = readUpstreamStatus();
  const versionStatus = status?.versions.find((entry) => entry.versionId === versionId);
  const changedPage = versionStatus?.changed.find((page) => page.key === doc.key);
  const upstream =
    status && versionStatus && changedPage
      ? {
          checkedAt: status.checkedAt,
          compareLabel: versionStatus.compareLabel,
          historyUrl: upstreamHistoryUrl(versionStatus.compareRef, changedPage.upstreamPath),
          translation: changedPage.translation,
        }
      : null;

  const related = (doc.related?.links ?? [])
    .map((link) => linkInfo(versionId, link.replace(/^\/?(docs\/)?/, '').replace(/\/$/, '')))
    .filter((info): info is DocLinkInfo => info !== null);

  return {
    doc,
    version: { id: version.id, label: version.label, tag: version.tag, latest: version.latest },
    /** 이전 버전 문서일 때 최신 버전의 같은 문서(없으면 최신 버전 첫 화면) */
    latestLink: version.latest
      ? null
      : { label: latest.label, href: docsHref(latest, findDoc(latest.id, doc.key) ? doc.key : '') },
    koTitle: ko[unitId(doc.title)],
    koDescription: doc.description ? ko[unitId(doc.description)] : undefined,
    progress: { done: translatedUnits, total: units.length },
    breadcrumbs,
    prev,
    next,
    related: related.length ? { title: doc.related?.title, description: doc.related?.description, links: related } : null,
    originUrl: originUrl(version, doc.key),
    upstream,
  };
}
