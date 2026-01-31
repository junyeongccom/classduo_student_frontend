'use client'

import { useCallback, useState } from 'react'
import { reviewService } from '@/features/review/services/reviewService'
import type { GuessTheTermSecretTerm } from '@/features/review/types'
import type { AppLocale } from '@/shared/i18n/I18nProvider'

export function useGuessTheTermChat(lectureId: string | null, locale: AppLocale) {
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendQuestion = useCallback(
    async (question: string, secretTerm: GuessTheTermSecretTerm): Promise<string | null> => {
      if (!lectureId) {
        setError('회차를 선택해 주세요.')
        return null
      }
      const trimmed = (question || '').trim()
      if (!trimmed) return null

      setIsSending(true)
      setError(null)
      try {
        const result = await reviewService.guessTheTermChat(lectureId, {
          question: trimmed,
          secret_term: secretTerm,
          locale,
        })
        if (result.error || !result.data) {
          setError(result.error?.message || '답변 생성에 실패했습니다')
          return null
        }
        return result.data.answer
      } catch {
        setError('답변 생성에 실패했습니다')
        return null
      } finally {
        setIsSending(false)
      }
    },
    [lectureId, locale]
  )

  return { sendQuestion, isSending, error }
}


