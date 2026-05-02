/**
 * @file dday.ts
 * @description D-day 배지 톤 매핑 (50/30/14/7/1 구간별 색)
 * @module features/course-dashboard/domain
 * @dependencies none
 */

export interface DdayTone {
  bg: string
  text: string
}

/**
 * @param days  null/undefined = 시험일 미정. 음수 입력은 0으로 클램프.
 */
export function resolveDdayTone(days: number | null | undefined): DdayTone {
  if (days == null) {
    return { bg: '#DEDEF8', text: '#383698' }
  }
  const d = Math.max(0, Math.floor(days))
  if (d >= 31) return { bg: '#DEDEF8', text: '#383698' } // 50~31 (≥50도 가장 연한 톤 유지)
  if (d >= 15) return { bg: '#8F8DF0', text: '#FFFFFF' } // 30~15
  if (d >= 8) return { bg: '#383698', text: '#FFFFFF' } // 14~8
  if (d >= 2) return { bg: '#FFCD36', text: '#383698' } // 7~2
  return { bg: '#EF4444', text: '#FFFFFF' } // 1 (또는 0)
}
