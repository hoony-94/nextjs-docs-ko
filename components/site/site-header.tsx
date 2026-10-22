import Link from 'next/link';
import { getVersionSummaries } from '@/lib/content/cached';
import { ThemeToggle, ViewModeToggle } from './preference-controls';
import { VersionSwitcher } from './version-switcher';

export async function SiteHeader() {
  const versions = await getVersionSummaries();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          <span className="brand__mark" aria-hidden="true">
            문
          </span>
          <span className="brand__name">Next.js 문서</span>
          <span className="brand__badge">한국어 · 비공식</span>
        </Link>
        <nav className="site-nav" aria-label="주요 메뉴">
          <Link href="/docs/app/getting-started">시작하기</Link>
          <Link href="/docs/app/guides">가이드</Link>
          <Link href="/docs/app/api-reference">API 레퍼런스</Link>
        </nav>
        <div className="site-header__actions">
          <VersionSwitcher versions={versions} />
          <ViewModeToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
