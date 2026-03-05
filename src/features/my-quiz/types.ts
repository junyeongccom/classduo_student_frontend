/**
 * @file types.ts
 * @description 내 퀴즈 도메인 타입 정의
 * @module features/my-quiz
 * @dependencies shared/components/quiz
 */

import type { StudentQuizType } from '@/shared/components/quiz'

/** 탭 타입 */
export type TabType = 'generation' | 'favorites' | 'wrong'

/** 세션 상태 */
export type SessionStatus = 'CREATING' | 'COMPLETED' | 'FAILED'

/** 퀴즈 소스 */
export type QuizSource = 'instructor' | 'customize' | 'content'

/** 퀴즈 세션 */
export interface QuizSession {
  session_id: string
  student_id: string
  lecture_id: string
  course_id: string
  generation_batch_id: string | null
  language: string | null
  status: SessionStatus
  quiz_count: number
  generated_count?: number | null
  title: string | null
  created_at: string
  updated_at: string
}

/** 퀴즈 선지 */
export interface QuizChoice {
  choice_id: string
  choice_order: number
  choice_text: string
  is_correct: boolean
  choice_explanation: string | null
  /** 영어 번역 (내 퀴즈 한/영 토글용) */
  choice_text_eng?: string | null
  choice_explanation_eng?: string | null
}

/** 퀴즈 아이템 */
export interface QuizItem {
  quiz_id: string
  session_id?: string
  quiz_type: StudentQuizType
  question: string
  answer: string | null
  explanation: string | null
  quiz_keyword: string | null
  difficulty?: string | null
  choices: QuizChoice[]
  /** 영어 번역 (내 퀴즈 한/영 토글용) */
  question_eng?: string | null
  answer_eng?: string | null
  explanation_eng?: string | null
}

/** 퀴즈 상태 (user_quiz_status) */
export interface QuizStatusEntry {
  quiz_id: string
  quiz_source: QuizSource
  lecture_id: string
  bookmark: boolean
  correct: boolean | null
  answer: number | null
}

/** 세션 상세 응답 (퀴즈 목록 포함) */
export interface SessionDetailResponse {
  session: QuizSession
  quizzes: QuizItem[]
}

/** 세션 생성 요청 */
export interface CreateSessionRequest {
  quiz_count: number
  quiz_types: string[]
}

/** 퀴즈 생성 시 선택 가능한 유형 (백엔드 ALLOWED_TYPES와 동일 — STRUCTURE_OBJ 포함) */
export const CUSTOMIZE_QUIZ_TYPES: StudentQuizType[] = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'MISCONCEPTION',
  'STRUCTURE_OBJ',
]

/** 유형별 그룹핑 순서 */
export const TYPE_ORDER: StudentQuizType[] = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'MISCONCEPTION',
  'RECALL',
  'STRUCTURE',
  'STRUCTURE_OBJ',
]
