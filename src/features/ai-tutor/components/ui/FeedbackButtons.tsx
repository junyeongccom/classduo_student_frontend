/**
 * @file FeedbackButtons.tsx
 * @description AI 튜터 답변 좋아요/싫어요 피드백 버튼 컴포넌트
 * @module features/ai-tutor/components/ui
 * @dependencies chatService, useAnalytics
 */
'use client'

import { useState, useCallback, useEffect } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { chatService } from '@/features/ai-tutor/services/chatService'
import { trackAiTutorFeedback } from '@/shared/hooks/useAnalytics'

interface FeedbackButtonsProps {
  messageId?: string
  sessionId?: string
  initialFeedback?: 'like' | 'dislike' | null
  onFeedbackChange?: (feedback: 'like' | 'dislike' | null) => void
}

export function FeedbackButtons({
  messageId,
  sessionId,
  initialFeedback = null,
  onFeedbackChange,
}: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(initialFeedback)
  const [showToast, setShowToast] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setFeedback(initialFeedback)
  }, [initialFeedback])

  const handleFeedback = useCallback(async (type: 'like' | 'dislike') => {
    if (!messageId || isSubmitting) return

    const prevFeedback = feedback
    // 같은 버튼 재클릭 → 취소, 다른 버튼 → 전환
    const newFeedback = feedback === type ? null : type

    // Optimistic UI
    setFeedback(newFeedback)
    onFeedbackChange?.(newFeedback)
    setIsSubmitting(true)

    // GA4 이벤트
    trackAiTutorFeedback({
      feedback_type: newFeedback === null ? 'cancel' : newFeedback,
      chat_session_id: sessionId || '',
      message_id: messageId,
    })

    // 토스트 (취소 시에는 표시 안 함)
    if (newFeedback !== null) {
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }

    // API 호출
    try {
      const { error } = await chatService.updateMessageFeedback(messageId, newFeedback)
      if (error) {
        // 롤백
        setFeedback(prevFeedback)
        onFeedbackChange?.(prevFeedback)
      }
    } catch {
      // 롤백
      setFeedback(prevFeedback)
      onFeedbackChange?.(prevFeedback)
    } finally {
      setIsSubmitting(false)
    }
  }, [messageId, sessionId, feedback, isSubmitting, onFeedbackChange])

  // messageId가 없으면 버튼 숨김
  if (!messageId) return null

  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleFeedback('like')}
        disabled={isSubmitting}
        className={`inline-flex items-center justify-center rounded-md p-1.5 transition-all duration-200 ${
          feedback === 'like'
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        } disabled:opacity-50`}
        aria-label="좋아요"
      >
        <ThumbsUp className="h-3.5 w-3.5" strokeWidth={feedback === 'like' ? 2.5 : 2} />
      </button>
      <button
        type="button"
        onClick={() => handleFeedback('dislike')}
        disabled={isSubmitting}
        className={`inline-flex items-center justify-center rounded-md p-1.5 transition-all duration-200 ${
          feedback === 'dislike'
            ? 'bg-red-100 text-red-600'
            : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        } disabled:opacity-50`}
        aria-label="싫어요"
      >
        <ThumbsDown className="h-3.5 w-3.5" strokeWidth={feedback === 'dislike' ? 2.5 : 2} />
      </button>
      {showToast && (
        <span className="ml-2 text-xs text-gray-500 animate-fade-in-up">
          사용자님의 피드백은 답변 품질 향상에 큰 도움이 됩니다!
        </span>
      )}
    </div>
  )
}
