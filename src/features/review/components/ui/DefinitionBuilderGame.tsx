'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { DefinitionBuilderGameResponse, DefinitionBuilderQuestion } from '@/features/review/types'

interface DefinitionBuilderGameProps {
  data: DefinitionBuilderGameResponse | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
  isEnabled: boolean
  currentScore: number
  onScoreDelta?: (delta: number) => void
  onRestart?: () => void
}

const createBlankMap = (question: DefinitionBuilderQuestion | null) => {
  if (!question) return new Map<number, string>()
  const map = new Map<number, string>()
  question.blanks.forEach(blank => {
    map.set(blank.index, '')
  })
  return map
}

export function DefinitionBuilderGame({
  data,
  isLoading,
  error,
  onRetry,
  isEnabled,
  currentScore,
  onScoreDelta,
  onRestart,
}: DefinitionBuilderGameProps) {
  const t = useTranslations('review.ui')
  const questions = data?.questions ?? []
  const totalCount = data?.total_count ?? 0
  const [currentIndex, setCurrentIndex] = useState(0)
  const [filledMap, setFilledMap] = useState<Map<number, string>>(new Map())
  const [completed, setCompleted] = useState(false)
  const [usedChoices, setUsedChoices] = useState<Set<string>>(new Set())
  const [lastWrongChoice, setLastWrongChoice] = useState<string | null>(null)
  const [gameCompleted, setGameCompleted] = useState(false)

  const currentQuestion = questions[currentIndex] ?? null
  const blankIndices = useMemo(
    () => (currentQuestion?.blank_indices ? [...currentQuestion.blank_indices].sort((a, b) => a - b) : []),
    [currentQuestion]
  )
  const choiceRows = useMemo(() => {
    if (!currentQuestion) return [[], []] as string[][]
    const first = currentQuestion.choices.slice(0, 9)
    const second = currentQuestion.choices.slice(9, 12)
    return [first, second]
  }, [currentQuestion])

  useEffect(() => {
    setFilledMap(createBlankMap(currentQuestion))
    setCompleted(false)
    setUsedChoices(new Set())
    setLastWrongChoice(null)
  }, [currentQuestion])

  useEffect(() => {
    if (questions.length > 0) {
      setCurrentIndex(0)
      setGameCompleted(false)
    }
  }, [questions.length])

  const filledCount = Array.from(filledMap.values()).filter(Boolean).length
  const totalBlanks = blankIndices.length

  useEffect(() => {
    if (totalBlanks > 0 && filledCount >= totalBlanks) {
      setCompleted(true)
    }
  }, [filledCount, totalBlanks])

  useEffect(() => {
    if (completed && totalCount > 0 && currentIndex === totalCount - 1) {
      setGameCompleted(true)
    }
  }, [completed, currentIndex, totalCount])

  const handleChoiceClick = (choice: string) => {
    if (!currentQuestion || completed) return
    const nextBlankIndex = currentQuestion.blanks.find(blank => blank.token === choice && !filledMap.get(blank.index))

    if (nextBlankIndex) {
      const nextMap = new Map(filledMap)
      nextMap.set(nextBlankIndex.index, choice)
      setFilledMap(nextMap)
      onScoreDelta?.(10)
      setUsedChoices(prev => new Set([...prev, choice]))
      setLastWrongChoice(null)
      return
    }
    onScoreDelta?.(-10)
    setLastWrongChoice(choice)
    window.setTimeout(() => {
      setLastWrongChoice(prev => (prev === choice ? null : prev))
    }, 600)
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      return
    }
    setGameCompleted(true)
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setGameCompleted(false)
    setFilledMap(createBlankMap(questions[0] ?? null))
    setCompleted(false)
    setUsedChoices(new Set())
    setLastWrongChoice(null)
    onRestart?.()
  }

  if (!isEnabled) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
        {t('definitionBuilder.selectLecture')}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
        {t('definitionBuilder.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700">
        <p>{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-rose-200 bg-white px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
        >
          {t('definitionBuilder.retry')}
        </button>
      </div>
    )
  }

  if (!currentQuestion || totalCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
        {t('definitionBuilder.noItems')}
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {gameCompleted ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="definition-builder-success text-3xl font-extrabold text-emerald-600">
            {t('definitionBuilder.successTitle')}
          </div>
          <div className="text-lg font-semibold text-slate-700">
            {t('definitionBuilder.finalScoreLabel', { score: currentScore })}
          </div>
          <button
            type="button"
            onClick={handleRestart}
            className="mt-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('definitionBuilder.restart')}
          </button>
        </div>
      ) : (
        <>
      <div className="flex items-center justify-end text-xs text-slate-400">
        <div>{t('definitionBuilder.progressLabel', { current: currentIndex + 1, total: totalCount })}</div>
      </div>

      <div className="text-center text-2xl font-semibold text-blue-600">
        {currentQuestion.keyword}
      </div>

      <div
        className={`rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-base text-slate-700 ${
          completed ? 'definition-builder-complete' : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-center gap-2 text-center">
          {currentQuestion.tokens.map((token, index) => {
            if (blankIndices.includes(index)) {
              const filled = filledMap.get(index) || ''
              return (
                <span
                  key={`blank-${index}`}
                  className="min-w-[52px] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-center text-base font-semibold text-slate-900"
                >
                  {filled || '____'}
                </span>
              )
            }
            return (
              <span key={`token-${index}`} className="text-base text-slate-700">
                {token}
              </span>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {choiceRows.map((row, rowIndex) => (
          <div key={`choice-row-${rowIndex}`} className="flex flex-wrap justify-center gap-2">
            {row.map((choice, index) => {
              const isUsed = usedChoices.has(choice)
              const isWrong = lastWrongChoice === choice
              return (
                <button
                  key={`${choice}-${rowIndex}-${index}`}
                  type="button"
                  disabled={isUsed || completed}
                  onClick={() => handleChoiceClick(choice)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    isUsed
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : isWrong
                        ? 'border-rose-300 bg-rose-50 text-rose-600'
                        : 'border-blue-200 bg-blue-50 text-blue-600 hover:border-blue-300 hover:bg-blue-100'
                  } ${completed ? 'opacity-60' : ''}`}
                >
                  {choice}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {completed && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {currentIndex < totalCount - 1
              ? t('definitionBuilder.next')
              : t('definitionBuilder.restart')}
          </button>
        </div>
      )}
        </>
      )}
    </div>
  )
}

