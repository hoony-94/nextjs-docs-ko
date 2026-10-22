# Next.js 문서 한국어 (비공식)

Next.js 공식 문서(App Router)의 영어 원문 문장마다 한국어 번역을 붙여 함께 읽을 수 있게 만든 **비공식 학습용** 사이트입니다.

- 원문은 `vercel/next.js`의 **버전별 릴리스 태그**에 있는 문서를 그대로 읽습니다. 여러 버전을 동시에 제공하고, 상단에서 버전을 고를 수 있습니다.
- 번역은 문장 단위로 `translations/ko/**.json`에 저장하며 **모든 버전이 공유**합니다. 같은 문장은 어느 버전에서든 같은 번역을 쓰므로, 새 버전에서는 바뀐 문장만 번역하면 됩니다.
- 상단에서 **원문+번역 / 번역 / 원문** 보기를 바꿀 수 있습니다.
- 이미지와 영상은 nextjs.org에만 있어서 설명과 원문 링크로 대신합니다.

## 실행

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # 모든 버전의 문서를 정적으로 생성
```

`dev`/`build` 전에 자동으로 실행되는 작업:

1. `docs:sync` — 각 버전의 원문을 준비합니다 (없는 버전만 GitHub에서 받음)
2. `generate-doc-keys` — 버전별 문서 목록(`lib/content/doc-keys.json`)을 만듭니다
3. `docs:check` (build만) — 비교 대상 원문과 달라진 페이지를 확인합니다

## 문서 버전

버전 목록은 `docs-versions.json`에서 관리합니다. **첫 번째 항목이 최신 버전**입니다.

```json
{
  "versions": [
    { "id": "17", "tag": "v17.0.0", "label": "v17" },
    { "id": "16", "tag": "v16.4.2", "label": "v16" }
  ]
}
```

| 버전 | URL | 비교 대상 (`docs:check`) |
| --- | --- | --- |
| 최신 (첫 항목) | `/docs/app/...` | nextjs.org가 보여 주는 `canary` 브랜치 |
| 이전 버전 | `/docs/<id>/app/...` | 같은 메이저의 npm 최신 릴리스 태그 |

원문은 다음 순서로 찾습니다.

1. `.cache/docs/<tag>/docs` — `pnpm docs:sync`가 GitHub 태그에서 `docs` 폴더만 받아 둔 것
2. `node_modules/next/dist/docs` — 태그가 설치된 `next` 버전과 같을 때 (네트워크 없이 동작)

### 새 메이저(예: Next.js 17)가 나왔을 때

```bash
# 1. docs-versions.json 맨 앞에 { "id": "17", "tag": "v17.0.0", "label": "v17" } 추가
pnpm docs:sync                                   # 2. 17 원문 받기
pnpm extract --list-missing --version 17         # 3. 번역이 필요한 문서와 문장 수
pnpm extract <key> --missing --version 17        # 4. 문서별 미번역 문장 → translations/ko/<key>.json에 추가
pnpm translation:status                          # 5. 버전별 진행률 확인
pnpm build
```

16은 `/docs/16/...`으로 그대로 남고, 17이 `/docs/...`에 새로 올라옵니다. `pnpm docs:check`가 새 메이저 출시도 알려 줍니다.

### 같은 메이저의 새 릴리스(예: 16.4.2 → 16.5.0)

`docs:check`가 "새 릴리스 있음"을 알려 주면 `docs-versions.json`의 `tag`를 올리고 `pnpm docs:sync` → `--missing`으로 바뀐 문장만 번역합니다.

## 구조

| 경로 | 역할 |
| --- | --- |
| `docs-versions.json` | 제공할 문서 버전 목록 |
| `lib/content/versions.ts` | 버전 목록과 버전별 원문 위치 |
| `lib/content/paths.ts` | URL ↔ (버전, 문서 key) 변환 (클라이언트에서도 사용) |
| `lib/content/source.ts` | 버전별 원문 파일 목록, frontmatter |
| `lib/content/nav.ts` | 버전별 사이드바 트리와 이전/다음 순서 |
| `lib/content/upstream.ts` | `docs:check` 결과 읽기 |
| `lib/bilingual/units.ts` | 번역 단위(제목·문장·표 셀) 분리와 id 계산 |
| `lib/bilingual/translations.ts` | 번역 조회 (문서 파일 우선, 없으면 다른 문서의 같은 문장) |
| `lib/mdx/remark-docs.ts` | `AppOnly`/`PagesOnly` 처리, 코드 블록 탭, 같은 버전 링크로 변환, 번역 삽입 |
| `app/docs/[[...slug]]/page.tsx` | 문서 페이지 (`'use cache'`로 빌드 시 미리 렌더링) |
| `components/site/version-switcher.tsx` | 헤더의 버전 선택 |
| `proxy.ts` | 버전별로 없는 문서 경로에 404 응답 |
| `scripts/` | `docs-sync`, `docs-check`, `extract`, `status`, `generate-doc-keys` |
| `translations/ko/` | 번역 파일 (버전 공용) |

## 번역하기

```bash
pnpm extract --list app/guides [--version 16]          # 문서 key 목록
pnpm extract app/guides/authentication                 # 번역 단위 전체 (id, 종류, 원문)
pnpm extract app/guides/authentication --missing       # 아직 번역 안 된 단위만
pnpm extract --list-missing [--version 16]             # 번역이 덜 된 문서 목록
pnpm translation:status [--all]                        # 버전별 진행률
pnpm translation:status --prune                        # 어느 버전에서도 쓰지 않는 번역 삭제
```

`translations/ko/<key>.json` 형식:

```json
{
  "_meta": { "source": "next@16.4.2" },
  "a0a925bae9cc": "번역문"
}
```

- id는 원문 문장을 정규화한 뒤 계산한 해시입니다. 원문이 한 글자라도 바뀌면 id가 달라져서 그 문장은 원문만 표시됩니다.
- 번역문 안에서는 `` `코드` ``와 `**강조**`만 서식으로 바뀝니다.

## 비교 결과 확인

```bash
pnpm docs:check
```

버전별로 바뀐 페이지·새 페이지·삭제된 페이지와 번역 영향(맞지 않게 될 번역 수, 번역이 필요한 문장 수)을 출력하고 `.cache/status/upstream-status.json`에 저장합니다. 사이트는 이 결과로 바뀐 페이지 상단에 경고와 변경 이력 링크를, 사이드바에 주황색 점을, 홈에 요약을 보여 줍니다. 파일 내용은 받지 않고 git 트리(해시 목록)만 비교하므로 몇 초면 끝나며 GitHub API 호출 제한과도 무관합니다.

## 라이선스

- 원문 문서: © Vercel, Inc. — MIT License ([LICENSE-nextjs-docs.md](./LICENSE-nextjs-docs.md)). 한국어 번역은 이 원문을 바탕으로 한 2차 저작물입니다.
- 이 사이트는 Vercel 및 Next.js 팀과 관련이 없는 비공식 프로젝트입니다. 정확한 내용은 [nextjs.org/docs](https://nextjs.org/docs) 원문을 확인하세요.
