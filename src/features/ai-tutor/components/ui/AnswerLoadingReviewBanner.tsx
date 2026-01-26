import { cn } from '@/shared/lib/utils'

interface AnswerLoadingReviewBannerProps {
  answers: string[]
  fallbackText: string
  className?: string
}

export function AnswerLoadingReviewBanner({
  answers,
  fallbackText,
  className,
}: AnswerLoadingReviewBannerProps) {
  const displayText = answers.length > 0 ? answers.join(' · ') : fallbackText

  return (
    <div
      className={cn(
        'rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800',
        className,
      )}
    >
      {displayText}
    </div>
  )
}

