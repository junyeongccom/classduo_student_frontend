/**
 * @file testSetGroups.ts
 * @description 26개 핵심 테스트를 1/2/3 세트로 분할하는 순수 함수
 * @module features/exam-prep-final/domain
 */

import type { CoreTest, TestSetTab } from '../types'

/** 세트별 시작/끝 번호 (1세트: 1~10, 2세트: 11~18, 3세트: 19~26) */
export const SET_RANGES: Record<1 | 2 | 3, { start: number; end: number }> = {
  1: { start: 1, end: 10 },
  2: { start: 11, end: 18 },
  3: { start: 19, end: 26 },
}

export function getCoreTestsBySet(coreTests: CoreTest[], setNumber: 1 | 2 | 3): CoreTest[] {
  // CoreTest.setNumber 가 useExamPrepData 에서 lectures 수에 따라 동적 분배되어 있음.
  // (예: 17개 → 1=6, 2=6, 3=5 / 26개 → 1=10, 2=8, 3=8)
  return coreTests
    .filter((t) => t.setNumber === setNumber)
    .sort((a, b) => a.number - b.number)
}

/** 탭이 핵심 테스트 세트인지 (Final 제외) */
export function isCoreSetTab(tab: TestSetTab): tab is 1 | 2 | 3 {
  return tab !== 'final'
}
