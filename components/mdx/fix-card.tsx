import Link from 'next/link';
import type { ReactNode } from 'react';

type Snippet = { text: string; highlight?: boolean };

export function FixCardGrid({ children }: { children?: ReactNode }) {
  return <div className="fix-grid">{children}</div>;
}

export function FixCard({ title, href = '#', snippets = [] }: { title?: string; href?: string; snippets?: Snippet[] }) {
  const body = (
    <>
      <span className="fix-card__title">{title}</span>
      <pre className="fix-card__code">
        {snippets.map((snippet, index) => (
          <span key={index} className={snippet.highlight ? 'is-highlighted' : undefined}>
            {snippet.text}
            {'\n'}
          </span>
        ))}
      </pre>
    </>
  );
  return href.startsWith('/') ? (
    <Link href={href} className="fix-card">
      {body}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noreferrer" className="fix-card">
      {body}
    </a>
  );
}
