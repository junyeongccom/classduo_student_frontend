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

// 백엔드 RANK_BRACKETS (rank_schema.py) 의 total_xp 구간과 정합 (2026-06-07 재스케일).
// A/A+ 의 master_xp 게이트는 백엔드 RankService 가 권위 판정 — 본 테이블은 total_xp→뱃지 시각 매핑.
export const GRADE_TIERS: readonly GradeTier[] = [
  { key: 'F', min: 0, max: 399, color: '#EF4444', badgeSrc: '/grade/F.png' },
  { key: 'D', min: 400, max: 899, color: '#A16207', badgeSrc: '/grade/D.png' },
  { key: 'D+', min: 900, max: 1599, color: '#CA8A04', badgeSrc: '/grade/D%2B.png' },
  { key: 'C', min: 1600, max: 2299, color: '#65A30D', badgeSrc: '/grade/C.png' },
  { key: 'C+', min: 2300, max: 2999, color: '#16A34A', badgeSrc: '/grade/C%2B.png' },
  { key: 'B', min: 3000, max: 3699, color: '#0891B2', badgeSrc: '/grade/B.png' },
  { key: 'B+', min: 3700, max: 4399, color: '#2563EB', badgeSrc: '/grade/B%2B.png' },
  { key: 'A', min: 4400, max: 4899, color: '#7C3AED', badgeSrc: '/grade/A.png' },
  { key: 'A+', min: 4900, max: Number.POSITIVE_INFINITY, color: '#383698', badgeSrc: '/grade/A%2B.png' },
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

/**
 * 백엔드 등급 코드(F~A+) → tier (badgeSrc / color) 룩업.
 * 진행률은 백엔드 RANK_THRESHOLDS 로 별도 계산 — 본 헬퍼는 시각 자산만 반환.
 */
export function resolveGradeTier(rankCode: string): GradeTier {
  return GRADE_TIERS.find((t) => t.key === rankCode) ?? GRADE_TIERS[0]
}
