/**
 * @file instructorQuizService.ts
 * @description 컨텐츠 파이프라인 자동 생성 퀴즈를 학생 UI에서 조회하는 서비스 (content_quiz_items)
 * @module features/lecture-study/services
 * @dependencies shared/lib/supabase
 */

import {
  getSupabaseClient,
  isJWTExpiredError,
  handleJWTExpiration,
  getErrorMessage,
} from '@/shared/lib/supabase'
import type { AppLocale } from '@/shared/i18n/I18nProvider'

// ── Types ──

export type InstructorQuizType =
  // 레거시 4유형 — 기존 데이터는 재생성되지 않으므로 계속 유지(확장, 대체 아님)
  | 'MISCONCEPTION'
  | 'DEF_TO_TERM'
  | 'TERM_TO_DEF'
  | 'STRUCTURE_OBJ'
  // 신규 4유형 (2026-07 개편)
  | 'TERM_MEMORY'
  | 'CONCEPT'
  | 'ANALYSIS_APPLY'
  | 'JUDGE_DESIGN'

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
  quiz_type: InstructorQuizType
  question: string
  explanation: string | null
  difficulty: string | null
  created_at: string
  choices: InstructorQuizChoice[]
  source?: {
    source_pages?: number[]
    source_chunks?: number[]
    /** 청크별 근거 문장 (서버 결정론 부착, 하이라이팅용) — ko/en 각각 */
    source_quotes?: { chunk: number; text: string }[]
    source_quotes_eng?: { chunk: number; text: string }[]
  }
  /** 서술형(essay) 유형의 모범답안. 객관식은 null. */
  model_answer?: string | null
  /** 'multiple_choice'(객관식) | 'essay'(서술형). 미존재(레거시 로우) 시 'multiple_choice'로 취급. */
  answer_format?: 'multiple_choice' | 'essay'
}

// ── Service ──

/**
 * 특정 회차(lecture)에 해당하는 컨텐츠 퀴즈를 조회한다.
 */
export async function getInstructorQuizzes(lectureId: string, locale: AppLocale = 'ko'): Promise<{
  data: InstructorQuizItem[] | null
  error: Error | null
}> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('content_quiz_items')
      .select(`
        quiz_id,
        lecture_id,
        quiz_type,
        question,
        question_eng,
        explanation,
        explanation_eng,
        difficulty,
        created_at,
        source,
        model_answer,
        model_answer_eng,
        answer_format,
        content_quiz_choices (
          choice_id,
          quiz_id,
          choice_order,
          choice_text,
          choice_text_eng,
          is_correct,
          choice_explanation,
          choice_explanation_eng
        )
      `)
      .eq('lecture_id', lectureId)
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

    const pick = (ko: string | null, en: string | null) =>
      locale === 'en' && en ? en : (ko ?? '')

    const items: InstructorQuizItem[] = (data ?? []).map((row: any) => ({
      quiz_id: row.quiz_id,
      lecture_id: row.lecture_id,
      quiz_type: row.quiz_type,
      question: pick(row.question, row.question_eng),
      explanation: pick(row.explanation, row.explanation_eng) || null,
      difficulty: row.difficulty ?? null,
      created_at: row.created_at,
      source: row.source ?? {},
      model_answer: pick(row.model_answer, row.model_answer_eng) || null,
      answer_format: row.answer_format ?? 'multiple_choice',
      choices: (row.content_quiz_choices ?? [])
        .sort((a: any, b: any) => a.choice_order - b.choice_order)
        .map((c: any) => ({
          choice_id: c.choice_id,
          quiz_id: c.quiz_id,
          choice_order: c.choice_order,
          choice_text: pick(c.choice_text, c.choice_text_eng),
          is_correct: c.is_correct,
          choice_explanation: pick(c.choice_explanation, c.choice_explanation_eng) || null,
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

