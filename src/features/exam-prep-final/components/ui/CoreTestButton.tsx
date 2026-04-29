/**
 * @file CoreTestButton.tsx
 * @description 핵심 테스트 번호 버튼 — 평소 번호, 선택 시 불꽃(보라/회색), 잠긴 상태 자물쇠
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
 * 세트별 활성 버튼 색상 (Figma)
 * - 1세트: 연보라 #DBDAFB + 진보라 텍스트
 * - 2세트: 중보라 #8F8DF0 + 흰 텍스트
 * - 3세트: 진보라 #383698 + 흰 텍스트
 */
const SET_BUTTON_STYLES: Record<
  1 | 2 | 3,
  { bg: string; text: string; selectedShadow: string }
> = {
  1: {
    bg: 'bg-[#DBDAFB]',
    text: 'text-[#1A1A1A]', // 거의 검정 (Figma)
    selectedShadow: 'shadow-[0_8px_0_#6366F1]',
  },
  2: {
    bg: 'bg-[#8F8DF0]',
    text: 'text-white',
    selectedShadow: 'shadow-[0_8px_0_#4F46E5]',
  },
  3: {
    bg: 'bg-[#383698]',
    text: 'text-white',
    selectedShadow: 'shadow-[0_8px_0_#1E1B6E]',
  },
}

export function CoreTestButton({
  test,
  setTone,
  isSelected,
  onClick,
}: CoreTestButtonProps) {
  const isLocked = test.status === 'locked'
  const isMastered = test.status === 'mastered'
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

  // 활성 버튼 — 번호/불꽃 토글
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-36 w-36 items-center justify-center rounded-3xl transition-shadow hover:opacity-90 active:translate-y-1 active:shadow-none',
        cfg.bg,
        isSelected
          ? cfg.selectedShadow
          : 'shadow-[0_8px_0_rgba(0,0,0,0.10)]',
      )}
      aria-label={`Test ${test.number}${isSelected ? ' selected' : ''}${showMasterBadge ? ' mastered' : ''}`}
    >
      {/* 번호 — 비선택 시만 보임 */}
      <span
        className={cn(
          'text-5xl font-black tracking-tight',
          cfg.text,
          isSelected && 'hidden',
        )}
      >
        {numberLabel}
      </span>

      {/* 불꽃 — 항상 DOM에 존재, 선택 시 시각 노출 */}
      <img
        src={
          isMastered
            ? '/마스터 불꽃 보라.png'
            : '/마스터 불꽃 비활성.png'
        }
        alt=""
        width={80}
        height={80}
        draggable={false}
        className={cn(!isSelected && 'hidden')}
      />

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
