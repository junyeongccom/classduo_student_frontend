/**
 * @file DialogueFeedbackModal.tsx
 * @description 대화형 학습 세션 만족도 평가 모달 (별점 5점). 사용자가 user 메시지 ≥1 인 세션을 떠날 때 표시.
 * @module features/ai-tutor/components/ui
 * @dependencies lucide-react, useI18n, chatService, useDialogueFeedbackStore (오늘하루 닫기)
 */
'use client'

import { useState, useCallback, useEffect } from 'react'
import { Star, X } from 'lucide-react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { chatService } from '@/features/ai-tutor/services/chatService'
import { dismissForToday } from '@/features/ai-tutor/store/useDialogueFeedbackStore'

interface DialogueFeedbackModalProps {
  /** 평가 대상 세션 ID. null 이면 모달 미표시. */
  sessionId: string | null
  /** 모달 닫기 콜백 (별점 저장 후 또는 사용자가 닫음). */
  onClose: () => void
  /** 평가 완료 콜백 — 부모에서 세션 추적 상태 갱신용. */
  onRated?: (sessionId: string, rating: number) => void
}

const STAR_COUNT = 5

export function DialogueFeedbackModal({ sessionId, onClose, onRated }: DialogueFeedbackModalProps) {
  const { locale } = useI18n()
  const [hovered, setHovered] = useState<number>(0) // 1~5
  const [selected, setSelected] = useState<number>(0) // 1~5
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // sessionId 가 바뀌면 상태 초기화 (다른 세션 평가 트리거 시)
  useEffect(() => {
    setHovered(0)
    setSelected(0)
    setSubmitting(false)
    setError(null)
  }, [sessionId])

  const isEn = locale === 'en'
  const labels = {
    title: isEn ? 'How was the conversation?' : '방금 대화는 만족스러우셨나요?',
    subtitle: isEn ? 'Your feedback helps us improve.' : '여러분의 피드백이 더 나은 학습으로 이어집니다.',
    submit: isEn ? 'Submit' : '평가 보내기',
    skip: isEn ? 'Skip' : '건너뛰기',
    close: isEn ? 'Close' : '닫기',
    dismissToday: isEn ? "Don't show today" : '오늘하루 닫기',
    error: isEn ? 'Failed to submit. Please try again.' : '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  }

  const handleSubmit = useCallback(async () => {
    if (!sessionId || selected < 1 || selected > 5 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { data, error: err } = await chatService.updateSessionSatisfaction(sessionId, selected)
      if (err) {
        setError(labels.error)
        setSubmitting(false)
        return
      }
      // updated=false (already_rated) 도 정상 처리 — 호출 측에서 세션을 평가 완료로 마킹.
      onRated?.(sessionId, selected)
      onClose()
    } catch {
      setError(labels.error)
      setSubmitting(false)
    }
  }, [sessionId, selected, submitting, onClose, onRated, labels.error])

  const handleDismissToday = useCallback(() => {
    dismissForToday()
    onClose()
  }, [onClose])

  if (!sessionId) return null

  const displayValue = hovered || selected

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        // backdrop 클릭은 무시 — 닫기는 명시적 X / Skip 버튼만 (오탭 방지)
        if (e.target === e.currentTarget) {
          // no-op
        }
      }}
    >
      <div className="relative w-[min(92vw,420px)] rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* 닫기 X 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          aria-label={labels.close}
          disabled={submitting}
        >
          <X className="h-4 w-4" />
        </button>

        {/* 제목 */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50 pr-6">
          {labels.title}
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {labels.subtitle}
        </p>

        {/* 별점 */}
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {Array.from({ length: STAR_COUNT }).map((_, idx) => {
            const value = idx + 1
            const filled = displayValue >= value
            return (
              <button
                key={value}
                type="button"
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setSelected(value)}
                disabled={submitting}
                aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
                className="p-1 rounded transition-transform hover:scale-110 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Star
                  className={`h-9 w-9 transition-colors ${
                    filled
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-none text-gray-300 dark:text-gray-600'
                  }`}
                />
              </button>
            )
          })}
        </div>

        {/* 오늘하루 닫기 — 별점 칸 최하단 가운데, 클릭 시 자정까지 미표시 */}
        <div className="mt-3 text-center">
          <button
            type="button"
            onClick={handleDismissToday}
            disabled={submitting}
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {labels.dismissToday}
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="mt-3 text-center text-xs text-rose-500" role="alert">
            {error}
          </p>
        )}

        {/* 버튼 영역 */}
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-10 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {labels.skip}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected < 1 || submitting}
            className="flex-1 h-10 rounded-lg bg-violet-500 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? '...' : labels.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
