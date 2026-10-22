'use client';

import { useState } from 'react';
import { Sidebar, type SidebarVersion } from './sidebar';

export function MobileNav({ versions }: { versions: SidebarVersion[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-nav">
      <button type="button" className="mobile-nav__button" onClick={() => setOpen(true)} aria-expanded={open}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        메뉴
      </button>
      {open ? (
        <div className="mobile-nav__overlay" role="dialog" aria-modal="true" aria-label="문서 메뉴">
          <div className="mobile-nav__panel">
            <button type="button" className="mobile-nav__close" onClick={() => setOpen(false)}>
              닫기
            </button>
            <Sidebar versions={versions} onNavigate={() => setOpen(false)} />
          </div>
          <button type="button" className="mobile-nav__backdrop" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
