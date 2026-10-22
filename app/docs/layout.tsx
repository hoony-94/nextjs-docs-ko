import { MobileNav } from '@/components/site/mobile-nav';
import { Sidebar } from '@/components/site/sidebar';
import { getSidebarData } from '@/lib/content/cached';

/** 모든 버전의 사이드바 데이터를 넘기고, 사이드바가 현재 주소로 버전을 고른다 (레이아웃은 유지된다). */
export default async function DocsLayout({ children }: LayoutProps<'/docs'>) {
  const versions = await getSidebarData();

  return (
    <div className="docs-shell">
      <aside className="docs-shell__sidebar">
        <Sidebar versions={versions} />
      </aside>
      <div className="docs-shell__main">
        <MobileNav versions={versions} />
        {children}
      </div>
    </div>
  );
}
