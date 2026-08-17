/**
 * @file SolitaireCardView.tsx
 * @description 카드 1장 렌더러 (카테고리/단어/뒷면) — props 만 받는 순수 표시 컴포넌트
 * @module features/review/games/word-solitaire/components
 * @dependencies lucide-react, uiConstants
 */
'use client'

import { Crown } from 'lucide-react'
import {
  CARD_ALIGN_CENTER_CLASS,
  CARD_ALIGN_TOP_CLASS,
  CARD_BASE_CLASS,
  SELECTED_RING_CLASS,
} from '../uiConstants.ts'

export interface SolitaireCardViewProps {
  /** 뒷면이면 라벨을 감춘다 */
  faceDown?: boolean
  kind: 'category' | 'word'
  label: string
  /** 카테고리 카드의 진행도 (기초 슬롯·테이블로 공통, 예: 2/5) */
  progress?: { done: number; total: number } | null
  selected?: boolean
  /** 지금 집을 수 있는 카드인가 (은은한 테두리 힌트) */
  movable?: boolean
  /** 갈 곳이 없어 거절된 탭 — 잠깐 흔든다 */
  rejected?: boolean
  disabled?: boolean
  /** 세로 겹침 위치(px). 겹치지 않는 단독 카드는 0 */
  top?: number
  /** 겹쳐 쌓이는 카드(테이블로)면 라벨을 위쪽에 붙인다 */
  alignTop?: boolean
  /** 카드 높이(px) — 보드가 화면 폭에 맞춰 계산해 내려준다 */
  height: number
  onClick?: () => void
  ariaLabel: string
}

export function SolitaireCardView({
  faceDown = false,
  kind,
  label,
  progress = null,
  selected = false,
  movable = false,
  rejected = false,
  disabled = false,
  top = 0,
  alignTop = false,
  height,
  onClick,
  ariaLabel,
}: SolitaireCardViewProps) {
  const isCategory = kind === 'category'
  /** 라벨 길이에 따라 글자를 줄인다 — 좁은 카드에 긴 한국어 용어가 들어가도 읽히게 */
  const labelSizeClass =
    label.length <= 6 ? 'text-[15px]' : label.length <= 12 ? 'text-[13px]' : 'text-[11px]'

  const faceClass = faceDown
    ? 'border-indigo-300 bg-gradient-to-br from-indigo-400 to-indigo-600 text-transparent'
    : isCategory
      ? 'border-violet-300 bg-violet-50 text-violet-900 font-bold'
      : 'border-gray-200 bg-white text-gray-800'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={ariaLabel}
      aria-pressed={selected}
      style={{ top, height }}
      className={[
        CARD_BASE_CLASS,
        alignTop ? CARD_ALIGN_TOP_CLASS : CARD_ALIGN_CENTER_CLASS,
        faceClass,
        selected ? `${SELECTED_RING_CLASS} -translate-y-1 shadow-md` : 'shadow-sm',
        !selected && movable && !faceDown ? 'border-primary-300' : '',
        rejected ? 'animate-shake-x' : '',
        onClick && !disabled ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {faceDown ? (
        <span className="mx-auto h-6 w-6 rounded-full border-2 border-white/40" aria-hidden="true" />
      ) : (
        // 참고 게임처럼 이름을 카드 한가운데 크게 두고, 왕관·진행도는 위쪽 모서리로 뺀다.
        <span className="flex h-full w-full flex-col overflow-hidden">
          {isCategory && (
            <span className="flex shrink-0 items-center justify-between gap-1">
              <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden="true" />
              {progress && (
                <span className="shrink-0 rounded-full bg-violet-200 px-1 py-px text-[10px] font-bold leading-none text-violet-800">
                  {progress.done}/{progress.total}
                </span>
              )}
            </span>
          )}
          {/* 겹쳐 쌓인 카드는 윗부분만 보이므로 라벨을 위로 붙이고, 맨 아래 카드만 가운데 크게 둔다 */}
          <span
            className={`flex min-w-0 flex-1 justify-center break-words px-0.5 font-semibold leading-[1.2] ${
              alignTop ? 'items-start' : 'items-center'
            } ${labelSizeClass}`}
          >
            <span className={alignTop ? 'line-clamp-1' : 'line-clamp-3'}>{label}</span>
          </span>
        </span>
      )}
    </button>
  )
}
