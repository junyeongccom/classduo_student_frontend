/**
 * @file groupByLecture.ts
 * @description 저장소 아이템을 회차(lecture_no)별로 그룹화 + 회차별 취약도 집계 (순수 함수)
 * @module features/my-quiz/domain
 * @dependencies hooks/useQuizStorage (QuizStorageItem 타입)
 */
import type { QuizStorageItem } from '../hooks/useQuizStorage'

export interface LectureCardGroup {
  /** 회차 번호 (lecture_no) */
  lectureNo: number
  /** 그룹 내 카드 (호출부에서 이미 정렬된 순서 유지) */
  items: QuizStorageItem[]
}

export interface LectureWeakness {
  /** 오답 문항 수 (is_wrong) */
  wrongItemCount: number
  /** 누적 오답 횟수 (wrong_count 합) */
  cumulativeWrong: number
}

export interface WeaknessIndex {
  byLecture: Map<number, LectureWeakness>
  /** 히트맵 스케일용 — 회차별 cumulativeWrong 최대값 (최소 1) */
  maxCumulativeWrong: number
}

/**
 * lecture_no 없는 항목(회차 미상)은 제외하고, 회차 번호 오름차순 그룹으로.
 * 그룹 내 순서는 입력 순서 유지 (호출부에서 최신순/오래된순 정렬 후 전달).
 * 표시 라벨은 i18n('landing.lectureWeek')으로 호출부에서 생성한다 (도메인은 lectureNo만).
 */
export function groupByLectureNo(items: QuizStorageItem[]): LectureCardGroup[] {
  const map = new Map<number, QuizStorageItem[]>()
  for (const it of items) {
    if (it.lecture_no == null) continue
    const arr = map.get(it.lecture_no)
    if (arr) arr.push(it)
    else map.set(it.lecture_no, [it])
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([lectureNo, groupItems]) => ({
      lectureNo,
      items: groupItems,
    }))
}

/**
 * 전체 아이템 기준 회차별 취약도 집계.
 * 세그먼트(전체/즐겨찾기/오답)와 무관하게 안정적인 회차 취약 신호를 제공한다.
 */
export function computeWeaknessIndex(allItems: QuizStorageItem[]): WeaknessIndex {
  const byLecture = new Map<number, LectureWeakness>()
  for (const it of allItems) {
    if (it.lecture_no == null || !it.is_wrong) continue
    const cur = byLecture.get(it.lecture_no) ?? { wrongItemCount: 0, cumulativeWrong: 0 }
    cur.wrongItemCount += 1
    cur.cumulativeWrong += Math.max(it.wrong_count, 1)
    byLecture.set(it.lecture_no, cur)
  }
  let maxCumulativeWrong = 1
  for (const w of byLecture.values()) {
    if (w.cumulativeWrong > maxCumulativeWrong) maxCumulativeWrong = w.cumulativeWrong
  }
  return { byLecture, maxCumulativeWrong }
}

/** cumulativeWrong → 히트맵 레벨 0..4. (0 = 오답 없음) */
export function weaknessLevel(
  cumulativeWrong: number,
  max: number,
): 0 | 1 | 2 | 3 | 4 {
  if (cumulativeWrong <= 0) return 0
  const ratio = cumulativeWrong / Math.max(max, 1)
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}
