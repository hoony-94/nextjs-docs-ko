/**
 * 버전별 번역 진행 상황과, 어느 버전에서도 쓰이지 않는 번역(stale)을 보여 준다.
 *
 *   pnpm translation:status             # 버전별 요약 + 덜 번역된 문서
 *   pnpm translation:status --all       # 모든 문서
 *   pnpm translation:status --prune     # stale 번역을 파일에서 삭제
 *
 * 번역 파일은 버전 공용이므로, stale은 "이 key의 문서가 모든 버전에서 쓰지 않는 문장"이다.
 */
import fs from 'node:fs';
import { getPageUnits } from '../lib/bilingual/page-units';
import { hasTranslation, loadOwnTranslations, loadTranslations, translationFile } from '../lib/bilingual/translations';
import { loadDocsIndex } from '../lib/content/source';
import { getVersions } from '../lib/content/versions';

const prune = process.argv.includes('--prune');
const showAll = process.argv.includes('--all');
const usedIds = new Map<string, Set<string>>();

for (const version of getVersions()) {
  const docs = loadDocsIndex(version.id);
  let units = 0;
  let done = 0;
  const rows: string[] = [];
  for (const doc of docs) {
    const pageUnits = getPageUnits(doc);
    const ko = loadTranslations(doc.key);
    const translated = pageUnits.filter((unit) => ko[unit.id]).length;
    units += pageUnits.length;
    done += translated;
    const ids = usedIds.get(doc.key) ?? new Set<string>();
    pageUnits.forEach((unit) => ids.add(unit.id));
    usedIds.set(doc.key, ids);
    if (showAll || translated < pageUnits.length) {
      rows.push(`${String(Math.round((translated / pageUnits.length) * 100)).padStart(3)}%  ${translated}/${pageUnits.length}  ${doc.key || '(root)'}`);
    }
  }
  console.log(`\n[${version.label}${version.latest ? ' · 최신' : ''}] ${version.tag} · 문서 ${docs.length}개 · ${done}/${units} 단위 (${Math.round((done / units) * 100)}%)`);
  if (rows.length) console.log(rows.sort().join('\n'));
}

let staleTotal = 0;
for (const [key, ids] of usedIds) {
  if (!hasTranslation(key)) continue;
  const stale = Object.keys(loadOwnTranslations(key)).filter((id) => !ids.has(id));
  if (!stale.length) continue;
  staleTotal += stale.length;
  console.log(`stale ${stale.length}${prune ? ' 삭제' : ''}  ${key || '(root)'}`);
  if (prune) {
    const file = translationFile(key);
    const json = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
    for (const id of stale) delete json[id];
    fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
  }
}
console.log(`\nstale 번역 ${staleTotal}개${prune ? ' 삭제' : ''}`);
