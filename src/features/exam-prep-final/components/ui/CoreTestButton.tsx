/**
 * @file CoreTestButton.tsx
 * @description 핵심 테스트 번호 버튼 — 세트별 톤, 선택 시 pressed 고정, 잠긴 상태 자물쇠
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { cn } from '@/shared/lib/utils'
import type { CoreTest } from '../../types'

interface CoreTestButtonProps {
  test: CoreTest
  /** 부모 세트의 톤 — 활성 버튼 색에 영향 */
  setTone: 1 | 2 | 3
  isSelected: boolean
  onClick: () => void
}

/**
 * 세트별 버튼 톤 (Figma)
 * - bg: 버튼 상단(평면) 색
 * - text: 숫자 텍스트 색
 * - shadow: 비선택 시 하단 명암 색 (선택 시엔 사라지고 pressed 고정)
 */
const SET_BUTTON_STYLES: Record<
  1 | 2 | 3,
  { bg: string; text: string; shadow: string }
> = {
  1: {
    bg: 'bg-[#DEDEF8]',
    text: 'text-[#1A1A1A]',
    shadow: 'shadow-[0_8px_0_#8F8DF0]',
  },
  2: {
    bg: 'bg-[#8F8DF0]',
    text: 'text-white',
    shadow: 'shadow-[0_8px_0_#383698]',
  },
  3: {
    bg: 'bg-[#383698]',
    text: 'text-white',
    shadow: 'shadow-[0_8px_0_#DEDEF8]',
  },
}

export function CoreTestButton({
  test,
  setTone,
  isSelected,
  onClick,
}: CoreTestButtonProps) {
  const isLocked = test.status === 'locked'
  const cfg = SET_BUTTON_STYLES[setTone]
  const numberLabel = String(test.number).padStart(2, '0')
  const showMasterBadge = test.isTestMastered

  // 잠긴 상태 — 자물쇠 (선택 불가)
  if (isLocked) {
    return (
      <button
        type="button"
        disabled
        className="relative flex h-36 w-36 cursor-not-allowed items-center justify-center rounded-3xl bg-gray-100 dark:bg-gray-800"
        aria-label={`Test ${test.number} locked`}
      >
        <img
          src="/자물쇠.png"
          alt=""
          width={56}
          height={56}
          className="opacity-60"
          draggable={false}
        />
        {showMasterBadge && <MasterBadge />}
      </button>
    )
  }

  // 활성 버튼 — 선택 시 pressed 고정(translate + shadow 제거), 비선택 시 set색 하단 명암
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-36 w-36 items-center justify-center rounded-3xl transition-all hover:opacity-90',
        cfg.bg,
        isSelected
          ? 'translate-y-2 shadow-none'
          : `${cfg.shadow} active:translate-y-1 active:shadow-none`,
      )}
      aria-label={`Test ${test.number}${isSelected ? ' selected' : ''}${showMasterBadge ? ' mastered' : ''}`}
    >
      <span
        className={cn(
          'text-6xl font-black leading-none tracking-tight',
          cfg.text,
        )}
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {numberLabel}
      </span>

      {/* test 단위 master 배지 (우상단) — 모든 문항을 master 한 학생에게 표시 */}
      {showMasterBadge && <MasterBadge />}
    </button>
  )
}

/** test 자체의 master 도달 시 우상단 배지 — 보라 원 + 별/체크 */
function MasterBadge() {
  return (
    <span
      className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#A78BFA] to-[#6D28D9] text-base shadow-[0_4px_12px_rgba(124,58,237,0.45)] ring-2 ring-white"
      aria-label="Master"
      title="Master 도달"
    >
      <span className="leading-none">★</span>
    </span>
  )
}
