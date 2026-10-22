import { compareDocs, loadDocsIndex, type DocMeta } from './source';

export type NavNode = {
  key: string;
  title: string;
  href: string;
  order: number | null;
  children: NavNode[];
};

function toNode(doc: DocMeta): NavNode {
  return { key: doc.key, title: doc.navTitle, href: doc.href, order: doc.order, children: [] };
}

/** 한 버전의 문서 경로를 기준으로 트리를 만든다. 루트('')가 최상위 노드다. */
export function buildNavTree(versionId: string): NavNode {
  const docs = loadDocsIndex(versionId);
  const byKey = new Map(docs.map((doc) => [doc.key, toNode(doc)]));
  const root = byKey.get('')!;

  for (const doc of docs) {
    if (doc.key === '') continue;
    const parentKey = doc.slug.slice(0, -1).join('/');
    const parent = byKey.get(parentKey) ?? root;
    parent.children.push(byKey.get(doc.key)!);
  }

  const sort = (node: NavNode) => {
    node.children.sort((a, b) => compareDocs({ order: a.order, navTitle: a.title }, { order: b.order, navTitle: b.title }));
    node.children.forEach(sort);
  };
  sort(root);
  return root;
}

/** 사이드바에 보여 줄 최상위 섹션: App Router의 하위 섹션 + Architecture + Community */
export function getSidebarSections(versionId: string): NavNode[] {
  const root = buildNavTree(versionId);
  const app = root.children.find((node) => node.key === 'app');
  const rest = root.children.filter((node) => node.key !== 'app');
  return [...(app?.children ?? []), ...rest];
}

/** 사이드바 순서대로 펼친 목록. 이전/다음 링크에 쓴다. */
export function getFlatOrder(versionId: string): NavNode[] {
  const list: NavNode[] = [];
  const visit = (node: NavNode) => {
    list.push(node);
    node.children.forEach(visit);
  };
  visit(buildNavTree(versionId));
  return list;
}
