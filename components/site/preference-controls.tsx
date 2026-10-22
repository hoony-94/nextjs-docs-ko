'use client';

import { useSyncExternalStore } from 'react';
import { PREFERENCE_EVENT, THEME_KEY, VIEW_KEY, type ViewMode } from './preferences';

function subscribe(callback: () => void) {
  window.addEventListener(PREFERENCE_EVENT, callback);
  return () => window.removeEventListener(PREFERENCE_EVENT, callback);
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장소를 못 쓰면 새로고침 전까지만 유지된다.
  }
  window.dispatchEvent(new Event(PREFERENCE_EVENT));
}

const VIEW_OPTIONS: { value: ViewMode; label: string; title: string }[] = [
  { value: 'both', label: '원문+번역', title: '영어 원문 아래에 한국어 번역 표시' },
  { value: 'ko', label: '번역', title: '번역된 문장은 한국어만 표시' },
  { value: 'en', label: '원문', title: '영어 원문만 표시' },
];

export function ViewModeToggle() {
  const view = useSyncExternalStore(
    subscribe,
    () => (document.documentElement.dataset.view as ViewMode) ?? 'both',
    () => 'both' as ViewMode,
  );

  return (
    <div className="segmented" role="radiogroup" aria-label="보기 모드">
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={view === option.value}
          title={option.title}
          className="segmented__item"
          onClick={() => {
            document.documentElement.dataset.view = option.value;
            save(VIEW_KEY, option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains('dark'),
    () => false,
  );

  return (
    <button
      type="button"
      className="icon-button"
      aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      onClick={() => {
        const next = !dark;
        document.documentElement.classList.toggle('dark', next);
        save(THEME_KEY, next ? 'dark' : 'light');
      }}
    >
      {dark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
