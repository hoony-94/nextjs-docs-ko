import { createHash } from 'node:crypto';
import type { Heading, Nodes, Paragraph, Parent, PhrasingContent, Root, TableCell } from 'mdast';
import { visit, SKIP } from 'unist-util-visit';

/**
 * 번역 단위(unit)를 정의하는 모듈.
 * 렌더링(remark 플러그인)과 추출 스크립트가 같은 함수를 써야 id가 일치한다.
 */

export type UnitKind = 'title' | 'description' | 'heading' | 'sentence' | 'cell';
/** text는 id 계산용, display는 번역자에게 보여 줄 텍스트(인라인 코드를 백틱으로 감쌈) */
export type Unit = { id: string; kind: UnitKind; text: string; display: string };
export type TranslationMap = Record<string, string>;

export function normalize(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

export function unitId(text: string) {
  return createHash('sha1').update(normalize(text)).digest('hex').slice(0, 12);
}

/** 문장 비교용 텍스트. MDX 표현식(주석)과 HTML은 제외한다. */
export function textOf(nodes: readonly Nodes[], { skipCode = false } = {}): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') out += node.value;
    else if (node.type === 'inlineCode') out += skipCode ? ' ' : node.value;
    else if (node.type === 'break') out += ' ';
    else if ('children' in node && Array.isArray(node.children)) out += textOf(node.children as Nodes[], { skipCode });
  }
  return out;
}

export function displayOf(nodes: readonly Nodes[]): string {
  let out = '';
  for (const node of nodes) {
    if (node.type === 'text') out += node.value;
    else if (node.type === 'inlineCode') out += `\`${node.value}\``;
    else if (node.type === 'strong') out += `**${displayOf(node.children)}**`;
    else if (node.type === 'break') out += ' ';
    else if ('children' in node && Array.isArray(node.children)) out += displayOf(node.children as Nodes[]);
  }
  return normalize(out);
}

/** 코드가 아닌 영어 문장이 있어야 번역 대상이다. */
export function isTranslatable(nodes: readonly Nodes[]) {
  return /[A-Za-z]{2,}/.test(textOf(nodes, { skipCode: true }));
}

const ABBREVIATIONS = /^(e\.g|i\.e|etc|vs|cf|approx|incl|ex|inc|ltd|no|fig|mr|mrs|dr)$/i;

function isAbbreviation(before: string) {
  // "(e.g." 처럼 앞에 붙은 괄호·따옴표는 떼고 비교한다.
  const word = (before.match(/(\S+)$/)?.[1] ?? '').replace(/^[(\[{"'`]+/, '');
  return ABBREVIATIONS.test(word) || /^[A-Za-z]$/.test(word);
}

/** 문단의 인라인 노드를 문장 단위 그룹으로 나눈다. 링크·강조 안쪽은 나누지 않는다. */
export function splitSentences(children: readonly PhrasingContent[]): PhrasingContent[][] {
  const groups: PhrasingContent[][] = [[]];
  const current = () => groups[groups.length - 1];

  children.forEach((node, index) => {
    if (node.type !== 'text') {
      current().push(node);
      return;
    }
    const value = node.value;
    const boundary = /([.!?])(["')\]]*)(\s+)/g;
    let start = 0;
    let match: RegExpExecArray | null;
    while ((match = boundary.exec(value))) {
      const end = match.index + match[1].length + match[2].length;
      const next = value[boundary.lastIndex];
      const atNodeEnd = next === undefined;
      if (match[1] === '.' && isAbbreviation(value.slice(0, match.index))) continue;
      if (atNodeEnd ? index === children.length - 1 : !/[A-Z0-9`"'(\[*_<]/.test(next)) continue;
      current().push({ type: 'text', value: value.slice(start, end) });
      groups.push([]);
      start = boundary.lastIndex;
    }
    if (start < value.length) current().push({ type: 'text', value: value.slice(start) });
  });

  return groups.filter((group) => normalize(textOf(group)).length > 0);
}

const VISIBLE_FLAG = '__bilingualDone';

/** 문서 트리에서 번역 단위를 순서대로 찾아 콜백에 넘긴다. */
export function walkUnits(
  tree: Root,
  handlers: {
    heading?: (node: Heading, text: string) => void;
    paragraph?: (node: Paragraph, parent: Parent, index: number, sentences: PhrasingContent[][]) => void;
    cell?: (node: TableCell, text: string) => void;
  },
) {
  visit(tree, (node, index, parent) => {
    const data = (node as { data?: Record<string, unknown> }).data;
    if (data?.[VISIBLE_FLAG]) return SKIP;

    if (node.type === 'heading') {
      if (isTranslatable(node.children)) handlers.heading?.(node, normalize(textOf(node.children)));
      return SKIP;
    }
    if (node.type === 'tableCell') {
      if (isTranslatable(node.children)) handlers.cell?.(node, normalize(textOf(node.children)));
      return SKIP;
    }
    if (node.type === 'paragraph' && parent && index !== undefined) {
      const sentences = splitSentences(node.children).filter((group) => isTranslatable(group));
      if (sentences.length) handlers.paragraph?.(node, parent, index, splitSentences(node.children));
      return SKIP;
    }
    if (node.type === 'code' || node.type === 'html') return SKIP;
  });
}

export function markDone(node: { data?: object }) {
  node.data = { ...(node.data ?? {}), [VISIBLE_FLAG]: true };
}

/** 추출 스크립트용: 문서 본문의 번역 단위 목록 */
export function collectUnits(tree: Root): Unit[] {
  const units: Unit[] = [];
  const seen = new Set<string>();
  const add = (kind: UnitKind, text: string, display: string) => {
    const id = unitId(text);
    if (seen.has(id)) return;
    seen.add(id);
    units.push({ id, kind, text: normalize(text), display });
  };
  walkUnits(tree, {
    heading: (node, text) => add('heading', text, displayOf(node.children)),
    cell: (node, text) => add('cell', text, displayOf(node.children)),
    paragraph: (_node, _parent, _index, sentences) => {
      for (const group of sentences) {
        if (isTranslatable(group)) add('sentence', textOf(group), displayOf(group));
      }
    },
  });
  return units;
}
