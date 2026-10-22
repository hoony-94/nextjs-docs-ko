import type { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CopyButton } from '@/components/mdx/copy-button';
import { ProgressBar, ProgressCheck, ResetProgress } from '@/components/roadmap/progress';
import { getRoadmap, ROADMAPS } from '@/lib/roadmaps';
import { getResolvedRoadmap, type ResolvedItem } from '@/lib/roadmaps/resolve';

export function generateStaticParams() {
  return ROADMAPS.map((roadmap) => ({ slug: roadmap.slug }));
}

export async function generateMetadata({ params }: PageProps<'/roadmaps/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const roadmap = getRoadmap(slug);
  if (!roadmap) return {};
  return { title: `${roadmap.titleKo} 로드맵`, description: roadmap.summary };
}

export default async function RoadmapPage({ params }: PageProps<'/roadmaps/[slug]'>) {
  const { slug } = await params;
  if (!getRoadmap(slug)) notFound();
  return <RoadmapView slug={slug} />;
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

function ItemRow({ item, index, slug }: { item: ResolvedItem; index: number; slug: string }) {
  const external = item.kind === 'external';
  const showKo = item.titleKo && item.titleKo !== item.title;
  const title = (
    <>
      <span className="roadmap-item__title-en">
        <InlineText text={item.title} />
      </span>
      {showKo ? (
        <span className="roadmap-item__title-ko">
          <InlineText text={item.titleKo!} />
        </span>
      ) : null}
    </>
  );

  return (
    <li className={`roadmap-item roadmap-item--${item.level}`}>
      <span className="roadmap-item__index">{index + 1}</span>
      <ProgressCheck slug={slug} id={item.id} label={item.titleKo ?? item.title} />
      <div className="roadmap-item__body">
        <div className="roadmap-item__head">
          {external ? (
            <a href={item.href} target="_blank" rel="noreferrer" className="roadmap-item__title">
              {title}
            </a>
          ) : (
            <Link href={item.href} className="roadmap-item__title">
              {title}
            </Link>
          )}
          <span className="roadmap-item__badges">
            <span className={`roadmap-badge roadmap-badge--${item.level}`}>{item.level === 'core' ? '핵심' : '심화'}</span>
            <span className={`roadmap-badge${external ? ' roadmap-badge--external' : ''}`}>
              {item.category}
              {external ? ' · 영어 ↗' : ''}
            </span>
            {item.missing ? <span className="roadmap-badge roadmap-badge--missing">현재 버전에 없음</span> : null}
          </span>
        </div>
        <p className="roadmap-item__focus">
          <InlineText text={item.focus} />
        </p>
        {item.descriptionKo ? (
          <p className="roadmap-item__desc">
            <InlineText text={item.descriptionKo} />
          </p>
        ) : null}
        <div className="roadmap-item__meta">
          <span className="roadmap-item__path">{external ? item.url.replace(/^https?:\/\//, '') : item.href}</span>
          <CopyButton text={item.url} label="링크 복사" className="roadmap-copy" />
        </div>
      </div>
    </li>
  );
}

async function RoadmapView({ slug }: { slug: string }) {
  'use cache';
  cacheLife('max');
  const roadmap = (await getResolvedRoadmap(slug))!;
  const allIds = roadmap.stages.flatMap((stage) => stage.items.map((item) => item.id));

  return (
    <main className="roadmap">
      <nav className="breadcrumbs" aria-label="현재 위치">
        <Link href="/roadmaps">학습 로드맵</Link>
        <Link href={`/roadmaps/${roadmap.slug}`}>{roadmap.titleKo}</Link>
      </nav>

      <header className="roadmap__hero">
        <p className="home__eyebrow">로드맵 · 원문 {roadmap.docsVersion} 기준</p>
        <h1>
          {roadmap.titleKo}
          <span className="roadmap__title-en">{roadmap.title}</span>
        </h1>
        <p className="home__lead">{roadmap.summary}</p>
        <p className="roadmap__audience">
          <strong>대상</strong> {roadmap.audience}
        </p>
        <ul className="roadmap__stats">
          <li>{roadmap.stats.stages}단계</li>
          <li>문서 {roadmap.stats.items}개</li>
          <li>핵심 {roadmap.stats.core}개</li>
          <li>이 사이트 문서 {roadmap.stats.docs}개</li>
          <li>외부 문서 {roadmap.stats.external}개</li>
        </ul>
        <div className="roadmap__overall">
          <span className="roadmap__overall-label">내 진행률</span>
          <ProgressBar slug={roadmap.slug} ids={allIds} label="전체 진행률" />
          <ResetProgress slug={roadmap.slug} />
        </div>
        <div className="roadmap__actions">
          <CopyButton text={roadmap.markdown} label="목차 Markdown 복사" className="button" />
          <CopyButton text={roadmap.url} label="로드맵 링크 복사" className="button" />
        </div>
        <ul className="roadmap__howto">
          {roadmap.howTo.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </header>

      <section className="roadmap-flow-section" aria-labelledby="flow-title">
        <h2 id="flow-title" className="roadmap__section-title">
          학습 흐름 <span>Learning flow</span>
        </h2>
        <ol className="roadmap-flow">
          {roadmap.stages.map((stage, index) => {
            const core = stage.items.filter((item) => item.level === 'core').length;
            return (
              <li key={stage.id} className="roadmap-flow__node">
                <a href={`#stage-${stage.id}`} className="roadmap-flow__card">
                  <span className="roadmap-flow__step">STEP {index + 1}</span>
                  <span className="roadmap-flow__title">{stage.titleKo}</span>
                  <span className="roadmap-flow__en">{stage.title}</span>
                  <span className="roadmap-flow__count">
                    핵심 {core} · 심화 {stage.items.length - core}
                  </span>
                  <ProgressBar slug={roadmap.slug} ids={stage.items.map((item) => item.id)} label={`${stage.titleKo} 진행률`} />
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      {roadmap.stages.map((stage, index) => (
        <section key={stage.id} id={`stage-${stage.id}`} className="roadmap-stage" aria-labelledby={`stage-title-${stage.id}`}>
          <header className="roadmap-stage__header">
            <span className="roadmap-stage__step">STEP {index + 1}</span>
            <h2 id={`stage-title-${stage.id}`}>
              {stage.titleKo}
              <span>{stage.title}</span>
            </h2>
            <p className="roadmap-stage__goal">{stage.goal}</p>
            <div className="roadmap-stage__outcomes">
              <strong>이 단계를 마치면</strong>
              <ul>
                {stage.outcomes.map((outcome) => (
                  <li key={outcome}>
                    <InlineText text={outcome} />
                  </li>
                ))}
              </ul>
            </div>
            <ProgressBar slug={roadmap.slug} ids={stage.items.map((item) => item.id)} label={`${stage.titleKo} 진행률`} />
          </header>
          <ol className="roadmap-items">
            {stage.items.map((item, itemIndex) => (
              <ItemRow key={item.id} item={item} index={itemIndex} slug={roadmap.slug} />
            ))}
          </ol>
        </section>
      ))}

      {roadmap.milestones ? (
        <section className="roadmap-timeline-section" aria-labelledby="timeline-title">
          <h2 id="timeline-title" className="roadmap__section-title">
            {roadmap.milestones.title} <span>Timeline</span>
          </h2>
          <p className="roadmap__note">{roadmap.milestones.note}</p>
          <ol className="roadmap-timeline">
            {roadmap.milestones.items.map((milestone) => (
              <li key={`${milestone.version}-${milestone.feature}`} className="roadmap-timeline__item">
                <span className="roadmap-timeline__version">{milestone.version}</span>
                <div className="roadmap-timeline__body">
                  <span className="roadmap-timeline__feature">
                    {milestone.href ? <Link href={milestone.href}>{milestone.feature}</Link> : milestone.feature}
                  </span>
                  <p>
                    <span className="roadmap-timeline__label">문제</span>
                    <InlineText text={milestone.problem} />
                  </p>
                  <p>
                    <span className="roadmap-timeline__label roadmap-timeline__label--solution">해결</span>
                    <InlineText text={milestone.solution} />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </main>
  );
}
