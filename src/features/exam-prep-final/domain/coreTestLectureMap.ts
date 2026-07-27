/**
 * @file coreTestLectureMap.ts
 * @description 핵심테스트 번호(1~26) ↔ 회차 번호(lecture_no) 고정 매핑 테이블
 * @module features/exam-prep-final/domain
 *
 * ⚠️ 이 매핑은 더 이상 핵심테스트 슬롯 생성에 쓰이지 않는다.
 *   슬롯은 백엔드가 반환한 core 테스트 목록을 그대로 사용한다 (domain/buildCoreTestSlots.ts).
 *   현재 유일한 소비처는 내 퀴즈 저장소의 "핵심테스트 번호 → lecture_no" 필터
 *   (features/my-quiz/components/containers/QuizStorageContainer.tsx) 이므로 export 는 보존한다.
 *
 * 학기 일정 (모든 과목 공통, 사용자 정의):
 *   - 1주차(OT) 제외
 *   - 14·15주차(중간고사 주간) 제외
 *   - 1~12번 핵심테스트 ↔ 2~13회차 (offset +1)
 *   - 13~26번 핵심테스트 ↔ 16~29회차 (offset +3)
 */

/** 핵심테스트 번호(1-based) → 매핑된 회차 번호(lecture_no) */
export const CORE_TEST_TO_LECTURE_NO: Record<number, number> = {
  // 1~12 → 2~13 (offset +1)
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
  10: 11,
  11: 12,
  12: 13,
  // 14, 15회차 건너뜀 — 13~26 → 16~29 (offset +3)
  13: 16,
  14: 17,
  15: 18,
  16: 19,
  17: 20,
  18: 21,
  19: 22,
  20: 23,
  21: 24,
  22: 25,
  23: 26,
  24: 27,
  25: 28,
  26: 29,
}

/** 핵심테스트 슬롯 총 개수 (= Object.keys(CORE_TEST_TO_LECTURE_NO).length) */
export const CORE_TEST_TOTAL = 26

/** 핵심테스트 번호 → 회차 번호 안전 lookup */
export function getLectureNoForCoreTest(coreNumber: number): number | null {
  return CORE_TEST_TO_LECTURE_NO[coreNumber] ?? null
}
