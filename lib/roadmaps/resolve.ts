import { cacheLife } from 'next/cache';
import { loadTranslations } from '../bilingual/translations';
import { unitId } from '../bilingual/units';
import { docsHref } from '../content/paths';
import { findDoc } from '../content/source';
import { getLatestVersion } from '../content/versions';
import { SITE_URL } from '../site';
import { getRoadmap } from './index';
import type { RoadmapLevel } from './types';

export type ResolvedItem = {
  id: string;
  kind: 'doc' | 'external';
  level: RoadmapLevel;
  focus: string;
  title: string;
  titleKo?: string;
  description?: string;
  descriptionKo?: string;
  /** 이 사이트 문서면 사이트 경로, 외부 문서면 외부 URL */
  href: string;
  /** 공유용 절대 URL */
  url: string;
  /** 문서 분류 (시작하기·가이드·API 레퍼런스·아키텍처) 또는 외부 출처 */
  category: string;
  /** 로드맵에 적은 문서 key가 현재 버전에 없으면 true */
  missing?: boolean;
};

function categoryOf(key: string) {
  if (key.startsWith('app/getting-started')) return '시작하기';
  if (key.startsWith('app/guides')) return '가이드';
  if (key.startsWith('app/api-reference')) return 'API 레퍼런스';
  if (key.startsWith('architecture')) return '아키텍처';
  if (key.startsWith('app/glossary')) return '용어집';
  return '문서';
}

/** 로드맵의 문서 key를 최신 버전 문서의 제목·번역·주소로 채운다. */
export async function getResolvedRoadmap(slug: string) {
  'use cache';
  cacheLife('max');
  const roadmap = getRoadmap(slug);
  if (!roadmap) return null;
  const latest = getLatestVersion();

  const stages = roadmap.stages.map((stage) => ({
    ...stage,
    items: stage.items.map((item): ResolvedItem => {
      if (item.type === 'external') {
        return {
          id: `${stage.id}:${item.url}`,
          kind: 'external',
          level: item.level,
          focus: item.focus,
          title: item.title,
          titleKo: item.titleKo,
          href: item.url,
          url: item.url,
          category: item.source,
        };
      }
      const doc = findDoc(latest.id, item.key);
      const href = docsHref(latest, item.key);
      if (!doc) {
        return { id: `${stage.id}:${item.key}`, kind: 'doc', level: item.level, focus: item.focus, title: item.key, href, url: `${SITE_URL}${href}`, category: categoryOf(item.key), missing: true };
      }
      const ko = loadTranslations(doc.key);
      return {
        id: `${stage.id}:${item.key}`,
        kind: 'doc',
        level: item.level,
        focus: item.focus,
        title: doc.title,
        titleKo: ko[unitId(doc.title)],
        description: doc.description || undefined,
        descriptionKo: doc.description ? ko[unitId(doc.description)] : undefined,
        href,
        url: `${SITE_URL}${href}`,
        category: categoryOf(item.key),
      };
    }),
  }));

  const milestones = roadmap.milestones
    ? {
        ...roadmap.milestones,
        items: roadmap.milestones.items.map((milestone) => ({
          ...milestone,
          href: milestone.docKey && findDoc(latest.id, milestone.docKey) ? docsHref(latest, milestone.docKey) : undefined,
        })),
      }
    : null;

  const items = stages.flatMap((stage) => stage.items);
  return {
    ...roadmap,
    stages,
    milestones,
    docsVersion: latest.tag,
    url: `${SITE_URL}/roadmaps/${roadmap.slug}`,
    stats: {
      stages: stages.length,
      items: items.length,
      core: items.filter((item) => item.level === 'core').length,
      docs: items.filter((item) => item.kind === 'doc').length,
      external: items.filter((item) => item.kind === 'external').length,
      missing: items.filter((item) => item.missing).length,
    },
    markdown: toMarkdown(roadmap.titleKo, roadmap.title, `${SITE_URL}/roadmaps/${roadmap.slug}`, stages),
  };
}

/** 노션·이슈 등에 붙여 넣을 수 있는 목차 (사이트 주소는 절대 URL) */
function toMarkdown(titleKo: string, title: string, url: string, stages: { titleKo: string; title: string; goal: string; items: ResolvedItem[] }[]) {
  const lines = [`# ${titleKo} (${title})`, '', url, ''];
  stages.forEach((stage, index) => {
    lines.push(`## ${index + 1}. ${stage.titleKo} (${stage.title})`, '', stage.goal, '');
    stage.items.forEach((item, itemIndex) => {
      const label = item.titleKo && item.titleKo !== item.title ? `${item.title} · ${item.titleKo}` : item.title;
      lines.push(`${itemIndex + 1}. [${item.level === 'core' ? '핵심' : '심화'}] [${label}](${item.url}) — ${item.focus}`);
    });
    lines.push('');
  });
  return lines.join('\n');
}
