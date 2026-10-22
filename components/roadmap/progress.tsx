'use client';

import { useSyncExternalStore } from 'react';

/**
 * 로드맵 학습 체크. 이 브라우저의 localStorage에만 저장하는 개인용 진행률이다.
 * 저장소를 쓸 수 없으면 체크가 저장되지 않을 뿐 화면은 그대로 동작한다.
 */

const EVENT = 'roadmap-progress-change';
const EMPTY: readonly string[] = [];
const snapshots = new Map<string, { raw: string | null; value: readonly string[] }>();

function storageKey(slug: string) {
  return `roadmap-progress:${slug}`;
}

function read(slug: string): readonly string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey(slug));
  } catch {
    return EMPTY;
  }
  const cached = snapshots.get(slug);
  if (cached && cached.raw === raw) return cached.value;
  let value: readonly string[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    value = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : EMPTY;
  } catch {
    value = EMPTY;
  }
  snapshots.set(slug, { raw, value });
  return value;
}

function write(slug: string, ids: readonly string[]) {
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(ids));
  } catch {
    // 저장할 수 없는 환경이면 무시한다.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function useDone(slug: string) {
  return useSyncExternalStore(
    subscribe,
    () => read(slug),
    () => EMPTY,
  );
}

export function ProgressCheck({ slug, id, label }: { slug: string; id: string; label: string }) {
  const done = useDone(slug);
  const checked = done.includes(id);
  return (
    <label className="roadmap-check" title={checked ? '읽음 표시 해제' : '읽음으로 표시'}>
      <input
        type="checkbox"
        checked={checked}
        aria-label={`${label} 읽음`}
        onChange={() => write(slug, checked ? done.filter((value) => value !== id) : [...done, id])}
      />
    </label>
  );
}

export function ProgressBar({ slug, ids, label }: { slug: string; ids: string[]; label?: string }) {
  const done = useDone(slug);
  const count = ids.filter((id) => done.includes(id)).length;
  const percent = ids.length ? Math.round((count / ids.length) * 100) : 0;
  return (
    <div className="roadmap-progress" aria-label={label ?? '진행률'}>
      <div className="roadmap-progress__track">
        <div className="roadmap-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="roadmap-progress__text">
        {count}/{ids.length}
      </span>
    </div>
  );
}

export function ResetProgress({ slug }: { slug: string }) {
  const done = useDone(slug);
  if (!done.length) return null;
  return (
    <button type="button" className="roadmap-reset" onClick={() => write(slug, [])}>
      진행률 초기화
    </button>
  );
}
