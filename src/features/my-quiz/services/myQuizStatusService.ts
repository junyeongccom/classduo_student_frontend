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
import type { QuizStatusEntry, QuizBookmarkEntry, QuizIncorrectEntry, QuizSource, QuizItem, QuizChoice } from '../types'
import type { StudentQuizType } from '@/shared/components/quiz'

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
 * 특정 lecture의 user_quiz_status 조회 (필터: correct)
 * RLS가 student_id 자동 필터링.
 */
export async function getQuizStatusesByLecture(
  lectureId: string,
  filter: { correct?: boolean },
  options?: { limit?: number; offset?: number },
): Promise<{ data: QuizStatusEntry[] | null; error: Error | null }> {
  try {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('user_quiz_status')
      .select('quiz_id, quiz_source, lecture_id, correct, answer')
      .eq('lecture_id', lectureId)

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
 * 복수 lecture의 user_quiz_status 조회 (필터: correct)
 * RLS가 student_id 자동 필터링.
 */
export async function getQuizStatusesByLectureIds(
  lectureIds: string[],
  filter: { correct?: boolean },
  options?: { limit?: number; offset?: number },
): Promise<{ data: QuizStatusEntry[] | null; error: Error | null }> {
  if (lectureIds.length === 0) return { data: [], error: null }

  try {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('user_quiz_status')
      .select('quiz_id, quiz_source, lecture_id, correct, answer')
      .in('lecture_id', lectureIds)

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
      .select('quiz_id, quiz_source, lecture_id, correct, answer')
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

    const selectChoices =
      'quiz_id, choice_id, choice_order, choice_text, is_correct, choice_explanation, choice_text_eng, choice_explanation_eng' as const

    interface RawItem {
      quiz_id: string
      quiz_type: string
      question: string
      answer: string | null
      explanation: string | null
      difficulty?: string | null
      question_eng?: string | null
      answer_eng?: string | null
      explanation_eng?: string | null
    }

    type RawChoice = {
      quiz_id: string
      choice_id: string
      choice_order: number
      choice_text: string
      is_correct: boolean
      choice_explanation: string | null
      choice_text_eng?: string | null
      choice_explanation_eng?: string | null
    }

    let rawItems: RawItem[] = []
    let rawChoices: RawChoice[] = []

    if (quizSource === 'instructor') {
      const { data, error: err } = await supabase
        .from('instructor_quiz_items')
        .select('quiz_id, quiz_type, question, answer, explanation, difficulty, question_eng, answer_eng, explanation_eng')
        .in('quiz_id', quizIds)
      if (err) {
        if (isJWTExpiredError(err)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
        return { data: null, error: new Error(getErrorMessage(err)) }
      }
      rawItems = (data ?? []) as RawItem[]

      if (rawItems.length > 0) {
        const ids = rawItems.map(i => i.quiz_id)
        const { data: ch, error: chErr } = await supabase
          .from('instructor_quiz_choices')
          .select(selectChoices)
          .in('quiz_id', ids)
          .order('choice_order', { ascending: true })
        if (chErr) return { data: null, error: new Error(getErrorMessage(chErr)) }
        rawChoices = (ch ?? []) as RawChoice[]
      }
    } else if (quizSource === 'content') {
      const { data, error: err } = await supabase
        .from('content_quiz_items')
        .select('quiz_id, quiz_type, question, explanation, difficulty, question_eng, explanation_eng')
        .in('quiz_id', quizIds)
      if (err) {
        if (isJWTExpiredError(err)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
        return { data: null, error: new Error(getErrorMessage(err)) }
      }
      rawItems = ((data ?? []) as Array<Omit<RawItem, 'answer'> & { answer?: null }>).map(d => ({ ...d, answer: null })) as RawItem[]

      if (rawItems.length > 0) {
        const ids = rawItems.map(i => i.quiz_id)
        const { data: ch, error: chErr } = await supabase
          .from('content_quiz_choices')
          .select(selectChoices)
          .in('quiz_id', ids)
          .order('choice_order', { ascending: true })
        if (chErr) return { data: null, error: new Error(getErrorMessage(chErr)) }
        rawChoices = (ch ?? []) as RawChoice[]
      }
    } else {
      const { data, error: err } = await supabase
        .from('user_customize_quiz_items')
        .select('quiz_id, quiz_type, question, answer, explanation, question_eng, answer_eng, explanation_eng')
        .in('quiz_id', quizIds)
      if (err) {
        if (isJWTExpiredError(err)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
        return { data: null, error: new Error(getErrorMessage(err)) }
      }
      rawItems = (data ?? []) as RawItem[]

      if (rawItems.length > 0) {
        const ids = rawItems.map(i => i.quiz_id)
        const { data: ch, error: chErr } = await supabase
          .from('user_customize_quiz_choices')
          .select(selectChoices)
          .in('quiz_id', ids)
          .order('choice_order', { ascending: true })
        if (chErr) return { data: null, error: new Error(getErrorMessage(chErr)) }
        rawChoices = (ch ?? []) as RawChoice[]
      }
    }

    if (rawItems.length === 0) return { data: [], error: null }

    const choiceMap = new Map<string, QuizChoice[]>()
    for (const c of rawChoices) {
      const arr = choiceMap.get(c.quiz_id) ?? []
      arr.push({
        choice_id: c.choice_id,
        choice_order: c.choice_order,
        choice_text: c.choice_text,
        is_correct: c.is_correct,
        choice_explanation: c.choice_explanation ?? null,
        choice_text_eng: c.choice_text_eng ?? null,
        choice_explanation_eng: c.choice_explanation_eng ?? null,
      })
      choiceMap.set(c.quiz_id, arr)
    }

    const quizItems: QuizItem[] = rawItems.map(item => ({
      quiz_id: item.quiz_id,
      quiz_type: item.quiz_type as StudentQuizType,
      question: item.question,
      answer: item.answer ?? null,
      explanation: item.explanation ?? null,
      quiz_keyword: null,
      difficulty: item.difficulty ?? null,
      choices: choiceMap.get(item.quiz_id) ?? [],
      question_eng: item.question_eng ?? null,
      answer_eng: item.answer_eng ?? null,
      explanation_eng: item.explanation_eng ?? null,
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

/* ───────────── 세션 풀이 통계 ───────────── */

export interface SessionSolvingStats {
  answered: number
  correct: number
  total: number
}

/**
 * 복수 세션의 풀이 통계를 일괄 조회.
 * user_customize_quiz_items에서 quiz_id→session_id 매핑 후,
 * user_quiz_status에서 correct 상태를 집계.
 */
export async function getSessionSolvingStats(
  sessionIds: string[],
): Promise<{ data: Map<string, SessionSolvingStats> | null; error: Error | null }> {
  if (sessionIds.length === 0) return { data: new Map(), error: null }

  try {
    const supabase = getSupabaseClient()

    const { data: quizItems, error: itemErr } = await supabase
      .from('user_customize_quiz_items')
      .select('quiz_id, session_id')
      .in('session_id', sessionIds)

    if (itemErr) {
      if (isJWTExpiredError(itemErr)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
      return { data: null, error: new Error(getErrorMessage(itemErr)) }
    }

    if (!quizItems || quizItems.length === 0) {
      const empty = new Map<string, SessionSolvingStats>()
      for (const sid of sessionIds) empty.set(sid, { answered: 0, correct: 0, total: 0 })
      return { data: empty, error: null }
    }

    const quizIds = quizItems.map(q => q.quiz_id)
    const quizToSession = new Map<string, string>()
    for (const q of quizItems) {
      quizToSession.set(q.quiz_id, q.session_id)
    }

    const { data: statuses, error: statusErr } = await supabase
      .from('user_quiz_status')
      .select('quiz_id, correct')
      .eq('quiz_source', 'customize')
      .in('quiz_id', quizIds)

    if (statusErr) {
      if (isJWTExpiredError(statusErr)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
      return { data: null, error: new Error(getErrorMessage(statusErr)) }
    }

    const statusByQuiz = new Map<string, boolean | null>()
    for (const s of (statuses ?? [])) {
      statusByQuiz.set(s.quiz_id, s.correct)
    }

    const result = new Map<string, SessionSolvingStats>()
    for (const sid of sessionIds) {
      result.set(sid, { answered: 0, correct: 0, total: 0 })
    }

    for (const q of quizItems) {
      const stats = result.get(q.session_id)
      if (!stats) continue
      stats.total++
      const correctVal = statusByQuiz.get(q.quiz_id)
      if (correctVal !== undefined && correctVal !== null) {
        stats.answered++
        if (correctVal === true) stats.correct++
      }
    }

    return { data: result, error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) { await handleJWTExpiration() }
    return {
      data: null,
      error: err instanceof Error ? err : new Error(getErrorMessage(err)),
    }
  }
}

/* ───────────── Backend API 호출 ───────────── */

const VALID_QUIZ_SOURCES: QuizSource[] = ['instructor', 'customize', 'content']

/** 즐겨찾기 토글 (추가 시 현재 풀이 상태 복사) */
export async function toggleBookmark(
  quizSource: QuizSource,
  quizId: string,
  lectureId: string,
  bookmark: boolean,
  selectedAnswer?: number | null,
  correct?: boolean | null,
) {
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<BookmarkResponse>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/bookmark`,
    {
      method: 'PATCH',
      auth: true,
      body: { lecture_id: lectureId, bookmark, selected_answer: selectedAnswer ?? null, correct: correct ?? null },
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

/* ── 즐겨찾기 Supabase 조회 ── */

export async function getBookmarksByLectureIds(
  lectureIds: string[],
  options?: { limit?: number; offset?: number },
): Promise<{ data: QuizBookmarkEntry[] | null; error: Error | null }> {
  if (lectureIds.length === 0) return { data: [], error: null }
  try {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('user_quiz_bookmarks')
      .select('id, quiz_id, quiz_source, lecture_id, selected_answer, correct, created_at')
      .in('lecture_id', lectureIds)
      .order('id', { ascending: true })
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
    return { data: (data ?? []) as QuizBookmarkEntry[], error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) { await handleJWTExpiration() }
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/* ── 오답노트 Supabase 조회 ── */

export async function getIncorrectsByLectureIds(
  lectureIds: string[],
  options?: { limit?: number; offset?: number },
): Promise<{ data: QuizIncorrectEntry[] | null; error: Error | null }> {
  if (lectureIds.length === 0) return { data: [], error: null }
  try {
    const supabase = getSupabaseClient()
    let query = supabase
      .from('user_quiz_incorrect')
      .select('id, quiz_id, quiz_source, lecture_id, original_answer, retry_answer, retry_correct, created_at')
      .in('lecture_id', lectureIds)
      .order('id', { ascending: true })
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
    return { data: (data ?? []) as QuizIncorrectEntry[], error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) { await handleJWTExpiration() }
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/* ── 오답노트 Backend API ── */

/** 오답노트에서 제거 */
export async function dismissIncorrect(quizSource: QuizSource, quizId: string) {
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<{ quiz_source: string; quiz_id: string; removed: boolean }>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/incorrect`,
    { method: 'DELETE', auth: true },
  )
}

/** 오답노트 다시풀기 */
export async function retryIncorrect(
  quizSource: QuizSource,
  quizId: string,
  retryAnswer: number | null,
  retryCorrect: boolean | null,
) {
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<{ quiz_source: string; quiz_id: string; retry_answer: number | null; retry_correct: boolean | null }>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/incorrect/retry`,
    { method: 'PATCH', auth: true, body: { retry_answer: retryAnswer, retry_correct: retryCorrect } },
  )
}

/** 오답노트 다시풀기 초기화 */
export async function resetRetryIncorrect(quizSource: QuizSource, quizId: string) {
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<{ quiz_source: string; quiz_id: string; retry_answer: null; retry_correct: null }>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/incorrect/reset`,
    { method: 'PATCH', auth: true },
  )
}

/** 즐겨찾기 내 독립 풀이 결과 업데이트 */
export async function updateBookmarkAnswer(
  quizSource: QuizSource,
  quizId: string,
  selectedAnswer: number | null,
  correct: boolean | null,
) {
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<{ quiz_source: string; quiz_id: string; selected_answer: number | null; correct: boolean | null }>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/bookmark/answer`,
    { method: 'PATCH', auth: true, body: { selected_answer: selectedAnswer, correct } },
  )
}

/** 즐겨찾기 내 풀이 초기화 */
export async function resetBookmarkAnswer(quizSource: QuizSource, quizId: string) {
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<{ quiz_source: string; quiz_id: string; selected_answer: null; correct: null }>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/bookmark/reset`,
    { method: 'PATCH', auth: true },
  )
}
