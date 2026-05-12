/**
 * @file CoreTestButton.tsx
 * @description 핵심 테스트 번호 버튼 — 세트별 톤, 선택 시 pressed 고정, MASTER 도장
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { useTranslations } from 'next-intl'
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
 * 핵심테스트 버튼용 MASTER 도장 src 선택
 * - 세트 3: 진보라 배경이라 밝은 톤 도장(set3) 필요
 * - 세트 1, 2: 기본 도장
 */
function getCoreMasterSrc(setTone: 1 | 2 | 3): string {
  return setTone === 3 ? '/master-set3.png' : '/master.png'
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
  const t = useTranslations()
  const isLocked = test.status === 'locked'
  const cfg = SET_BUTTON_STYLES[setTone]
  const numberLabel = String(test.number).padStart(2, '0')
  const showMasterBadge = test.isTestMastered

  const masterSrc = getCoreMasterSrc(setTone)

  // 잠긴 상태 — 자물쇠 (선택 불가).
  // 비선택 활성 버튼과 동일한 8px 하단 명암을 줘서 모든 핵심테스트 버튼의
  // 시각적 바닥선이 일치하도록 한다 ("튀어나온 버튼" 디자인 유지).
  if (isLocked) {
    return (
      <button
        type="button"
        disabled
        className="relative flex h-24 w-24 md:h-36 md:w-36 cursor-not-allowed items-center justify-center rounded-3xl bg-gray-100 shadow-[0_8px_0_#D1D5DB] dark:bg-gray-800 dark:shadow-[0_8px_0_#374151]"
        aria-label={t('examPrepFinal.coreTestAria.locked', { number: test.number })}
      >
        <img
          src="/자물쇠.png"
          alt=""
          width={56}
          height={56}
          className="opacity-60"
          draggable={false}
        />
        {showMasterBadge && <MasterStamp src={masterSrc} masterReachedTitle={t('examPrepFinal.masterReachedTitle')} />}
      </button>
    )
  }

  const activeAriaKey =
    isSelected && showMasterBadge
      ? 'examPrepFinal.coreTestAria.selectedMastered'
      : isSelected
        ? 'examPrepFinal.coreTestAria.selected'
        : showMasterBadge
          ? 'examPrepFinal.coreTestAria.mastered'
          : 'examPrepFinal.coreTestAria.base'

  // 활성 버튼 — 선택 시 pressed 고정(translate + shadow 제거), 비선택 시 set색 하단 명암
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex h-24 w-24 md:h-36 md:w-36 items-center justify-center rounded-3xl transition-all hover:opacity-90',
        cfg.bg,
        isSelected
          ? 'translate-y-2 shadow-none'
          : `${cfg.shadow} active:translate-y-1 active:shadow-none`,
      )}
      aria-label={t(activeAriaKey, { number: test.number })}
    >
      <span
        className={cn(
          'relative z-0 text-6xl font-black leading-none tracking-tight',
          cfg.text,
        )}
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {numberLabel}
      </span>

      {/* MASTER 도장 — 숫자 위로 (z-10), 버튼 내부라 pressed 시 같이 translate */}
      {showMasterBadge && <MasterStamp src={masterSrc} masterReachedTitle={t('examPrepFinal.masterReachedTitle')} />}
    </button>
  )
}

/** Master 도장 — 버튼 하단에 배치. drop-shadow(블러) 제거. PNG 원본 비율 유지. */
function MasterStamp({ src, masterReachedTitle }: { src: string; masterReachedTitle: string }) {
  return (
    <img
      src={src}
      alt="MASTER"
      aria-label="Master"
      title={masterReachedTitle}
      className="pointer-events-none absolute bottom-3 left-1/2 z-10 w-[100%] max-w-none -translate-x-1/2 select-none object-contain"
      draggable={false}
    />
  )
}
