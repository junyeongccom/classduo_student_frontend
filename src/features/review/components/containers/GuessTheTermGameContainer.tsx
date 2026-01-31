'use client'

import type { LectureReviewItem } from '@/features/review/types'
import type { AppLocale } from '@/shared/i18n/I18nProvider'
import { useGuessTheTermChat } from '@/features/review/hooks/useGuessTheTermChat'
import type { GuessTheTermSecretTerm } from '@/features/review/types'
import { GuessTheTermGameView } from '@/features/review/components/ui/GuessTheTermGameView'

interface GuessTheTermGameContainerProps {
  lectureId: string | null
  locale: AppLocale
  isEnabled: boolean
  reviewItems: LectureReviewItem[]
  onExitGame: () => void
}

export function GuessTheTermGameContainer({
  lectureId,
  locale,
  isEnabled,
  reviewItems,
  onExitGame,
}: GuessTheTermGameContainerProps) {
  const { sendQuestion, isSending, error } = useGuessTheTermChat(lectureId, locale)

  return (
    <GuessTheTermGameView
      isEnabled={isEnabled}
      reviewItems={reviewItems}
      onExitGame={onExitGame}
      onSubmitQuestion={async (question: string, secretTerm: GuessTheTermSecretTerm) => {
        const answer = await sendQuestion(question, secretTerm)
        return answer
      }}
      isSending={isSending}
      errorMessage={error}
    />
  )
}


