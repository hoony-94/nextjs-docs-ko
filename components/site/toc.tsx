'use client';

import { useEffect, useState } from 'react';
import type { TocEntry } from '@/lib/mdx/remark-docs';

/** 오른쪽 "이 페이지에서" 목차. 화면에 보이는 제목을 따라 강조한다. */
export function Toc({ entries, originUrl }: { entries: TocEntry[]; originUrl: string }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((element): element is HTMLElement => element !== null);
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((record) => record.isIntersecting);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -70% 0px' },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [entries]);

  return (
    <aside className="toc" aria-label="이 페이지에서">
      {entries.length ? (
        <>
          <p className="toc__title">이 페이지에서</p>
          <ul>
            {entries.map((entry) => (
              <li key={entry.id} className={entry.depth === 3 ? 'toc__sub' : undefined}>
                <a href={`#${entry.id}`} className={active === entry.id ? 'is-active' : undefined}>
                  <span className={entry.ko ? 'en has-ko' : 'en'}>{entry.text}</span>
                  {entry.ko ? <span className="ko">{entry.ko.replace(/`/g, '')}</span> : null}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <a href={originUrl} target="_blank" rel="noreferrer" className="toc__origin">
        nextjs.org 원문 보기 ↗
      </a>
    </aside>
  );
}
