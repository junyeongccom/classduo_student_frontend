/**
 * @file groupQuizzes.ts
 * @description 퀴즈를 quiz_type별로 그룹화하는 순수 함수
 * @module features/my-quiz/domain
 * @dependencies types
 */

import type { StudentQuizType } from '@/shared/components/quiz'
import { TYPE_ORDER } from '../types'
import type { QuizSource } from '../types'

export interface QuizWithMeta {
  quiz_id: string
  quiz_type: StudentQuizType
  quiz_source: QuizSource
  question: string
  answer: string | null
  explanation: string | null
  difficulty: string | null
  choices: {
    choice_id: string
    choice_order: number
    choice_text: string
    is_correct: boolean
    choice_explanation: string | null
  }[]
  bookmark: boolean
  correct: boolean | null
  created_at?: string
}

export interface QuizGroup {
  type: StudentQuizType
  items: QuizWithMeta[]
}

/**
 * quiz_type별 TYPE_ORDER 순 그룹화.
 * 동일 유형 내 instructor 먼저 → customize 순, 동일 source 내 created_at 최신순.
 */
export function groupQuizzesByType(quizzes: QuizWithMeta[]): QuizGroup[] {
  return TYPE_ORDER
    .map(type => ({
      type,
      items: quizzes
        .filter(q => q.quiz_type === type)
        .sort((a, b) => {
          if (a.quiz_source !== b.quiz_source) {
            return a.quiz_source === 'instructor' ? -1 : 1
          }
          // 동일 source 내 created_at 최신순
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          }
          return 0
        }),
    }))
    .filter(g => g.items.length > 0)
}
