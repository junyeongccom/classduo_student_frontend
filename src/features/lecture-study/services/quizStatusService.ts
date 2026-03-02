/**
 * @file quizStatusService.ts
 * @description 퀴즈 상태 관리 서비스 — 즐겨찾기/풀이결과/보상 API 호출 + user_quiz_status 조회
 * @module features/lecture-study/services
 * @dependencies shared/lib/api, shared/lib/supabase
 */

import { apiRequest } from '@/shared/lib/api'
import {
  getSupabaseClient,
  isJWTExpiredError,
  handleJWTExpiration,
  getErrorMessage,
} from '@/shared/lib/supabase'

/* ───────────── Types ───────────── */

export type QuizSource = 'instructor' | 'customize' | 'content'

export interface QuizStatus {
  quiz_id: string
  quiz_source: QuizSource
  bookmark: boolean
  correct: boolean | null
  answer: number | null
}

interface BookmarkResponse {
  quiz_id: string
  quiz_source: string
  bookmark: boolean
}

interface CorrectResponse {
  quiz_id: string
  quiz_source: string
  correct: boolean
}

interface RewardGrantResponse {
  lecture_id: string
  rewarded: boolean
  already_exists: boolean
  message: string
}

/* ───────────── Supabase 직접 조회 ───────────── */

/**
 * 특정 lecture의 모든 user_quiz_status를 조회한다 (quiz_source 기준 필터).
 * RLS가 student_id를 자동 필터링하므로 student_id 파라미터 불필요.
 */
export async function getQuizStatusByLecture(
  lectureId: string,
  quizSource: QuizSource,
): Promise<{ data: QuizStatus[] | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('user_quiz_status')
      .select('quiz_id, quiz_source, bookmark, correct, answer')
      .eq('lecture_id', lectureId)
      .eq('quiz_source', quizSource)

    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }

    return { data: (data ?? []) as QuizStatus[], error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) {
      await handleJWTExpiration()
      return { data: null, error: new Error('세션이 만료되었습니다.') }
    }
    return {
      data: null,
      error: err instanceof Error ? err : new Error(getErrorMessage(err)),
    }
  }
}

/* ───────────── Backend API 호출 ───────────── */

/** 즐겨찾기 토글 */
export async function toggleBookmark(
  quizSource: QuizSource,
  quizId: string,
  lectureId: string,
  bookmark: boolean,
) {
  return apiRequest<BookmarkResponse>(
    `/quiz-status/${quizSource}/${quizId}/bookmark?lecture_id=${lectureId}`,
    {
      method: 'PATCH',
      auth: true,
      body: { bookmark },
    },
  )
}

/** 풀이 결과 업데이트. correct=null이면 선택 해제(리셋). */
export async function updateCorrect(
  quizSource: QuizSource,
  quizId: string,
  lectureId: string,
  correct: boolean | null,
  answer?: number | null,
) {
  return apiRequest<CorrectResponse>(
    `/quiz-status/${quizSource}/${quizId}/correct`,
    {
      method: 'PATCH',
      auth: true,
      body: { lecture_id: lectureId, correct, answer },
    },
  )
}

/** 보상 획득 요청 */
export async function grantReward(lectureId: string, quizSource: QuizSource = 'instructor') {
  return apiRequest<RewardGrantResponse>(
    `/quiz-status/lectures/${lectureId}/reward?quiz_source=${quizSource}`,
    {
      method: 'POST',
      auth: true,
    },
  )
}
