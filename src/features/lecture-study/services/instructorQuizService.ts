/**
 * @file instructorQuizService.ts
 * @description 교수자가 생성한 AI 퀴즈를 학생 UI에서 조회하는 서비스
 * @module features/lecture-study/services
 * @dependencies shared/lib/supabase
 */

import {
  getSupabaseClient,
  isJWTExpiredError,
  handleJWTExpiration,
  getErrorMessage,
} from '@/shared/lib/supabase'

// ── Types ──

export type InstructorQuizType =
  | 'RECALL'
  | 'STRUCTURE'
  | 'MISCONCEPTION'
  | 'DEF_TO_TERM'
  | 'TERM_TO_DEF'
  | 'STRUCTURE_OBJ'

export interface InstructorQuizChoice {
  choice_id: string
  quiz_id: string
  choice_order: number
  choice_text: string
  is_correct: boolean
  choice_explanation: string | null
}

export interface InstructorQuizItem {
  quiz_id: string
  lecture_id: string
  course_id: string | null
  quiz_type: InstructorQuizType
  question: string
  answer: string | null
  explanation: string | null
  difficulty: string | null
  created_at: string
  choices: InstructorQuizChoice[]
}

// ── Service ──

/**
 * 특정 회차(lecture)에 해당하는 완료된 교수자 퀴즈를 조회한다.
 * step = 'QUIZ_COMPLETED' 인 퀴즈만 가져온다.
 */
export async function getInstructorQuizzes(lectureId: string): Promise<{
  data: InstructorQuizItem[] | null
  error: Error | null
}> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('instructor_quiz_items')
      .select(`
        quiz_id,
        lecture_id,
        course_id,
        quiz_type,
        question,
        answer,
        explanation,
        difficulty,
        created_at,
        instructor_quiz_choices (
          choice_id,
          quiz_id,
          choice_order,
          choice_text,
          is_correct,
          choice_explanation
        )
      `)
      .eq('lecture_id', lectureId)
      .eq('step', 'QUIZ_COMPLETED')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })

    if (error) {
      if (isJWTExpiredError(error)) {
        const refreshSuccess = await handleJWTExpiration()
        if (!refreshSuccess) {
          return { data: null, error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.') }
        }
        return { data: null, error: new Error('세션이 만료되어 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }

    const items: InstructorQuizItem[] = (data ?? []).map((row: any) => ({
      quiz_id: row.quiz_id,
      lecture_id: row.lecture_id,
      course_id: row.course_id ?? null,
      quiz_type: row.quiz_type,
      question: row.question ?? '',
      answer: row.answer ?? null,
      explanation: row.explanation ?? null,
      difficulty: row.difficulty ?? null,
      created_at: row.created_at,
      choices: (row.instructor_quiz_choices ?? [])
        .sort((a: any, b: any) => a.choice_order - b.choice_order)
        .map((c: any) => ({
          choice_id: c.choice_id,
          quiz_id: c.quiz_id,
          choice_order: c.choice_order,
          choice_text: c.choice_text,
          is_correct: c.is_correct,
          choice_explanation: c.choice_explanation ?? null,
        })),
    }))

    return { data: items, error: null }
  } catch (error) {
    if (isJWTExpiredError(error)) {
      const refreshSuccess = await handleJWTExpiration()
      if (!refreshSuccess) {
        return { data: null, error: new Error('세션이 만료되었습니다. 다시 로그인해주세요.') }
      }
      return { data: null, error: new Error('세션이 만료되어 갱신되었습니다. 다시 시도해주세요.') }
    }
    return {
      data: null,
      error: error instanceof Error ? error : new Error(getErrorMessage(error)),
    }
  }
}

