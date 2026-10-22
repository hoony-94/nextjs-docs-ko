import type { ReactNode } from 'react';
import { CopyButton } from './copy-button';
import { FileIcon } from './icons';

export function CodeBlock({ filename, code, children }: { filename?: string; code?: string; children?: ReactNode }) {
  return (
    <figure className="code-block">
      {filename ? (
        <figcaption className="code-block__title">
          <FileIcon />
          <span>{filename}</span>
        </figcaption>
      ) : null}
      <div className="code-block__body">
        {children}
        {code ? <CopyButton text={code} /> : null}
      </div>
    </figure>
  );
}
