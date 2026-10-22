import GithubSlugger from 'github-slugger';
import type { Code, Emphasis, Nodes, Parent, PhrasingContent, Root, RootContent } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { visit } from 'unist-util-visit';
import { isTranslatable, normalize, textOf, unitId, walkUnits, type TranslationMap } from '../bilingual/units';

export type TocEntry = { id: string; depth: 2 | 3; text: string; ko?: string };

export type RemarkDocsOptions = {
  translations: TranslationMap;
  /** 이 버전에 있는 문서 key */
  knownKeys: Set<string>;
  /** 이 버전 문서의 URL 앞부분 (최신: /docs, 이전 버전: /docs/16) */
  docsBase: string;
  toc: TocEntry[];
  /** 이미지·영상은 원문 페이지에서 보도록 링크한다. */
  originUrl: string;
};

/** 렌더러에 실제로 구현된 컴포넌트. 그 외 대문자 JSX는 UnknownComponent로 바꾼다. */
const KNOWN_COMPONENTS = new Set(['Image', 'Video', 'Check', 'Cross', 'FixCard', 'FixCardGrid']);

type JsxNode = Extract<Nodes, { type: 'mdxJsxFlowElement' | 'mdxJsxTextElement' }>;

function isJsx(node: Nodes): node is JsxNode {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

const ALERT_LABELS: Record<string, string> = {
  NOTE: '참고',
  TIP: '팁',
  IMPORTANT: '중요',
  WARNING: '경고',
  CAUTION: '주의',
};

/** `> [!WARNING]` 같은 GitHub 알림 문법을 표시용 박스로 바꾸고 표시자는 본문에서 뺀다. */
function transformAlerts(tree: Root) {
  visit(tree, 'blockquote', (node) => {
    const first = node.children[0];
    if (first?.type !== 'paragraph') return;
    const text = first.children[0];
    const match = text?.type === 'text' ? text.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/) : null;
    if (!match || text?.type !== 'text') return;
    text.value = text.value.slice(match[0].length);
    if (!text.value) first.children.shift();
    if (first.children[0]?.type === 'break') first.children.shift();
    if (!first.children.length) node.children.shift();
    const type = match[1];
    node.data = {
      ...node.data,
      hProperties: { className: ['callout', `callout--${type.toLowerCase()}`], 'data-label': ALERT_LABELS[type] },
    };
  });
}

/** AppOnly는 풀고, PagesOnly는 지우고, 모르는 컴포넌트는 이름을 바꾼다. */
export function prepareStructure(tree: Root) {
  transformAlerts(tree);
  const process = (parent: Parent) => {
    const next: RootContent[] = [];
    for (const child of parent.children as RootContent[]) {
      if (isJsx(child)) {
        if (child.name === 'PagesOnly') continue;
        if (child.name === 'AppOnly') {
          process(child as Parent);
          next.push(...(child.children as RootContent[]));
          continue;
        }
        if (child.name && /^[A-Z]/.test(child.name) && !KNOWN_COMPONENTS.has(child.name)) {
          child.attributes = [{ type: 'mdxJsxAttribute', name: 'name', value: child.name }];
          child.name = 'UnknownComponent';
        }
      }
      if ('children' in child) process(child as Parent);
      next.push(child);
    }
    parent.children = next as Parent['children'];
  };
  process(tree);
}

const LANG_ALIASES: Record<string, string> = {
  typescript: 'ts',
  javascript: 'js',
  sh: 'bash',
  prompt: 'text',
  plain: 'text',
  txt: 'text',
  '`mdx': 'mdx',
  '`': 'text',
};

function metaAttr(meta: string, name: string) {
  return meta.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
}

function jsxElement(name: string, attributes: Record<string, string | undefined>, children: RootContent[]): MdxJsxFlowElement {
  const attrs: MdxJsxAttribute[] = Object.entries(attributes)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => ({ type: 'mdxJsxAttribute', name: key, value }));
  return { type: 'mdxJsxFlowElement', name, attributes: attrs, children: children as MdxJsxFlowElement['children'] };
}

function langLabel(lang: string) {
  if (lang === 'ts' || lang === 'tsx') return 'TypeScript';
  if (lang === 'js' || lang === 'jsx') return 'JavaScript';
  return lang;
}

/** 코드 블록을 CodeBlock으로 감싸고, switcher·package 묶음은 CodeSwitcher 탭으로 묶는다. */
export function wrapCodeBlocks(tree: Root) {
  const process = (parent: Parent) => {
    const children = parent.children as RootContent[];
    const next: RootContent[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.type !== 'code') {
        if ('children' in child) process(child as Parent);
        next.push(child);
        continue;
      }
      const kindOf = (node: Code) => {
        const meta = node.meta ?? '';
        if (metaAttr(meta, 'package')) return 'package';
        if (/\bswitcher\b/.test(meta)) return 'lang';
        return null;
      };
      const kind = kindOf(child);
      const group: Code[] = [child];
      while (kind && children[i + 1]?.type === 'code' && kindOf(children[i + 1] as Code) === kind) {
        group.push(children[++i] as Code);
      }
      const blocks = group.map((code) => {
        const meta = code.meta ?? '';
        code.lang = code.lang ? (LANG_ALIASES[code.lang] ?? code.lang) : 'text';
        const filename = metaAttr(meta, 'filename') ?? metaAttr(meta, 'fileName') ?? metaAttr(meta, 'file');
        return jsxElement('CodeBlock', { filename, code: code.value }, [code]);
      });
      const labels = group.map((code) =>
        kind === 'package' ? (metaAttr(code.meta ?? '', 'package') ?? '') : langLabel(code.lang ?? 'text'),
      );
      next.push(
        blocks.length > 1 ? jsxElement('CodeSwitcher', { kind: kind ?? undefined, labels: labels.join(',') }, blocks) : blocks[0],
      );
    }
    parent.children = next as Parent['children'];
  };
  process(tree);
}

/** 원문의 /docs/... 링크를 같은 버전의 사이트 경로로 바꾸고, 없는 문서는 nextjs.org로 보낸다. */
export function rewriteHref(url: string, knownKeys: Set<string>, docsBase: string) {
  if (!url.startsWith('/')) return url;
  const [pathname, hash = ''] = url.split('#');
  const suffix = hash ? `#${hash}` : '';
  if (pathname === '/docs' || pathname.startsWith('/docs/')) {
    const key = pathname.replace(/^\/docs\/?/, '').replace(/\/$/, '');
    if (knownKeys.has(key)) return `${key ? `${docsBase}/${key}` : docsBase}${suffix}`;
  }
  return `https://nextjs.org${url}`;
}

export function rewriteLinks(tree: Root, knownKeys: Set<string>, docsBase: string, originUrl: string) {
  visit(tree, (node) => {
    if (node.type === 'link') node.url = rewriteHref(node.url, knownKeys, docsBase);
    if (isJsx(node as Nodes) && ['Image', 'Video'].includes((node as JsxNode).name ?? '')) {
      (node as JsxNode).attributes.push({ type: 'mdxJsxAttribute', name: 'origin', value: originUrl });
    }
    if (isJsx(node as Nodes) && (node as JsxNode).name === 'FixCard') {
      for (const attr of (node as JsxNode).attributes) {
        if (attr.type === 'mdxJsxAttribute' && attr.name === 'href' && typeof attr.value === 'string') {
          attr.value = rewriteHref(attr.value, knownKeys, docsBase);
        }
      }
    }
  });
}

export function assignHeadingIds(tree: Root, toc: TocEntry[], translations: TranslationMap) {
  const slugger = new GithubSlugger();
  visit(tree, 'heading', (node) => {
    const text = normalize(textOf(node.children));
    const id = slugger.slug(text);
    node.data = { ...node.data, hProperties: { ...(node.data?.hProperties ?? {}), id } };
    if (node.depth === 2 || node.depth === 3) {
      toc.push({ id, depth: node.depth, text, ko: translations[unitId(text)] });
    }
  });
}

/** 번역문 안의 `코드`와 **강조**만 인라인 노드로 바꾼다. */
export function parseKoInline(text: string): PhrasingContent[] {
  return text
    .split(/(`[^`]+`|\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part): PhrasingContent => {
      if (part.startsWith('`') && part.endsWith('`')) return { type: 'inlineCode', value: part.slice(1, -1) };
      if (part.startsWith('**') && part.endsWith('**')) return { type: 'strong', children: [{ type: 'text', value: part.slice(2, -2) }] };
      return { type: 'text', value: part };
    });
}

function span(className: string[], children: PhrasingContent[]): Emphasis {
  return { type: 'emphasis', data: { hName: 'span', hProperties: { className } }, children };
}

/** 원문 문장 바로 아래에 번역문을 붙인다. 번역이 없는 문장은 원문만 남긴다. */
export function applyTranslations(tree: Root, translations: TranslationMap) {
  walkUnits(tree, {
    heading: (node, text) => {
      const ko = translations[unitId(text)];
      if (ko) node.children = [span(['en', 'has-ko'], node.children), span(['ko'], parseKoInline(ko))];
    },
    cell: (node, text) => {
      const ko = translations[unitId(text)];
      if (ko) node.children = [span(['en', 'has-ko'], node.children), span(['ko'], parseKoInline(ko))];
    },
    paragraph: (node, _parent, _index, sentences) => {
      const translated = sentences.map((group) => (isTranslatable(group) ? translations[unitId(textOf(group))] : undefined));
      if (!translated.some(Boolean)) return;
      node.data = { ...node.data, hName: 'div', hProperties: { className: ['bi'] } };
      node.children = sentences.flatMap((group, i) => {
        const ko = translated[i];
        return ko ? [span(['en', 'has-ko'], group), span(['ko'], parseKoInline(ko))] : [span(['en'], group)];
      });
    },
  });
}

export default function remarkDocs(options: RemarkDocsOptions) {
  return (tree: Root) => {
    prepareStructure(tree);
    wrapCodeBlocks(tree);
    rewriteLinks(tree, options.knownKeys, options.docsBase, options.originUrl);
    assignHeadingIds(tree, options.toc, options.translations);
    if (Object.keys(options.translations).length) applyTranslations(tree, options.translations);
  };
}
