import { performanceRoadmap } from './performance';
import type { Roadmap } from './types';

/** 사이트에 공개하는 로드맵 목록. 새 로드맵은 파일을 만들고 여기에 추가한다. */
export const ROADMAPS: Roadmap[] = [performanceRoadmap];

export function getRoadmap(slug: string) {
  return ROADMAPS.find((roadmap) => roadmap.slug === slug);
}
