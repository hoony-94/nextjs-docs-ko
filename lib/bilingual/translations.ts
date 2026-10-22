import fs from 'node:fs';
import path from 'node:path';
import type { TranslationMap } from './units';

/**
 * 번역은 버전과 무관하게 문서 key별 파일 하나에 문장 해시로 저장한다.
 * 같은 문장은 어느 버전에서든 같은 번역을 쓰므로, 새 버전에서는 바뀐 문장만 번역하면 된다.
 */
export const TRANSLATIONS_ROOT = path.join(process.cwd(), 'translations', 'ko');

export function translationFile(key: string) {
  return path.join(TRANSLATIONS_ROOT, `${key || 'index'}.json`);
}

export function hasTranslation(key: string) {
  return fs.existsSync(translationFile(key));
}

function readMap(file: string): TranslationMap {
  const json = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(json).filter((entry): entry is [string, string] => !entry[0].startsWith('_') && typeof entry[1] === 'string'),
  );
}

let globalMap: TranslationMap | null = null;

/** 모든 번역 파일을 합친 문장 해시 → 번역 (먼저 읽은 파일이 우선) */
function loadGlobalTranslations(): TranslationMap {
  if (globalMap) return globalMap;
  const merged: TranslationMap = {};
  const walk = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.json')) {
        for (const [id, ko] of Object.entries(readMap(full))) merged[id] ??= ko;
      }
    }
  };
  walk(TRANSLATIONS_ROOT);
  globalMap = merged;
  return merged;
}

/** 이 문서 key의 번역 파일만 (stale 판단·정리에 쓴다) */
export function loadOwnTranslations(key: string): TranslationMap {
  const file = translationFile(key);
  return fs.existsSync(file) ? readMap(file) : {};
}

/**
 * 렌더링에 쓰는 번역. 이 문서의 번역 파일을 우선하고, 없는 문장은 다른 문서의 같은 문장 번역을 쓴다.
 * (버전이 바뀌며 문서 위치가 옮겨져도 번역이 이어진다)
 */
export function loadTranslations(key: string): TranslationMap {
  return { ...loadGlobalTranslations(), ...loadOwnTranslations(key) };
}
