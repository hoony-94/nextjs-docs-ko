import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Toc } from '@/components/site/toc';
import { loadTranslations } from '@/lib/bilingual/translations';
import { getDocContext, type DocLinkInfo } from '@/lib/content/cached';
import { docsBase, parseDocsPath } from '@/lib/content/paths';
import { findDoc, loadDocsIndex, readDocSource } from '@/lib/content/source';
import { getVersion, getVersions } from '@/lib/content/versions';
import { renderMdx } from '@/lib/mdx/render';

/** 최신 버전은 /docs/<key>, 이전 버전은 /docs/<버전>/<key> */
export function generateStaticParams() {
  return getVersions().flatMap((version) =>
    loadDocsIndex(version.id).map((doc) => ({ slug: version.latest ? doc.slug : [version.id, ...doc.slug] })),
  );
}

function resolveDoc(slug: string[] | undefined) {
  const pathname = `/docs/${(slug ?? []).map(decodeURIComponent).join('/')}`;
  const parsed = parseDocsPath(pathname, getVersions());
  return parsed ? findDoc(parsed.versionId, parsed.key) : undefined;
}

export async function generateMetadata({ params }: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const { slug } = await params;
  const doc = resolveDoc(slug);
  if (!doc) return {};
  const { koTitle, koDescription, version } = await getDocContext(doc.versionId, doc.key);
  const title = koTitle ? `${doc.title} (${koTitle})` : doc.title;
  return {
    title: version.latest ? title : `${title} · ${version.label}`,
    description: koDescription ?? doc.description,
  };
}

export default async function DocPage({ params }: PageProps<'/docs/[[...slug]]'>) {
  const { slug } = await params;
  const doc = resolveDoc(slug);
  if (!doc) notFound();
  return <DocArticle versionId={doc.versionId} docKey={doc.key} />;
}

/** 제목·설명 문자열의 `코드` 부분만 코드 서식으로 보여 준다. */
function InlineText({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
      <code key={index} className="inline-code">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

function Bilingual({ en, ko, as: Tag = 'span', className }: { en: string; ko?: string; as?: 'span' | 'p' | 'h1'; className?: string }) {
  return (
    <Tag className={className}>
      <span className={ko ? 'en has-ko' : 'en'}>
        <InlineText text={en} />
      </span>
      {ko ? (
        <span className="ko">
          <InlineText text={ko} />
        </span>
      ) : null}
    </Tag>
  );
}

function PagerLink({ info, direction }: { info: DocLinkInfo; direction: 'prev' | 'next' }) {
  return (
    <Link href={info.href} className={`pager__link pager__link--${direction}`}>
      <span className="pager__label">{direction === 'prev' ? '← 이전' : '다음 →'}</span>
      <Bilingual en={info.title} ko={info.koTitle} className="pager__title" />
    </Link>
  );
}

async function DocArticle({ versionId, docKey }: { versionId: string; docKey: string }) {
  'use cache';
  cacheLife('max');

  const context = await getDocContext(versionId, docKey);
  const { doc, progress } = context;
  const { content: source } = readDocSource(doc);
  const rendered = await renderMdx(source, {
    translations: loadTranslations(doc.key),
    knownKeys: new Set(loadDocsIndex(versionId).map((entry) => entry.key)),
    docsBase: docsBase(getVersion(versionId)!),
  });
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="doc-layout">
      <article className="doc">
        <header className="doc-header">
          {context.latestLink ? (
            <div className="version-notice" role="note">
              <strong>이전 버전({context.version.label}) 문서입니다.</strong>{' '}
              <Link href={context.latestLink.href}>최신 버전({context.latestLink.label}) 문서 보기 →</Link>
            </div>
          ) : null}
          {context.breadcrumbs.length ? (
            <nav className="breadcrumbs" aria-label="현재 위치">
              {context.breadcrumbs.map((crumb) => (
                <Link key={crumb.href} href={crumb.href}>
                  {crumb.title}
                </Link>
              ))}
            </nav>
          ) : null}
          <Bilingual as="h1" en={doc.title} ko={context.koTitle} className="doc-title" />
          {doc.description ? <Bilingual as="p" en={doc.description} ko={context.koDescription} className="doc-description" /> : null}
          <div className="doc-meta">
            {doc.stage ? <span className="badge badge--warn">{doc.stage}</span> : null}
            <span className={`badge ${percent === 100 ? 'badge--ok' : percent > 0 ? 'badge--partial' : ''}`}>
              {progress.done ? `번역 ${progress.done}/${progress.total} (${percent}%)` : '번역 예정 · 원문만 표시'}
            </span>
            <a href={context.originUrl} target="_blank" rel="noreferrer" className="doc-meta__origin">
              원문 보기 ↗
            </a>
          </div>
          {context.upstream ? (
            <div className="upstream-notice" role="note">
              <strong>{context.upstream.compareLabel}와(과) 내용이 다릅니다.</strong>{' '}
              이 페이지는 {context.version.tag} 기준이며, 이후 원문이 수정되었습니다
              {context.upstream.translation && (context.upstream.translation.stale || context.upstream.translation.added)
                ? ` (맞지 않게 될 번역 ${context.upstream.translation.stale}개 · 번역이 필요한 문장 ${context.upstream.translation.added}개)`
                : ''}
              .{' '}
              <a href={context.upstream.historyUrl} target="_blank" rel="noreferrer">
                변경 이력 보기 ↗
              </a>
              <span className="upstream-notice__date"> · {context.upstream.checkedAt.slice(0, 10)} 확인</span>
            </div>
          ) : null}
        </header>

        <div className="doc-body">
          {rendered.error ? (
            <div className="render-error">
              <p>이 페이지의 원문을 렌더링하지 못했습니다. nextjs.org 원문을 확인해 주세요.</p>
              <code>{rendered.error}</code>
            </div>
          ) : (
            rendered.content
          )}
        </div>

        {context.related ? (
          <section className="related">
            <h2 className="related__title">{context.related.title ?? 'Next Steps'}</h2>
            <div className="related__grid">
              {context.related.links.map((link) => (
                <Link key={link.href} href={link.href} className="related__card">
                  <Bilingual en={link.title} ko={link.koTitle} className="related__card-title" />
                  {link.description ? <Bilingual as="p" en={link.description} ko={link.koDescription} className="related__card-desc" /> : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <nav className="pager" aria-label="이전·다음 문서">
          {context.prev ? <PagerLink info={context.prev} direction="prev" /> : <span />}
          {context.next ? <PagerLink info={context.next} direction="next" /> : <span />}
        </nav>
      </article>
      <Toc entries={rendered.toc} originUrl={context.originUrl} />
    </div>
  );
}
