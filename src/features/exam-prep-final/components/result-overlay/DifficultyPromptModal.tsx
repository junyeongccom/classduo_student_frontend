/**
 * @file DifficultyPromptModal.tsx
 * @description 핵심 테스트 첫 완료 시 Phase5 위에 1회 노출되는 체감 난이도 팝업.
 *   3택(어려웠어요/적당했어요/쉬웠어요) → onSelect, 나중에/배경클릭 → onDismiss.
 *   진입 직후 결과를 잠깐 보여주기 위해 약간의 지연 후 페이드인.
 * @module features/exam-prep-final/components/result-overlay
 * @dependencies next-intl, DifficultyLabel
 */
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { DifficultyLabel } from '../../services/examPrepService'

interface DifficultyPromptModalProps {
  onSelect: (label: DifficultyLabel) => void
  onDismiss: () => void
}

/** 결과 화면을 잠깐 보여준 뒤 팝업 노출 (ms). */
const APPEAR_DELAY_MS = 900

const OPTIONS: ReadonlyArray<{
  label: DifficultyLabel
  emoji: string
  /** 강조 색 — Phase5 OX 색과 통일 (어려움=빨강 / 보통=노랑 / 쉬움=초록) */
  color: string
}> = [
  { label: 'hard', emoji: '😣', color: '#F4473E' },
  { label: 'normal', emoji: '🙂', color: '#F5A623' },
  { label: 'easy', emoji: '😎', color: '#3FBF6A' },
]

export function DifficultyPromptModal({ onSelect, onDismiss }: DifficultyPromptModalProps) {
  const t = useTranslations('examPrepFinal')
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(true), APPEAR_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [])

  const handleSelect = (label: DifficultyLabel) => {
    if (submitting) return
    setSubmitting(true)
    onSelect(label)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/40 px-4 te-fade-up"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label={t('difficulty.title')}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-center text-lg font-black text-gray-900 dark:text-gray-50 md:text-xl">
          {t('difficulty.title')}
        </h3>
        <p className="mt-1.5 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
          {t('difficulty.subtitle')}
        </p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              disabled={submitting}
              onClick={() => handleSelect(opt.label)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-gray-100 bg-gray-50 py-4 transition-all hover:-translate-y-0.5 hover:bg-white disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800"
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = opt.color)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = '')}
            >
              <span className="text-3xl leading-none md:text-4xl" aria-hidden>
                {opt.emoji}
              </span>
              <span
                className="text-sm font-bold md:text-base"
                style={{ color: opt.color }}
              >
                {t(`difficulty.${opt.label}`)}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm font-medium text-gray-400 underline-offset-2 transition-colors hover:text-gray-600 hover:underline dark:text-gray-500"
          >
            {t('difficulty.dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
