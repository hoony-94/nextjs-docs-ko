/**
 * 번역할 문장 목록을 뽑는다.
 *
 *   pnpm extract app/getting-started/installation              # 최신 버전, 모든 단위
 *   pnpm extract app/getting-started/installation --missing    # 아직 번역 안 된 단위만
 *   pnpm extract app/getting-started/installation --version 16 # 특정 버전
 *   pnpm extract --list app/getting-started [--version 16]     # 이 경로 아래 문서 key 목록
 *   pnpm extract --list-missing [--version 17]                 # 번역이 덜 된 문서와 미번역 단위 수
 *
 * 출력 형식: `<id>\t<kind>\t<원문>` (한 줄에 하나)
 * 번역 파일: translations/ko/<key>.json → { "<id>": "번역문" } (버전 공용)
 */
import { getPageUnits } from '../lib/bilingual/page-units';
import { loadTranslations } from '../lib/bilingual/translations';
import { findDoc, loadDocsIndex } from '../lib/content/source';
import { getLatestVersion, getVersion } from '../lib/content/versions';

const args = process.argv.slice(2);
const versionFlag = args.indexOf('--version');
const versionId = versionFlag >= 0 ? args[versionFlag + 1] : getLatestVersion().id;
const positional = args.filter((arg, index) => !arg.startsWith('--') && index !== versionFlag + 1);
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const [target = ''] = positional;

if (!getVersion(versionId)) {
  console.error(`알 수 없는 버전: ${versionId}`);
  process.exit(1);
}

if (flags.has('--list')) {
  const keys = loadDocsIndex(versionId)
    .map((doc) => doc.key)
    .filter((key) => key === target || key.startsWith(target ? `${target}/` : ''))
    .sort();
  console.log(keys.join('\n'));
  process.exit(0);
}

if (flags.has('--list-missing')) {
  let total = 0;
  for (const doc of loadDocsIndex(versionId)) {
    const ko = loadTranslations(doc.key);
    const missing = getPageUnits(doc).filter((unit) => !ko[unit.id]).length;
    if (missing) console.log(`${String(missing).padStart(4)}  ${doc.key || '(root)'}`);
    total += missing;
  }
  console.error(`# 버전 ${versionId}: 미번역 ${total}개 단위`);
  process.exit(0);
}

const doc = findDoc(versionId, target);
if (!doc) {
  console.error(`문서를 찾을 수 없습니다: "${target}" (버전 ${versionId}). --list로 key를 확인하세요.`);
  process.exit(1);
}

const existing = loadTranslations(doc.key);
const units = getPageUnits(doc).filter((unit) => !flags.has('--missing') || !existing[unit.id]);
for (const unit of units) console.log(`${unit.id}\t${unit.kind}\t${unit.display}`);
console.error(`# ${doc.key || '(root)'} (버전 ${versionId}): ${units.length}개 단위${flags.has('--missing') ? ' (미번역)' : ''}`);
