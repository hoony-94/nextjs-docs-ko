import { evaluate } from '@mdx-js/mdx';
import rehypeShiki from '@shikijs/rehype';
import type { ShikiTransformer } from 'shiki';
import * as runtime from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import { mdxComponents } from '@/components/mdx/mdx-components';
import type { TranslationMap } from '../bilingual/units';
import remarkDocs, { type TocEntry } from './remark-docs';

const LANGS = ['tsx', 'jsx', 'ts', 'js', 'bash', 'json', 'html', 'css', 'scss', 'yaml', 'diff', 'mdx', 'md', 'xml', 'nginx', 'text'];

function parseRanges(spec: string) {
  const lines = new Set<number>();
  for (const part of spec.split(',')) {
    const [from, to] = part.trim().split('-').map(Number);
    if (Number.isNaN(from)) continue;
    for (let line = from; line <= (to || from); line++) lines.add(line);
  }
  return lines;
}

/** 원문 코드 블록 메타의 `highlight={1,3-5}`를 줄 강조로 바꾼다. */
const transformerHighlight: ShikiTransformer = {
  name: 'docs-highlight',
  line(node, line) {
    const raw = (this.options.meta as { __raw?: string } | undefined)?.__raw ?? '';
    const spec = raw.match(/\bhighlight=\{?([\d,\s-]+)\}?/)?.[1];
    if (spec && parseRanges(spec).has(line)) this.addClassToHast(node, 'highlighted');
  },
};

export type RenderedDoc = {
  content: React.ReactNode;
  toc: TocEntry[];
  error?: string;
};

export async function renderMdx(
  source: string,
  options: { translations: TranslationMap; knownKeys: Set<string>; docsBase: string; originUrl: string },
): Promise<RenderedDoc> {
  const toc: TocEntry[] = [];
  try {
    const { default: Content } = await evaluate(source, {
      ...runtime,
      format: 'mdx',
      remarkPlugins: [remarkGfm, [remarkDocs, { ...options, toc }]],
      rehypePlugins: [
        [
          rehypeShiki,
          {
            themes: { light: 'github-light', dark: 'github-dark' },
            langs: LANGS,
            defaultLanguage: 'text',
            fallbackLanguage: 'text',
            transformers: [transformerHighlight],
          },
        ],
      ],
    });
    return { content: <Content components={mdxComponents} />, toc };
  } catch (error) {
    console.error('[renderMdx]', error);
    return { content: null, toc, error: error instanceof Error ? error.message : String(error) };
  }
}
