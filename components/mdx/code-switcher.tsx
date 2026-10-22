'use client';

import { Children, useSyncExternalStore, type ReactNode } from 'react';

const EVENT = 'code-switcher-change';

function storageKey(kind: string) {
  return `code-switcher:${kind}`;
}

function readPreference(kind: string) {
  try {
    return localStorage.getItem(storageKey(kind));
  } catch {
    return null;
  }
}

function subscribe(callback: () => void) {
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

/** TypeScript/JavaScript 또는 pnpm/npm/yarn/bun 탭. 선택은 모든 코드 블록에 함께 적용된다. */
export function CodeSwitcher({ kind = 'lang', labels = '', children }: { kind?: string; labels?: string; children?: ReactNode }) {
  const tabs = labels.split(',');
  const items = Children.toArray(children);
  const preference = useSyncExternalStore(
    subscribe,
    () => readPreference(kind),
    () => null,
  );
  const active = Math.max(0, preference ? tabs.indexOf(preference) : 0);

  function select(label: string) {
    try {
      localStorage.setItem(storageKey(kind), label);
    } catch {
      // 저장소를 못 쓰면 이번 화면에서만 바뀌지 않는다.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <div className="code-switcher">
      <div className="code-switcher__tabs" role="tablist">
        {tabs.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={index === active}
            className="code-switcher__tab"
            onClick={() => select(label)}
          >
            {label}
          </button>
        ))}
      </div>
      {items.map((item, index) => (
        <div key={index} hidden={index !== active}>
          {item}
        </div>
      ))}
    </div>
  );
}
