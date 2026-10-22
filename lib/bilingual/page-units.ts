import matter from 'gray-matter';
import type { Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { readDocSource, type DocMeta } from '../content/source';
import { prepareStructure } from '../mdx/remark-docs';
import { collectUnits, normalize, unitId, type Unit } from './units';

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);

function unitsOf(content: string, data: Record<string, unknown>): Unit[] {
  const tree = parser.parse(content) as Root;
  prepareStructure(tree);

  const head: Unit[] = [];
  for (const [kind, value] of [
    ['title', data.title],
    ['description', data.description],
  ] as const) {
    if (typeof value === 'string' && value.trim()) {
      head.push({ id: unitId(value), kind, text: normalize(value), display: normalize(value) });
    }
  }
  const body = collectUnits(tree).filter((unit) => !head.some((h) => h.id === unit.id));
  return [...head, ...body];
}

/** 렌더링과 같은 방식으로 파싱해서 한 페이지의 번역 단위를 모두 구한다. */
export function getPageUnits(doc: DocMeta): Unit[] {
  const { content, data } = readDocSource(doc);
  return unitsOf(content, data);
}

/** frontmatter가 포함된 원문 문자열(예: 최신 canary 문서)의 번역 단위 */
export function getUnitsFromSource(raw: string): Unit[] {
  const { content, data } = matter(raw);
  return unitsOf(content, data);
}
