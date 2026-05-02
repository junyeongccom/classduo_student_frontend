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

export type QuizSource = 'instructor' | 'customize' | 'content' | 'incorrect'

export interface QuizStatus {
  quiz_id: string
  quiz_source: QuizSource
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
 * 특정 lecture 의 quiz_id 별 최신 풀이 상태를 user_quiz_response 에서 조회한다.
 *
 * legacy user_quiz_status 의존을 끊었고, user_quiz_response 는 누적 INSERT 라
 * created_at DESC 정렬 후 quiz_id 별 첫 행만 dedup 해서 '현재 풀이 상태' 로 본다.
 *
 * RLS 가 student_id 를 자동 필터링하므로 student_id 파라미터 불필요.
 *
 * 주의: user_quiz_response 는 'content' / 'customize' 만 적재된다. 'instructor' 로
 * 호출하면 빈 배열을 반환한다 (학생 UI 미노출이라 영향 없음).
 */
export async function getQuizStatusByLecture(
  lectureId: string,
  quizSource: QuizSource,
): Promise<{ data: QuizStatus[] | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from('user_quiz_response')
      .select('quiz_id, quiz_source, is_correct, selected_answer, created_at')
      .eq('lecture_id', lectureId)
      .eq('quiz_source', quizSource)
      .order('created_at', { ascending: false })

    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }

    // quiz_id 별 최신 1건만 dedup → legacy QuizStatus 형태({correct, answer})로 매핑
    const seen = new Set<string>()
    const dedup: QuizStatus[] = []
    for (const row of (data ?? []) as Array<{
      quiz_id: string
      quiz_source: string
      is_correct: boolean | null
      selected_answer: number | null
    }>) {
      if (seen.has(row.quiz_id)) continue
      seen.add(row.quiz_id)
      dedup.push({
        quiz_id: row.quiz_id,
        quiz_source: row.quiz_source as QuizSource,
        correct: row.is_correct,
        answer: row.selected_answer,
      })
    }
    return { data: dedup, error: null }
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

/* ───────────── 즐겨찾기 Supabase 조회 ───────────── */

/**
 * 특정 lecture의 모든 user_quiz_bookmarks를 조회한다.
 * RLS가 student_id를 자동 필터링하므로 student_id 파라미터 불필요.
 */
export async function getBookmarksByLecture(
  lectureId: string,
): Promise<{ data: { quiz_id: string; quiz_source: QuizSource }[] | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user_quiz_bookmarks')
      .select('quiz_id, quiz_source')
      .eq('lecture_id', lectureId)
    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }
    return { data: (data ?? []) as { quiz_id: string; quiz_source: QuizSource }[], error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) {
      await handleJWTExpiration()
      return { data: null, error: new Error('세션이 만료되었습니다.') }
    }
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/* ───────────── Backend API 호출 ───────────── */

/** 즐겨찾기 토글 (추가 시 현재 풀이 상태 복사) */
export async function toggleBookmark(
  quizSource: QuizSource,
  quizId: string,
  lectureId: string,
  bookmark: boolean,
  selectedAnswer?: number | null,
  correct?: boolean | null,
) {
  return apiRequest<BookmarkResponse>(
    `/quiz-status/${quizSource}/${quizId}/bookmark`,
    {
      method: 'PATCH',
      auth: true,
      body: { bookmark, lecture_id: lectureId, selected_answer: selectedAnswer ?? null, correct: correct ?? null },
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
  durationMs?: number | null,
) {
  return apiRequest<CorrectResponse>(
    `/quiz-status/${quizSource}/${quizId}/correct`,
    {
      method: 'PATCH',
      auth: true,
      body: { lecture_id: lectureId, correct, answer, duration_ms: durationMs ?? null },
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
