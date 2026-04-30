/**
 * @file MyQuizContainer.tsx
 * @description 내 퀴즈 라우터 — ?tab=create 면 문제 만들기, 그 외 = 저장소
 * @module features/my-quiz
 * @dependencies QuizStorageContainer, QuizGenerationTab
 *
 * IA (2026-04-30 리뉴얼):
 *   - 사이드바 [내 퀴즈 저장소]   → /my-quizzes (default) → QuizStorageContainer
 *     (즐겨찾기 + 오답 통합 + 출처/회차/유형 필터)
 *   - 사이드바 [문제 만들기]      → /my-quizzes?tab=create → QuizGenerationTab
 *     (기존 퀴즈 생성 + 내 퀴즈 세션 관리)
 */

'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trackPageEnter, trackPageLeave } from '@/shared/lib/analytics'
import QuizCreatorContainer from './QuizCreatorContainer'
import QuizStorageContainer from './QuizStorageContainer'

export default function MyQuizContainer() {
  const searchParams = useSearchParams()
  const tab = searchParams?.get('tab')
  const isCreate = tab === 'create'

  useEffect(() => {
    const page = isCreate ? 'create_question' : 'my_quizzes'
    trackPageEnter(page)
    return () => {
      trackPageLeave(page)
    }
  }, [isCreate])

  if (isCreate) {
    return <QuizCreatorContainer />
  }

  return <QuizStorageContainer />
}
