import type { Metadata } from 'next';
import Link from 'next/link';
import { ROADMAPS } from '@/lib/roadmaps';
import { getResolvedRoadmap } from '@/lib/roadmaps/resolve';

export const metadata: Metadata = {
  title: '학습 로드맵',
  description: '목표별로 Next.js 문서를 읽는 순서를 정리한 학습 로드맵입니다.',
};

export default async function RoadmapsPage() {
  const roadmaps = (await Promise.all(ROADMAPS.map((roadmap) => getResolvedRoadmap(roadmap.slug)))).filter((roadmap) => roadmap !== null);

  return (
    <main className="roadmaps">
      <header className="roadmaps__hero">
        <p className="home__eyebrow">학습 로드맵</p>
        <h1>목표에 맞춰 문서를 순서대로 읽기</h1>
        <p className="home__lead">
          300개가 넘는 문서를 처음부터 다 읽기는 어렵습니다. 로드맵은 하나의 목표에 필요한 문서만 골라 읽는 순서대로 묶고, 단계마다 학습 목표와 읽는
          이유를 붙였습니다. 이 사이트에 없는 문서(블로그, Pages Router, web.dev 등)도 필요하면 함께 연결합니다.
        </p>
      </header>

      <section className="roadmaps__grid" aria-label="로드맵 목록">
        {roadmaps.map((roadmap) => (
          <Link key={roadmap.slug} href={`/roadmaps/${roadmap.slug}`} className="roadmap-card">
            <span className="roadmap-card__eyebrow">
              {roadmap.stats.stages}단계 · 문서 {roadmap.stats.items}개
            </span>
            <span className="roadmap-card__title">{roadmap.titleKo}</span>
            <span className="roadmap-card__en">{roadmap.title}</span>
            <span className="roadmap-card__summary">{roadmap.summary}</span>
            <ol className="roadmap-card__steps">
              {roadmap.stages.map((stage) => (
                <li key={stage.id}>{stage.titleKo}</li>
              ))}
            </ol>
          </Link>
        ))}
        <div className="roadmap-card roadmap-card--soon">
          <span className="roadmap-card__title">다음 로드맵</span>
          <span className="roadmap-card__summary">앞으로 다른 주제의 로드맵이 이 목록에 추가됩니다.</span>
        </div>
      </section>
    </main>
  );
}
