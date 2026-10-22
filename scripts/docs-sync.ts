/**
 * docs-versions.json의 각 버전 원문을 vercel/next.js 릴리스 태그에서 받아 .cache/docs/<tag>/docs에 둔다.
 *
 *   pnpm docs:sync           # 없는 버전만 받는다
 *   pnpm docs:sync --soft    # 실패해도 종료 코드 0 (predev / prebuild에서 사용)
 *
 * - 태그가 설치된 next 버전과 같고 패키지 안에 문서가 있으면 받지 않는다 (패키지 문서를 그대로 쓴다).
 * - docs 폴더만 sparse checkout으로 받으므로 저장소 전체를 받지 않는다.
 */
import { execFileSync, type ExecFileSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { installedNextVersion, readVersionConfig, UPSTREAM_REPO, versionCacheDir } from '../lib/content/versions';

const soft = process.argv.includes('--soft');
let failed = false;

for (const entry of readVersionConfig()) {
  const dir = versionCacheDir(entry.tag);
  if (fs.existsSync(path.join(dir, 'docs'))) {
    console.log(`${entry.tag}: 받아 둔 원문 사용`);
    continue;
  }
  const packaged = path.join(process.cwd(), 'node_modules', 'next', 'dist', 'docs');
  if (entry.tag === `v${installedNextVersion()}` && fs.existsSync(packaged)) {
    console.log(`${entry.tag}: 설치된 next 패키지의 문서 사용`);
    continue;
  }
  // 임시 폴더에 받은 뒤 docs 폴더만 옮긴다. 저장소 루트 파일(깨진 심볼릭 링크 등)과 .git은 남기지 않는다.
  const tmp = path.join(process.cwd(), '.cache', 'git', `sync-${entry.tag}`);
  try {
    console.log(`${entry.tag}: GitHub에서 docs 폴더를 받는 중...`);
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    const quiet: ExecFileSyncOptions = { stdio: ['ignore', 'ignore', 'inherit'] };
    execFileSync(
      'git',
      ['-c', 'advice.detachedHead=false', 'clone', '-q', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', entry.tag, UPSTREAM_REPO, tmp],
      quiet,
    );
    execFileSync('git', ['-C', tmp, 'sparse-checkout', 'set', 'docs'], quiet);
    fs.mkdirSync(dir, { recursive: true });
    fs.cpSync(path.join(tmp, 'docs'), path.join(dir, 'docs'), { recursive: true });
    console.log(`${entry.tag}: 완료`);
  } catch (error) {
    failed = true;
    fs.rmSync(dir, { recursive: true, force: true });
    console.warn(`[docs:sync] ${entry.tag}를 받지 못했습니다: ${error instanceof Error ? error.message : error}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (failed && !soft) process.exit(1);
