/**
 * @file buildExamSet.ts
 * @description 선택된 회차/범위로 시험 세트 구성 + 무작위 셔플 + 예상시간 (순수 함수)
 * @module features/my-quiz/domain
 * @dependencies hooks/useQuizStorage (QuizStorageItem 타입)
 */
import type { QuizStorageItem } from '../hooks/useQuizStorage'

export interface ExamSetOptions {
  /** 선택 회차 번호. 빈 배열 = 전체 회차. */
  lectureNos: number[]
  /** 오답 포함 */
  includeWrong: boolean
  /** 즐겨찾기 포함 */
  includeFav: boolean
}

export interface LectureOption {
  lectureNo: number
  wrongCount: number
  favCount: number
}

/**
 * items에서 시험모드 회차 옵션 도출.
 * 오답/즐겨찾기 중 1개 이상 있는 회차만, 번호 오름차순.
 * 표시 라벨은 i18n('landing.lectureWeek')으로 호출부에서 생성한다 (도메인은 lectureNo만).
 */
export function deriveLectureOptions(items: QuizStorageItem[]): LectureOption[] {
  const map = new Map<number, { wrong: number; fav: number }>()
  for (const it of items) {
    if (it.lecture_no == null) continue
    if (!it.is_wrong && !it.is_bookmark) continue
    const cur = map.get(it.lecture_no) ?? { wrong: 0, fav: 0 }
    if (it.is_wrong) cur.wrong += 1
    if (it.is_bookmark) cur.fav += 1
    map.set(it.lecture_no, cur)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([lectureNo, c]) => ({
      lectureNo,
      wrongCount: c.wrong,
      favCount: c.fav,
    }))
}

/**
 * 선택 조건에 맞는 문항 추출 (회차 ∩ 범위). 중복 제거(quiz_source:quiz_id). 셔플 전.
 */
export function selectExamItems(
  items: QuizStorageItem[],
  opts: ExamSetOptions,
): QuizStorageItem[] {
  const lectureSet = new Set(opts.lectureNos)
  const seen = new Set<string>()
  const out: QuizStorageItem[] = []
  for (const it of items) {
    if (it.lecture_no == null) continue
    if (lectureSet.size > 0 && !lectureSet.has(it.lecture_no)) continue
    const match =
      (opts.includeWrong && it.is_wrong) || (opts.includeFav && it.is_bookmark)
    if (!match) continue
    const key = `${it.quiz_source}:${it.quiz_id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(it)
  }
  return out
}

/** Fisher-Yates 셔플 (새 배열 반환). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 예상 소요 (문항당 ~30초) → 분, 최소 1. */
export function estimateMinutes(count: number): number {
  return Math.max(1, Math.round(count * 0.5))
}
