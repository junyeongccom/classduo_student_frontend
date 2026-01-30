import { useCallback } from 'react'
import { cardMatchService } from '../services/cardMatchService'

/**
 * AI 튜터 카드매칭 '시도' 로거
 * - 카드 2장 선택 → 비교가 발생할 때마다 1회 호출
 * - fire-and-forget (UI/게임 진행을 막지 않음)
 */
export function useCardMatchAttemptLogger(lectureId: string | null) {
  const logAttempt = useCallback(
    (correct: boolean) => {
      if (!lectureId) return
      // UI는 블로킹하지 않음
      cardMatchService
        .submitCardMatchAttempt(lectureId, { correct })
        .then((result) => {
          if (result.error) {
            console.error('[useCardMatchAttemptLogger] submit failed:', result.error)
          }
        })
        .catch((err) => {
          console.error('[useCardMatchAttemptLogger] submit exception:', err)
        })
    },
    [lectureId]
  )

  return { logAttempt }
}


