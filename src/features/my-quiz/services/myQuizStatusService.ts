/**
 * @file myQuizStatusService.ts
 * @description 퀴즈 상태(즐겨찾기/정답/보상) 관리 + 통합 퀴즈 조회 서비스
 * @module features/my-quiz/services
 * @dependencies shared/lib/api, shared/lib/supabase
 */

import { apiRequest } from '@/shared/lib/api'
import {
  getSupabaseClient,
  isJWTExpiredError,
  handleJWTExpiration,
  getErrorMessage,
} from '@/shared/lib/supabase'
import type { QuizStatusEntry, QuizSource, QuizItem, QuizChoice } from '../types'

/* ───────────── Types ───────────── */

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
 * 특정 lecture의 user_quiz_status 조회 (필터: bookmark 또는 correct)
 * RLS가 student_id 자동 필터링.
 */
export async function getQuizStatusesByLecture(
  lectureId: string,
  filter: { bookmark?: boolean; correct?: boolean },
  options?: { limit?: number; offset?: number },
): Promise<{ data: QuizStatusEntry[] | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('user_quiz_status')
      .select('quiz_id, quiz_source, lecture_id, bookmark, correct, answer')
      .eq('lecture_id', lectureId)

    if (filter.bookmark !== undefined) {
      query = query.eq('bookmark', filter.bookmark)
    }
    if (filter.correct !== undefined) {
      query = query.eq('correct', filter.correct)
    }

    // ORDER BY 필수: offset 기반 무한스크롤에서 일관된 정렬 보장
    query = query.order('id', { ascending: true })

    if (options?.limit) {
      const offset = options.offset ?? 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }

    return { data: (data ?? []) as QuizStatusEntry[], error: null }
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

/**
 * 복수 lecture의 user_quiz_status 조회 (필터: bookmark 또는 correct)
 * RLS가 student_id 자동 필터링.
 */
export async function getQuizStatusesByLectureIds(
  lectureIds: string[],
  filter: { bookmark?: boolean; correct?: boolean },
  options?: { limit?: number; offset?: number },
): Promise<{ data: QuizStatusEntry[] | null; error: Error | null }> {
  if (lectureIds.length === 0) return { data: [], error: null }

  try {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('user_quiz_status')
      .select('quiz_id, quiz_source, lecture_id, bookmark, correct, answer')
      .in('lecture_id', lectureIds)

    if (filter.bookmark !== undefined) {
      query = query.eq('bookmark', filter.bookmark)
    }
    if (filter.correct !== undefined) {
      query = query.eq('correct', filter.correct)
    }

    query = query.order('id', { ascending: true })

    if (options?.limit) {
      const offset = options.offset ?? 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }

    return { data: (data ?? []) as QuizStatusEntry[], error: null }
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

/**
 * 특정 lecture의 모든 instructor quiz status 조회 (보상 판정용)
 */
export async function getAllInstructorQuizStatuses(
  lectureId: string,
): Promise<{ data: QuizStatusEntry[] | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user_quiz_status')
      .select('quiz_id, quiz_source, lecture_id, bookmark, correct, answer')
      .eq('lecture_id', lectureId)
      .eq('quiz_source', 'instructor')

    if (error) {
      if (isJWTExpiredError(error)) {
        await handleJWTExpiration()
        return { data: null, error: new Error('세션이 만료되었습니다.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }

    return { data: (data ?? []) as QuizStatusEntry[], error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) {
      await handleJWTExpiration()
    }
    return {
      data: null,
      error: err instanceof Error ? err : new Error(getErrorMessage(err)),
    }
  }
}

/**
 * quiz_source별 퀴즈 콘텐츠 조회 (instructor / customize)
 */
export async function fetchQuizContent(
  quizIds: string[],
  quizSource: QuizSource,
): Promise<{ data: QuizItem[] | null; error: Error | null }> {
  if (quizIds.length === 0) return { data: [], error: null }

  try {
    const supabase = getSupabaseClient()

    const choiceTable = quizSource === 'instructor'
      ? 'instructor_quiz_choices'
      : 'user_customize_quiz_choices'

    let rawItems: Array<Record<string, unknown>> = []

    if (quizSource === 'instructor') {
      const { data, error: err } = await supabase
        .from('instructor_quiz_items')
        .select('quiz_id, quiz_type, question, answer, explanation, difficulty')
        .in('quiz_id', quizIds)
      if (err) {
        if (isJWTExpiredError(err)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
        return { data: null, error: new Error(getErrorMessage(err)) }
      }
      rawItems = (data ?? []) as Array<Record<string, unknown>>
    } else {
      const { data, error: err } = await supabase
        .from('user_customize_quiz_items')
        .select('quiz_id, quiz_type, question, answer, explanation')
        .in('quiz_id', quizIds)
      if (err) {
        if (isJWTExpiredError(err)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
        return { data: null, error: new Error(getErrorMessage(err)) }
      }
      rawItems = (data ?? []) as Array<Record<string, unknown>>
    }

    if (rawItems.length === 0) return { data: [], error: null }

    const foundIds = rawItems.map(i => i.quiz_id as string)
    const { data: choices, error: choicesError } = await supabase
      .from(choiceTable)
      .select('quiz_id, choice_id, choice_order, choice_text, is_correct, choice_explanation')
      .in('quiz_id', foundIds)
      .order('choice_order', { ascending: true })

    if (choicesError) {
      return { data: null, error: new Error(getErrorMessage(choicesError)) }
    }

    const choiceMap = new Map<string, QuizChoice[]>()
    for (const c of (choices ?? [])) {
      const arr = choiceMap.get(c.quiz_id) ?? []
      arr.push({
        choice_id: c.choice_id,
        choice_order: c.choice_order,
        choice_text: c.choice_text,
        is_correct: c.is_correct,
        choice_explanation: c.choice_explanation,
      })
      choiceMap.set(c.quiz_id, arr)
    }

    const quizItems: QuizItem[] = rawItems.map(item => ({
      quiz_id: item.quiz_id as string,
      quiz_type: item.quiz_type as string,
      question: item.question as string,
      answer: (item.answer as string) ?? null,
      explanation: (item.explanation as string) ?? null,
      quiz_keyword: null,
      difficulty: (item.difficulty as string) ?? null,
      choices: choiceMap.get(item.quiz_id as string) ?? [],
    }))

    return { data: quizItems, error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) {
      await handleJWTExpiration()
    }
    return {
      data: null,
      error: err instanceof Error ? err : new Error(getErrorMessage(err)),
    }
  }
}

/* ───────────── Backend API 호출 ───────────── */

const VALID_QUIZ_SOURCES: QuizSource[] = ['instructor', 'customize']

/** 즐겨찾기 토글 */
export async function toggleBookmark(
  quizSource: QuizSource,
  quizId: string,
  lectureId: string,
  bookmark: boolean,
) {
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<BookmarkResponse>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/bookmark`,
    {
      method: 'PATCH',
      auth: true,
      body: { lecture_id: lectureId, bookmark },
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
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<CorrectResponse>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/correct`,
    {
      method: 'PATCH',
      auth: true,
      body: { lecture_id: lectureId, correct, answer },
    },
  )
}

/** 보상 획득 요청 */
export async function grantReward(lectureId: string) {
  return apiRequest<RewardGrantResponse>(
    `/quiz-status/lectures/${encodeURIComponent(lectureId)}/reward`,
    {
      method: 'POST',
      auth: true,
    },
  )
}
