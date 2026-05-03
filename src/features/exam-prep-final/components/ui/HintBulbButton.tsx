/**
 * @file HintBulbButton.tsx
 * @description 풀이 화면 힌트 버튼 — 노란 전구 SVG + 시계방향 conic-gradient 채움(20s 카운트다운).
 * @module features/exam-prep-final/components/ui
 * @dependencies cn
 */

'use client'

import { cn } from '@/shared/lib/utils'

interface HintBulbButtonProps {
  /** 진행률 0~100. 100 도달 시 hintAvailable=true 와 함께 클릭 가능. */
  progressPct: number
  /** 클릭 시 힌트 사용 (오답 1개 disable) */
  onClick: () => void
  /** 사용 가능 (progressPct=100 + 미사용) */
  available: boolean
  /** 채점/락/사용 완료로 카운트다운 진행도 표시 안 할 때 true */
  inactive?: boolean
}

const SIZE = 42

export function HintBulbButton({
  progressPct,
  onClick,
  available,
  inactive,
}: HintBulbButtonProps) {
  // conic-gradient 가 노출되는 영역 — 전구 안쪽 원의 시계방향 채움.
  // inactive 면 모두 노란색(완전 채움)으로 표시 (사용 후/락 상태 시각).
  const fillPct = inactive ? 100 : progressPct
  return (
    <button
      type="button"
      disabled={!available}
      onClick={onClick}
      aria-label={available ? '힌트 사용' : '힌트 충전 중'}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full transition-transform',
        available && 'cursor-pointer hover:scale-105 active:scale-95',
        !available && 'cursor-not-allowed',
      )}
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        viewBox="0 0 64 80"
        width={SIZE}
        height={SIZE * (80 / 64)}
        aria-hidden
        className="block"
      >
        <defs>
          {/* 전구 머리 영역(원) clip — conic-gradient 채움이 전구 안에서만 보이게 */}
          <clipPath id="hint-bulb-head">
            <circle cx="32" cy="28" r="22" />
          </clipPath>
        </defs>

        {/* 전구 머리 외곽 — 흰 배경 */}
        <circle
          cx="32"
          cy="28"
          r="24"
          fill="#FFFFFF"
          stroke="#E5E7EB"
          strokeWidth="2"
        />

        {/* 시계방향 노란 채움 — foreignObject + conic-gradient.
            전구 머리 clip 안에서만 노출 → 원형 안 채움 효과. */}
        <foreignObject
          x="8"
          y="4"
          width="48"
          height="48"
          clipPath="url(#hint-bulb-head)"
        >
          <div
            // @ts-expect-error xmlns is valid on foreignObject children
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `conic-gradient(from 0deg, #FACC15 ${fillPct}%, transparent ${fillPct}%)`,
              transition: inactive ? 'none' : 'background-image 60ms linear',
            }}
          />
        </foreignObject>

        {/* 흰색 highlight (좌상단 작은 호) */}
        <path
          d="M 18 24 Q 17 16 26 13"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity={fillPct >= 25 ? 1 : 0}
          style={{ transition: 'opacity 200ms' }}
        />

        {/* 전구 base (하단 회색 plateau + plug) */}
        <rect x="22" y="50" width="20" height="6" rx="2" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="1.5" />
        <rect x="24" y="56" width="16" height="10" rx="2" fill="#E5E7EB" />
        <rect x="26" y="66" width="12" height="4" rx="1" fill="#9CA3AF" />
      </svg>
    </button>
  )
}
