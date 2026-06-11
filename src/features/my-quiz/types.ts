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
export type QuizSource = 'instructor' | 'customize' | 'content' | 'exam_prep' | 'incorrect'

/** 퀴즈 세션 */
export interface QuizSession {
  session_id: string
  student_id: string
  /** 단일 회차 (하위 호환). 다중 회차 세션도 대표 회차로 유지된다. */
  lecture_id: string
  /** 다중 회차 id 목록. 신규 세션은 항상 채워지며, 단일 선택도 길이 1 배열. */
  lecture_ids?: string[]
  /** 다중 회차 표시용 제목 목록 (선택). */
  lecture_titles?: string[]
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
  /** 출처 회차 id (다중 회차 세션에서 문항별 출처 식별). 구버전/단일 폴백 시 미존재. */
  lecture_id?: string
  /** 출처 회차 번호 ("N주차" 배지 표시용). 구버전/단일 폴백 시 미존재. */
  lecture_no?: number
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
  correct: boolean | null
  answer: number | null
}

/** 즐겨찾기 (user_quiz_bookmarks) */
export interface QuizBookmarkEntry {
  id: string
  quiz_id: string
  quiz_source: QuizSource
  lecture_id: string
  selected_answer: number | null
  correct: boolean | null
  created_at: string
}

/** 세션 상세 응답 (퀴즈 목록 포함) */
export interface SessionDetailResponse {
  session: QuizSession
  quizzes: QuizItem[]
}

/** 세션 생성 요청 (신규 다중 회차 엔드포인트) */
export interface CreateSessionRequest {
  lecture_ids: string[]
  type_counts: Record<string, number>
  language?: 'ko' | 'en'
}

/** 퀴즈 생성 시 선택 가능한 유형 (백엔드 ALLOWED_TYPES와 동일 — STRUCTURE_OBJ 포함) */
export const CUSTOMIZE_QUIZ_TYPES: StudentQuizType[] = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'MISCONCEPTION',
  'STRUCTURE_OBJ',
]

/** 유형별 그룹핑 순서. exam_prep 문항은 quiz_type='EXAM_PREP' 으로 어댑트되므로 포함 필수
 *  (누락 시 오답탭/북마크탭에서 통째로 필터아웃 됨). */
export const TYPE_ORDER: StudentQuizType[] = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'MISCONCEPTION',
  'RECALL',
  'STRUCTURE',
  'STRUCTURE_OBJ',
  'EXAM_PREP',
]
