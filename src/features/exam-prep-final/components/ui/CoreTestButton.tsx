/**
 * @file CoreTestButton.tsx
 * @description 핵심 테스트 번호 버튼 — 평소 번호, 선택 시 불꽃(보라/회색), 잠긴 상태 자물쇠
 * @module features/exam-prep-final/components/ui
 */

'use client'

import Image from 'next/image'
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

  // 잠긴 상태 — 자물쇠 (선택 불가)
  if (isLocked) {
    return (
      <button
        type="button"
        disabled
        className="flex h-36 w-36 cursor-not-allowed items-center justify-center rounded-3xl bg-gray-100 dark:bg-gray-800"
        aria-label={`Test ${test.number} locked`}
      >
        <Image
          src="/자물쇠.png"
          alt=""
          width={56}
          height={56}
          className="opacity-60"
        />
      </button>
    )
  }

  // 활성 + 선택됨 → 불꽃 (마스터=보라, 미마스터=회색)
  if (isSelected) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-36 w-36 items-center justify-center rounded-3xl transition-all hover:opacity-90 active:translate-y-1 active:shadow-none',
          cfg.bg,
          cfg.selectedShadow,
        )}
        aria-label={`Test ${test.number} selected`}
      >
        <Image
          src={
            isMastered
              ? '/마스터 불꽃 보라.png'
              : '/마스터 불꽃 비활성.png'
          }
          alt=""
          width={80}
          height={80}
        />
      </button>
    )
  }

  // 평소 — 번호 (마스터/미마스터 무관)
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-36 w-36 items-center justify-center rounded-3xl text-5xl font-black tracking-tight transition-all hover:opacity-90 active:translate-y-1 active:shadow-none',
        cfg.bg,
        cfg.text,
        'shadow-[0_8px_0_rgba(0,0,0,0.10)]',
      )}
      aria-label={`Test ${test.number}`}
    >
      {numberLabel}
    </button>
  )
}
