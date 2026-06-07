/**
 * @file MobileMasteryStrip.tsx
 * @description 풀이 페이지 모바일 상단 숙련도 범례 — Learning/Skilled/Master 점+카운트 (시안 942:10419)
 * @module features/exam-prep-final/components/ui
 */

'use client'

interface MobileMasteryStripProps {
  learning: number
  skilled: number
  master: number
}

const LEGEND = [
  ['Learning', '#D9D9D9'],
  ['Skilled', '#FFCD36'],
  ['Master', '#A78BFA'],
] as const

/**
 * Figma 942:10419 "숙련도 패널" — 가로 한 줄, 각 항목 = 12px 점 + 라벨 + 카운트.
 * mid(서술형 자가평가)처럼 mastery 무관 테스트에서는 컨테이너가 렌더하지 않음.
 */
export function MobileMasteryStrip({ learning, skilled, master }: MobileMasteryStripProps) {
  const counts = { Learning: learning, Skilled: skilled, Master: master } as const
  return (
    <div
      className="flex items-center gap-3"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
    >
      {LEGEND.map(([label, color]) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className="inline-block size-3 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">
            {label}
          </span>
          <span className="text-[12px] font-medium tabular-nums text-gray-900 dark:text-gray-100">
            {counts[label]}
          </span>
        </div>
      ))}
    </div>
  )
}
