import Link from 'next/link';
import { getSiteStats } from '@/lib/content/cached';

const SECTIONS = [
  { href: '/docs/app/getting-started', title: 'Getting Started', ko: '시작하기', text: '설치부터 레이아웃, 데이터 가져오기, 배포까지 Next.js의 기본 흐름을 순서대로 익힙니다.' },
  { href: '/docs/app/guides', title: 'Guides', ko: '가이드', text: '인증, 캐싱, 국제화, 테스트처럼 실제 서비스에서 마주치는 주제별 해결 방법을 다룹니다.' },
  { href: '/docs/app/api-reference', title: 'API Reference', ko: 'API 레퍼런스', text: '컴포넌트, 파일 규칙, 함수, 설정 옵션을 하나씩 찾아보는 사전입니다.' },
  { href: '/docs/architecture', title: 'Architecture', ko: '아키텍처', text: 'Next.js 컴파일러, Fast Refresh, 지원 브라우저 같은 내부 구조를 설명합니다.' },
  { href: '/docs/community', title: 'Community', ko: '커뮤니티', text: '문서 기여 방법과 커뮤니티 리소스를 안내합니다.' },
];

export default async function Home() {
  const stats = await getSiteStats();

  return (
    <main className="home">
      <section className="home__hero">
        <p className="home__eyebrow">비공식 학습용 번역 · next@{stats.release}</p>
        <h1>Next.js 문서를 영어 원문과 한국어로 함께 읽기</h1>
        <p className="home__lead">
          공식 문서의 영어 문장 바로 아래에 한국어 번역을 붙였습니다. 원문의 뉘앙스를 놓치지 않으면서 빠르게 이해할 수 있도록, 상단에서 원문+번역 · 번역만 · 원문만 보기를 바꿀 수 있습니다.
        </p>
        <div className="home__actions">
          <Link href="/docs/app/getting-started/installation" className="button button--primary">
            설치부터 시작하기
          </Link>
          <Link href="/docs" className="button">
            문서 전체 보기
          </Link>
        </div>
        <dl className="home__stats">
          <div>
            <dt>원문 문서</dt>
            <dd>{stats.total}개</dd>
          </div>
          <div>
            <dt>번역된 문서</dt>
            <dd>{stats.translated}개</dd>
          </div>
          <div>
            <dt>원문 버전</dt>
            <dd>v{stats.release}</dd>
          </div>
        </dl>
        {stats.versions.length > 1 ? (
          <p className="home__versions">
            제공 중인 문서 버전:{' '}
            {stats.versions.map((version, index) => (
              <span key={version.id}>
                {index ? ' · ' : ''}
                <Link href={version.href}>
                  {version.label} ({version.tag}){version.latest ? ' 최신' : ''}
                </Link>
              </span>
            ))}
          </p>
        ) : null}
      </section>

      <section className="home__sections">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className="home__card">
            <span className="home__card-title">
              {section.title} <span className="home__card-ko">{section.ko}</span>
            </span>
            <span className="home__card-text">{section.text}</span>
          </Link>
        ))}
      </section>

      <section className="home__upstream">
        <h2>nextjs.org 최신 문서와 비교</h2>
        {stats.upstream ? (
          <>
            <p className="home__upstream-summary">
              {stats.upstream.newMajor ? (
                <strong className="home__upstream-alert">
                  Next.js {stats.upstream.newMajor}이(가) 출시되었습니다. 이 사이트의 최신 문서는 v{stats.release} 기준입니다.{' '}
                </strong>
              ) : stats.upstream.newerRelease ? (
                <strong className="home__upstream-alert">
                  새 릴리스 v{stats.upstream.newerRelease}이(가) 나왔습니다. 이 사이트는 v{stats.release} 기준입니다.{' '}
                </strong>
              ) : null}
              v{stats.release} 이후 {stats.upstream.compareLabel}에서 수정된 페이지 <strong>{stats.upstream.changed.length}개</strong>, 새로 생긴 페이지{' '}
              <strong>{stats.upstream.added.length}개</strong>, 삭제된 페이지 <strong>{stats.upstream.removed.length}개</strong>.{' '}
              <a href={stats.upstream.compareUrl} target="_blank" rel="noreferrer">
                전체 변경 비교 ↗
              </a>
            </p>
            <p className="home__upstream-date">
              {stats.upstream.checkedAt.slice(0, 10)} 확인
              {stats.upstream.upstreamDate ? ` · 비교 기준 ${stats.upstream.upstreamDate.slice(0, 10)}` : ''}
            </p>
            {stats.upstream.changed.length ? (
              <details className="home__upstream-list">
                <summary>수정된 페이지 보기</summary>
                <ul>
                  {stats.upstream.changed.map((page) => (
                    <li key={page.key}>
                      <Link href={page.href}>{page.title}</Link>
                      {page.translation ? (
                        <span className="home__upstream-impact">
                          {' '}
                          번역 영향: 맞지 않게 될 번역 {page.translation.stale} · 새 문장 {page.translation.added}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            {stats.upstream.added.length ? (
              <details className="home__upstream-list">
                <summary>최신 문서에만 있는 페이지</summary>
                <ul>
                  {stats.upstream.added.map((page) => (
                    <li key={page.key}>
                      <a href={page.url} target="_blank" rel="noreferrer">
                        {page.key} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <p className="home__upstream-summary">
            아직 비교 결과가 없습니다. <code className="inline-code">pnpm docs:check</code>를 실행하면 확인할 수 있습니다.
          </p>
        )}
      </section>

      <section className="home__notes">
        <h2>이 사이트는 이렇게 만들어졌습니다</h2>
        <ul>
          <li>영어 원문은 설치된 next 패키지에 포함된 문서(MIT 라이선스)를 빌드할 때 그대로 읽어 옵니다. 그래서 원문은 항상 표시된 버전과 정확히 같습니다.</li>
          <li>번역은 문장 단위로 따로 저장해 두고, 원문 문장과 짝이 맞을 때만 그 아래에 붙입니다. 원문이 바뀐 문장은 자동으로 원문만 보입니다.</li>
          <li>이미지와 영상은 nextjs.org에만 있어서 설명과 원문 링크로 대신합니다.</li>
        </ul>
      </section>
    </main>
  );
}
