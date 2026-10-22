/**
 * 학습 로드맵 정의. 로드맵 하나는 순서가 있는 단계(stage)들로 이루어지고,
 * 각 단계는 이 사이트의 문서(key) 또는 외부 문서(url)를 순서대로 담는다.
 * 문서 제목·번역·주소는 빌드할 때 현재 최신 버전 문서에서 채운다.
 */

/** core: 반드시 읽을 문서, deep: 깊이 파고들 때 읽을 문서 */
export type RoadmapLevel = 'core' | 'deep';

export type RoadmapDocItem = {
  type: 'doc';
  /** 문서 key (예: 'app/guides/streaming') */
  key: string;
  level: RoadmapLevel;
  /** 이 로드맵에서 이 문서를 읽는 이유·집중할 점 */
  focus: string;
};

export type RoadmapExternalItem = {
  type: 'external';
  title: string;
  titleKo: string;
  url: string;
  /** 출처 표시 (예: web.dev, React 문서, Next.js 블로그) */
  source: string;
  level: RoadmapLevel;
  focus: string;
};

export type RoadmapItem = RoadmapDocItem | RoadmapExternalItem;

export type RoadmapStage = {
  id: string;
  title: string;
  titleKo: string;
  /** 이 단계의 학습 목표 */
  goal: string;
  /** 이 단계를 마치면 할 수 있어야 하는 것 */
  outcomes: string[];
  items: RoadmapItem[];
};

/** Next.js가 성능 문제를 어떤 기능으로 해결해 왔는지 보여 주는 연표 항목 */
export type RoadmapMilestone = {
  version: string;
  problem: string;
  solution: string;
  /** 관련 API·기능 이름 */
  feature: string;
  docKey?: string;
};

export type Roadmap = {
  slug: string;
  title: string;
  titleKo: string;
  summary: string;
  audience: string;
  howTo: string[];
  stages: RoadmapStage[];
  milestones?: { title: string; note: string; items: RoadmapMilestone[] };
};
