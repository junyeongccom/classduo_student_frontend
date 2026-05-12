/**
 * @file SelectedMidTestInfoCard.tsx
 * @description 중간 테스트 책 버튼 선택 시 상단 3박스를 대체하는 정보 카드.
 *   SelectedTestInfoCard(핵심테스트용) 와 동일한 레이아웃 — 좌측: 회차 + 제목 + mastery 도트,
 *   우측: 시작 버튼(Play) 또는 마스터 시 다시보기.
 * @module features/exam-prep-final/components/ui
 * @dependencies lucide-react, examPrepService
 */

'use client'

import { useEffect, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { fetchTestMasterySummary } from '../../services/examPrepService'
import type { MidTest } from '../../types'

interface SelectedMidTestInfoCardProps {
  midTest: MidTest
  onStart: () => void
}

interface MasteryCounts {
  learning: number
  skilled: number
  master: number
}

export function SelectedMidTestInfoCard({
  midTest,
  onStart,
}: SelectedMidTestInfoCardProps) {
  const t = useTranslations()
  const numberLabel = String(midTest.setNumber).padStart(2, '0')
  const subtitle = t('examPrepFinal.midTestMetaSlash', {
    minutes: midTest.minutes,
    questions: midTest.questions,
  })
  const isMastered = midTest.status === 'mastered'
  const canStart = !!midTest.testId && (midTest.status === 'available' || midTest.status === 'mastered')

  const [mastery, setMastery] = useState<MasteryCounts | null>(null)

  useEffect(() => {
    if (!midTest.testId) {
      setMastery(null)
      return
    }
    let alive = true
    fetchTestMasterySummary(midTest.testId).then(({ data, error }) => {
      if (!alive) return
      if (error || !data) {
        setMastery(null)
        return
      }
      setMastery({
        learning: data.summary.learning,
        skilled: data.summary.skilled,
        master: data.summary.master,
      })
    })
    return () => {
      alive = false
    }
  }, [midTest.testId])

  // 응답 도착 전 즉시 추정값 — mastered 면 모두 master, 아니면 모두 learning.
  const totalQs = midTest.questions
  const counts: MasteryCounts =
    mastery ??
    (isMastered
      ? { learning: 0, skilled: 0, master: totalQs }
      : { learning: totalQs, skilled: 0, master: 0 })

  return (
    <div className="relative flex h-full items-stretch justify-between gap-3 overflow-hidden rounded-3xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900 md:gap-6 md:px-7 md:py-7">
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 md:gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 md:gap-4">
            <span className="text-3xl font-bold leading-none text-gray-900 dark:text-gray-50 md:text-5xl">
              {numberLabel}
            </span>
            <span className="whitespace-nowrap text-sm font-medium text-gray-400 md:text-base">{subtitle}</span>
          </div>
          <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-gray-50 md:mt-5 md:text-3xl">
            {t('examPrepFinal.midTestSetTitle', { setNumber: midTest.setNumber })}
          </h3>
        </div>

        <div className="flex items-center gap-5 text-base font-medium text-gray-700 dark:text-gray-200">
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#D9D9D9]" />
            {counts.learning}
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#FFCD36]" />
            {counts.skilled}
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#A78BFA]" />
            {counts.master}
          </span>
        </div>
      </div>

      {isMastered ? (
        <>
          <div className="flex shrink-0 self-center">
            <img
              src="/master-big.png"
              alt="MASTER"
              aria-hidden
              draggable={false}
              className="pointer-events-none h-20 w-auto select-none object-contain md:h-32"
            />
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            aria-label={t('examPrepFinal.replayLabel')}
            title={t('examPrepFinal.replayLabel')}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500  transition-colors hover:bg-gray-50 hover:text-[#6366F1] disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          aria-label={t('examPrepFinal.startMidTestAria')}
          className="flex h-14 w-14 shrink-0 self-center items-center justify-center rounded-2xl bg-[#6366F1] text-white transition-colors hover:bg-[#5558E6] disabled:cursor-not-allowed disabled:bg-gray-300 md:h-20 md:w-20"
        >
          <Play className="h-6 w-6 fill-white md:h-8 md:w-8" />
        </button>
      )}
    </div>
  )
}
