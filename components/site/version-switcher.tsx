'use client';

import { usePathname, useRouter } from 'next/navigation';
import { docsHref, parseDocsPath } from '@/lib/content/paths';

type VersionOption = { id: string; label: string; tag: string; release: string; latest: boolean; keys: string[] };

/** 문서 버전 선택. 다른 버전에도 같은 문서가 있으면 그 문서로, 없으면 그 버전의 첫 화면으로 이동한다. */
export function VersionSwitcher({ versions }: { versions: VersionOption[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const parsed = parseDocsPath(pathname, versions);
  const current = versions.find((version) => version.id === parsed?.versionId) ?? versions[0];

  if (versions.length === 1) {
    return (
      <span className="version-chip" title={`원문 ${current.tag}`}>
        v{current.release}
      </span>
    );
  }

  return (
    <label className="version-select" title={`원문 ${current.tag}`}>
      <span className="sr-only">문서 버전</span>
      <select
        value={current.id}
        onChange={(event) => {
          const target = versions.find((version) => version.id === event.target.value);
          if (!target) return;
          const key = parsed?.key ?? '';
          router.push(docsHref(target, target.keys.includes(key) ? key : ''));
        }}
      >
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {version.label} ({version.release}){version.latest ? ' · 최신' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
