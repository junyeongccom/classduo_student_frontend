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
  lecture_id?: string
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
    choice_text_eng?: string | null
    choice_explanation_eng?: string | null
  }[]
  bookmark: boolean
  correct: boolean | null
  selected_answer: number | null
  created_at?: string
  /** 영어 번역 (한/영 토글용) */
  question_eng?: string | null
  answer_eng?: string | null
  explanation_eng?: string | null
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
            const order: Record<string, number> = { instructor: 0, content: 1, customize: 2 }
            return (order[a.quiz_source] ?? 9) - (order[b.quiz_source] ?? 9)
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
