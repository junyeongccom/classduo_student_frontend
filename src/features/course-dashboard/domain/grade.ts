/**
 * @file grade.ts
 * @description 누적 XP → 등급/색상/진행률 매핑 (mock 임계값 — 추후 확정)
 * @module features/course-dashboard/domain
 * @dependencies none
 */

export type GradeKey =
  | 'F'
  | 'D'
  | 'D+'
  | 'C'
  | 'C+'
  | 'B'
  | 'B+'
  | 'A'
  | 'A+'

export interface GradeTier {
  key: GradeKey
  /** 누적 XP 시작 (포함) */
  min: number
  /** 누적 XP 끝 (포함). Infinity 가능 */
  max: number
  /** 등급 색상 (텍스트/바 강조용) */
  color: string
  /** public/grade/ 안의 PNG 파일 경로 */
  badgeSrc: string
}

export const GRADE_TIERS: readonly GradeTier[] = [
  { key: 'F', min: 0, max: 999, color: '#EF4444', badgeSrc: '/grade/grade-badge-F.png' },
  { key: 'D', min: 1000, max: 1999, color: '#A16207', badgeSrc: '/grade/grade-badge-D.png' },
  { key: 'D+', min: 2000, max: 2999, color: '#CA8A04', badgeSrc: '/grade/grade-badge-D-plus.png' },
  { key: 'C', min: 3000, max: 3999, color: '#65A30D', badgeSrc: '/grade/grade-badge-C.png' },
  { key: 'C+', min: 4000, max: 4999, color: '#16A34A', badgeSrc: '/grade/grade-badge-C-plus.png' },
  { key: 'B', min: 5000, max: 6999, color: '#0891B2', badgeSrc: '/grade/grade-badge-B.png' },
  { key: 'B+', min: 7000, max: 8999, color: '#2563EB', badgeSrc: '/grade/grade-badge-B-plus.png' },
  { key: 'A', min: 9000, max: 11999, color: '#7C3AED', badgeSrc: '/grade/grade-badge-A.png' },
  { key: 'A+', min: 12000, max: Number.POSITIVE_INFINITY, color: '#383698', badgeSrc: '/grade/grade-badge-A-plus.png' },
] as const

export interface GradeProgress {
  tier: GradeTier
  /** 다음 등급으로 가기 위해 더 필요한 XP. 최고 등급이면 0 */
  xpToNext: number
  /** 현재 등급 구간 길이 (max - min + 1). 최고 등급은 0 */
  tierSpan: number
  /** 현재 등급 안에서 진행 비율 0~1 */
  progressRatio: number
}

export function resolveGradeProgress(xp: number): GradeProgress {
  const safe = Math.max(0, Math.floor(xp))
  const tier = GRADE_TIERS.find((t) => safe >= t.min && safe <= t.max) ?? GRADE_TIERS[GRADE_TIERS.length - 1]
  const isMax = !Number.isFinite(tier.max)
  const tierSpan = isMax ? 0 : tier.max - tier.min + 1
  const xpToNext = isMax ? 0 : tier.max + 1 - safe
  const progressRatio = isMax
    ? 1
    : tierSpan > 0
      ? Math.min(1, Math.max(0, (safe - tier.min) / tierSpan))
      : 0
  return { tier, xpToNext, tierSpan, progressRatio }
}
