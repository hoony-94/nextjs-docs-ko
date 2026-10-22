'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { NavNode } from '@/lib/content/nav';
import { parseDocsPath } from '@/lib/content/paths';

export type SidebarVersion = {
  id: string;
  latest: boolean;
  sections: NavNode[];
  translatedKeys: string[];
  changedKeys: string[];
};

type SidebarProps = { versions: SidebarVersion[]; onNavigate?: () => void };

type Markers = { translated: Set<string>; changed: Set<string> };

function Badges({ nodeKey, markers }: { nodeKey: string; markers: Markers }) {
  return (
    <>
      {markers.translated.has(nodeKey) ? (
        <span className="nav-item__ko" title="번역 있음">
          KO
        </span>
      ) : null}
      {markers.changed.has(nodeKey) ? <span className="nav-item__changed" title="비교 대상 원문과 내용이 다름" aria-label="원문이 수정됨" /> : null}
    </>
  );
}

function containsPath(node: NavNode, pathname: string): boolean {
  return node.href === pathname || node.children.some((child) => containsPath(child, pathname));
}

function filterTree(nodes: NavNode[], query: string): NavNode[] {
  return nodes.flatMap((node) => {
    const children = filterTree(node.children, query);
    if (node.title.toLowerCase().includes(query) || children.length) return [{ ...node, children }];
    return [];
  });
}

function NavItem({ node, depth, markers, onNavigate, forceOpen }: {
  node: NavNode;
  depth: number;
  markers: Markers;
  onNavigate?: () => void;
  forceOpen: boolean;
}) {
  const pathname = usePathname();
  const active = node.href === pathname;
  const [open, setOpen] = useState<boolean | null>(null);
  const expanded = forceOpen || (open ?? containsPath(node, pathname));
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div className={`nav-item${active ? ' is-active' : ''}`} style={{ paddingLeft: `${depth * 12 + 8}px` }}>
        <Link href={node.href} onClick={onNavigate} aria-current={active ? 'page' : undefined} className="nav-item__link">
          {node.title}
          <Badges nodeKey={node.key} markers={markers} />
        </Link>
        {hasChildren ? (
          <button
            type="button"
            className="nav-item__toggle"
            aria-label={expanded ? '접기' : '펼치기'}
            aria-expanded={expanded}
            onClick={() => setOpen(!expanded)}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true" style={{ transform: expanded ? 'rotate(90deg)' : undefined }}>
              <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>
      {hasChildren && expanded ? (
        <ul>
          {node.children.map((child) => (
            <NavItem key={child.key} node={child} depth={depth + 1} markers={markers} onNavigate={onNavigate} forceOpen={forceOpen} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function Sidebar({ versions, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const currentId = parseDocsPath(pathname, versions)?.versionId;
  const current = versions.find((version) => version.id === currentId) ?? versions[0];
  const { sections } = current;
  const markers: Markers = { translated: new Set(current.translatedKeys), changed: new Set(current.changedKeys) };
  const normalized = query.trim().toLowerCase();
  const visible = normalized ? filterTree(sections, normalized) : sections;

  return (
    <div className="sidebar">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="메뉴 검색"
        aria-label="메뉴 검색"
        className="sidebar__search"
      />
      <nav aria-label="문서 메뉴">
        {visible.map((section) => (
          <div key={section.key} className="sidebar__section">
            <Link href={section.href} onClick={onNavigate} className="sidebar__heading">
              {section.title}
              <Badges nodeKey={section.key} markers={markers} />
            </Link>
            <ul>
              {section.children.map((node) => (
                <NavItem key={node.key} node={node} depth={0} markers={markers} onNavigate={onNavigate} forceOpen={Boolean(normalized)} />
              ))}
            </ul>
          </div>
        ))}
        {visible.length === 0 ? <p className="sidebar__empty">검색 결과가 없습니다.</p> : null}
      </nav>
    </div>
  );
}
