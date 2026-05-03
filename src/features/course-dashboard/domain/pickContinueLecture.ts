/**
 * @file pickContinueLecture.ts
 * @description "이어서 학습하기" 후보 회차 선정 — has_content가 있는 가장 최근 회차
 * @module features/course-dashboard/domain
 */

import type { Lecture } from '@/features/lecture-study/types'

/**
 * 우선순위:
 * 1) has_content === true 인 회차 중 lecture_date 최신
 * 2) 없으면 가장 첫 회차 반환 (시작 유도)
 * 3) lectures 비어있으면 null
 */
export function pickContinueLecture(lectures: Lecture[]): Lecture | null {
  if (lectures.length === 0) return null

  const withContent = lectures.filter((l) => l.has_content)
  const pool = withContent.length > 0 ? withContent : lectures

  const sorted = [...pool].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0
    const db = b.date ? new Date(b.date).getTime() : 0
    // 가장 최근 (today 이전 중 최신) 우선 — 미래 lecture는 뒤로
    const today = Date.now()
    const aPast = da <= today
    const bPast = db <= today
    if (aPast && !bPast) return -1
    if (!aPast && bPast) return 1
    return db - da
  })

  return sorted[0] ?? null
}
