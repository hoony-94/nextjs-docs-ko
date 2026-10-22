import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { docsHref } from './paths';
import { getLatestVersion, getVersion, type DocsVersion } from './versions';

// App Router 문서와 Architecture, Community만 포함한다 (Pages Router 제외).
// 패키지 안 문서는 .md, GitHub 원본은 .mdx라서 둘 다 받는다.
const INCLUDED = ['index.md', 'index.mdx', '01-app', '03-architecture', '04-community'];
const DOC_FILE = /\.mdx?$/;

/** 'docs/' 기준 상대 경로(예: '01-app/02-guides/forms.mdx')가 사이트 범위에 속하는지 */
export function isIncludedFile(relativeFile: string) {
  return INCLUDED.some((entry) => relativeFile === entry || relativeFile.startsWith(`${entry}/`));
}

export type Related = {
  title?: string;
  description?: string;
  links?: string[];
};

export type DocMeta = {
  versionId: string;
  /** 'app/getting-started/installation' 형태. 루트는 '' (버전과 무관하게 같은 문서면 같은 key) */
  key: string;
  slug: string[];
  href: string;
  /** 버전 원문 폴더 기준 상대 경로 */
  file: string;
  title: string;
  navTitle: string;
  description: string;
  /** frontmatter의 version 값 (experimental, draft 등) */
  stage?: string;
  related?: Related;
  /** 파일·폴더 이름 앞의 숫자 접두사. 없으면 null */
  order: number | null;
  isIndex: boolean;
};

const ORDER_PREFIX = /^(\d+)-/;

function stripPrefix(segment: string) {
  return segment.replace(ORDER_PREFIX, '');
}

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return DOC_FILE.test(entry.name) ? [full] : [];
  });
}

export function fileToSlug(relativeFile: string): string[] {
  return relativeFile
    .replace(DOC_FILE, '')
    .split('/')
    .map(stripPrefix)
    .filter((segment) => segment !== 'index');
}

function requireVersion(versionId: string): DocsVersion {
  const version = getVersion(versionId);
  if (!version) throw new Error(`알 수 없는 문서 버전: ${versionId}`);
  return version;
}

export function docFilePath(doc: Pick<DocMeta, 'versionId' | 'file'>) {
  return path.join(requireVersion(doc.versionId).root, doc.file);
}

export function readDocSource(doc: Pick<DocMeta, 'versionId' | 'file'>) {
  const { content, data } = matter(fs.readFileSync(docFilePath(doc), 'utf8'));
  return { content, data };
}

const indexCache = new Map<string, DocMeta[]>();

export function loadDocsIndex(versionId: string = getLatestVersion().id): DocMeta[] {
  const cached = indexCache.get(versionId);
  if (cached) return cached;

  const version = requireVersion(versionId);
  const files = INCLUDED.flatMap((entry) => {
    const full = path.join(version.root, entry);
    if (!fs.existsSync(full)) return [];
    return fs.statSync(full).isDirectory() ? walk(full) : [full];
  });

  const docs = files.map((full): DocMeta => {
    const file = path.relative(version.root, full).split(path.sep).join('/');
    const { data } = matter(fs.readFileSync(full, 'utf8'));
    const slug = fileToSlug(file);
    const isIndex = /^index\.mdx?$/.test(path.basename(file));
    const ownSegment = isIndex ? path.basename(path.dirname(file)) : path.basename(file).replace(DOC_FILE, '');
    const prefix = ownSegment.match(ORDER_PREFIX);
    const key = slug.join('/');
    return {
      versionId,
      key,
      slug,
      href: docsHref(version, key),
      file,
      title: String(data.title ?? slug.at(-1) ?? 'Docs'),
      navTitle: String(data.nav_title ?? data.title ?? slug.at(-1) ?? 'Docs'),
      description: String(data.description ?? ''),
      stage: data.version ? String(data.version) : undefined,
      related: data.related as Related | undefined,
      order: prefix ? Number(prefix[1]) : null,
      isIndex,
    };
  });
  indexCache.set(versionId, docs);
  return docs;
}

export function findDoc(versionId: string, key: string) {
  return loadDocsIndex(versionId).find((doc) => doc.key === key);
}

export function compareDocs(a: Pick<DocMeta, 'order' | 'navTitle'>, b: Pick<DocMeta, 'order' | 'navTitle'>) {
  if (a.order !== null && b.order !== null) return a.order - b.order;
  if (a.order !== null) return -1;
  if (b.order !== null) return 1;
  return a.navTitle.localeCompare(b.navTitle, 'en', { sensitivity: 'base' });
}
