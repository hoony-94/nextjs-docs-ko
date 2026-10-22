'use client';

import { useState } from 'react';

export function CopyButton({ text, label = '복사', className = 'copy-button' }: { text: string; label?: string; className?: string }) {
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
    <button type="button" onClick={copy} className={className} aria-label={label}>
      {copied ? '복사됨' : label}
    </button>
  );
}
