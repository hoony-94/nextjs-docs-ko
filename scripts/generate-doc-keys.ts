/**
 * proxy.ts가 없는 문서 경로에 404를 돌려줄 수 있도록 버전별 문서 key 목록을 만든다.
 * predev / prebuild에서 자동으로 실행된다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadDocsIndex } from '../lib/content/source';
import { getVersions } from '../lib/content/versions';

const versions = getVersions().map((version) => ({
  id: version.id,
  latest: version.latest,
  keys: loadDocsIndex(version.id)
    .map((doc) => doc.key)
    .sort(),
}));
const out = path.join(process.cwd(), 'lib', 'content', 'doc-keys.json');
fs.writeFileSync(out, `${JSON.stringify({ versions }, null, 2)}\n`);
console.log(`doc-keys.json: ${versions.map((version) => `${version.id}(${version.keys.length})`).join(', ')}`);
