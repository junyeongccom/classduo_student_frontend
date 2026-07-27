/**
 * @file MyQuizContainer.tsx
 * @description 내 퀴즈 라우터 — 내 퀴즈 저장소 진입점
 * @module features/my-quiz
 * @dependencies QuizStorageContainer
 *
 * IA:
 *   - 사이드바 [내 퀴즈 저장소] → /my-quizzes → QuizStorageContainer
 *     (즐겨찾기 + 오답 통합 + 출처/회차/유형 필터)
 *
 * '문제 만들기'(학생 커스텀 퀴즈 생성)는 제거됨 — UI/서비스/백엔드 라우터 모두 삭제.
 * 기존 데이터(custom_quiz 등)는 보존.
 */

'use client'

import { useEffect } from 'react'
import { trackPageEnter, trackPageLeave } from '@/shared/lib/analytics'
import QuizStorageContainer from './QuizStorageContainer'

export default function MyQuizContainer() {
  useEffect(() => {
    trackPageEnter('my_quizzes')
    return () => {
      trackPageLeave('my_quizzes')
    }
  }, [])

  return <QuizStorageContainer />
}
