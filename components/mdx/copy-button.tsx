'use client';

import { useState } from 'react';

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 권한이 없으면 조용히 무시한다.
    }
  }

  return (
    <button type="button" onClick={copy} className="copy-button" aria-label="코드 복사">
      {copied ? '복사됨' : '복사'}
    </button>
  );
}
