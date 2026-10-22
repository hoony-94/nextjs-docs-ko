import { NextResponse, type NextRequest } from 'next/server';
import docKeys from '@/lib/content/doc-keys.json';
import { parseDocsPath } from '@/lib/content/paths';
import { ROADMAPS } from '@/lib/roadmaps';

const VERSIONS = docKeys.versions;
const KNOWN = new Map(VERSIONS.map((version) => [version.id, new Set<string>(version.keys)]));
const ROADMAP_SLUGS = new Set(ROADMAPS.map((roadmap) => roadmap.slug));

const NOT_FOUND_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>문서를 찾을 수 없습니다</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#18181b}@media(prefers-color-scheme:dark){body{background:#0b0b0d;color:#ececef}}a{color:#2563eb}</style></head>
<body><main style="text-align:center"><h1>404</h1><p>요청한 페이지를 찾을 수 없습니다.</p><p><a href="/docs">문서 목록으로</a></p></main></body></html>`;

function notFound() {
  return new Response(NOT_FOUND_HTML, { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

/**
 * Cache Components에서는 dynamicParams를 쓸 수 없어서, 없는 경로도 셸이 먼저 200으로 나간다.
 * 알려진 문서·로드맵이 아니면 여기서 바로 404를 돌려준다.
 */
export function proxy(request: NextRequest) {
  const pathname = decodeURIComponent(request.nextUrl.pathname);

  if (pathname === '/roadmaps' || pathname.startsWith('/roadmaps/')) {
    const slug = pathname.replace(/^\/roadmaps\/?/, '').replace(/\/$/, '');
    return !slug || ROADMAP_SLUGS.has(slug) ? NextResponse.next() : notFound();
  }

  const parsed = parseDocsPath(pathname, VERSIONS);
  if (parsed && KNOWN.get(parsed.versionId)?.has(parsed.key)) return NextResponse.next();
  return notFound();
}

export const config = {
  matcher: ['/docs', '/docs/:path*', '/roadmaps/:path*'],
};
