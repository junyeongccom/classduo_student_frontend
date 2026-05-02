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
import type { QuizStatusEntry, QuizBookmarkEntry, QuizSource, QuizItem, QuizChoice } from '../types'
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
 * user_quiz_response 누적 행을 (quiz_source, quiz_id) 별 가장 최근 created_at 1행으로 reduce.
 * 기존 user_quiz_status (UPSERT 1행) 와 동일한 QuizStatusEntry 형태를 만들어 호출처 시그니처 보존.
 */
type UqrRow = {
  quiz_id: string
  quiz_source: string
  lecture_id: string
  selected_answer: number | null
  is_correct: boolean | null
  created_at: string
}

function reduceLatestPerQuiz(rows: UqrRow[]): QuizStatusEntry[] {
  const latestByKey = new Map<string, UqrRow>()
  for (const r of rows) {
    const key = `${r.quiz_source}:${r.quiz_id}`
    const prev = latestByKey.get(key)
    if (!prev || prev.created_at < r.created_at) latestByKey.set(key, r)
  }
  return Array.from(latestByKey.values()).map(r => ({
    quiz_id: r.quiz_id,
    quiz_source: r.quiz_source as QuizSource,
    lecture_id: r.lecture_id,
    correct: r.is_correct,
    answer: r.selected_answer,
  }))
}

/**
 * 특정 lecture의 풀이 상태 조회 (필터: correct).
 * user_quiz_response 누적 행을 quiz 별 latest 1행으로 reduce 후 반환 — 시그니처 보존.
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
      .from('user_quiz_response')
      .select('quiz_id, quiz_source, lecture_id, selected_answer, is_correct, created_at')
      .eq('lecture_id', lectureId)
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

    const reduced = reduceLatestPerQuiz((data ?? []) as UqrRow[])
    const filtered = filter.correct === undefined
      ? reduced
      : reduced.filter(s => s.correct === filter.correct)
    return { data: filtered, error: null }
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
 * 복수 lecture의 풀이 상태 조회 (필터: correct).
 * user_quiz_response 누적 행을 quiz 별 latest 1행으로 reduce 후 반환.
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
      .from('user_quiz_response')
      .select('quiz_id, quiz_source, lecture_id, selected_answer, is_correct, created_at')
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

    const reduced = reduceLatestPerQuiz((data ?? []) as UqrRow[])
    const filtered = filter.correct === undefined
      ? reduced
      : reduced.filter(s => s.correct === filter.correct)
    return { data: filtered, error: null }
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
    } else if (quizSource === 'exam_prep') {
      // exam_prep_question 은 별도 스키마 — quiz_type/explanation/choices 컬럼이 없으므로
      // 응답을 통합 QuizItem 모양으로 어댑트한다 (quiz_type='EXAM_PREP', choices 는 options 배열 변환).
      interface ExamPrepRow {
        id: string
        stem: string
        options: string[] | null
        answer: string | null
        explanation: Record<string, string> | null
        difficulty: number | null
      }
      const { data, error: err } = await supabase
        .from('exam_prep_question')
        .select('id, stem, options, answer, explanation, difficulty')
        .in('id', quizIds)
      if (err) {
        if (isJWTExpiredError(err)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
        return { data: null, error: new Error(getErrorMessage(err)) }
      }
      const examRows = (data ?? []) as ExamPrepRow[]
      rawItems = examRows.map(r => ({
        quiz_id: r.id,
        quiz_type: 'EXAM_PREP',
        question: r.stem,
        // 0-based answer index → options 배열에서 정답 텍스트 추출 (주관식 표시용)
        answer: r.answer != null && r.options ? (r.options[parseInt(r.answer, 10)] ?? null) : null,
        // explanation dict (opt0/opt1/opt2/opt3) 를 사람이 읽을 수 있는 한 덩어리로.
        //   "opt0:" → "1번:" 형식으로 변환 (인덱스 1-based 표기).
        explanation: r.explanation
          ? Object.entries(r.explanation)
              .map(([k, v]) => {
                const m = /^opt(\d+)$/.exec(k)
                return m
                  ? `${parseInt(m[1], 10) + 1}번: ${v}`
                  : `${k}: ${v}`
              })
              .join('\n')
          : null,
        difficulty: r.difficulty != null ? String(r.difficulty) : null,
      }))
      // exam_prep options[]를 QuizChoice 형태로 직접 만든다 (별도 _choices 테이블 없음).
      // choice_explanation 은 explanation.opt{i} 에서 추출 (DB 키는 opt0~opt3, 언더스코어 없음).
      rawChoices = examRows.flatMap(r => {
        const opts = r.options ?? []
        const correctIdx = r.answer != null ? parseInt(r.answer, 10) : -1
        return opts.map((opt, i) => ({
          quiz_id: r.id,
          choice_id: `${r.id}:${i}`,
          choice_order: i + 1,
          choice_text: opt,
          is_correct: i === correctIdx,
          choice_explanation: r.explanation?.[`opt${i}`] ?? null,
        }))
      })
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

    // user_quiz_response 누적 행을 created_at 오름차순으로 받고
    // quiz_id 키로 덮어쓰면 최종적으로 latest 응답이 남는다.
    const { data: rawResponses, error: statusErr } = await supabase
      .from('user_quiz_response')
      .select('quiz_id, is_correct, created_at')
      .eq('quiz_source', 'customize')
      .in('quiz_id', quizIds)
      .order('created_at', { ascending: true })

    if (statusErr) {
      if (isJWTExpiredError(statusErr)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
      return { data: null, error: new Error(getErrorMessage(statusErr)) }
    }

    const statusByQuiz = new Map<string, boolean | null>()
    for (const r of (rawResponses ?? [])) {
      statusByQuiz.set(r.quiz_id, r.is_correct)
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

const VALID_QUIZ_SOURCES: QuizSource[] = ['instructor', 'customize', 'content', 'exam_prep']

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
  durationMs?: number | null,
) {
  if (!VALID_QUIZ_SOURCES.includes(quizSource)) {
    return { data: null, error: new Error('Invalid quiz source'), status: 400 }
  }
  return apiRequest<CorrectResponse>(
    `/quiz-status/${encodeURIComponent(quizSource)}/${encodeURIComponent(quizId)}/correct`,
    {
      method: 'PATCH',
      auth: true,
      body: { lecture_id: lectureId, correct, answer, duration_ms: durationMs ?? null },
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

/**
 * 오답 노트용 — 학생 본인이 한 번이라도 is_correct=false 로 응답한 (quiz_source, quiz_id, lecture_id) 묶음.
 * dismiss 폐지 정책 (2026-05-01) — 한 번이라도 틀린 문제는 영구 보존.
 *
 * 반환 행은 첫 오답 created_at 오름차순 (기존 user_quiz_incorrect.created_at 정렬과 동일 UX).
 * 같은 quiz 가 여러 번 틀렸어도 한 묶음 1행만 반환 (DISTINCT).
 */
export interface IncorrectQuizEntry {
  quiz_source: QuizSource
  quiz_id: string
  lecture_id: string
  /** 첫 오답 created_at — 오답 노트 정렬 기준 */
  first_wrong_at: string
  /** 마지막 오답 created_at — last_activity 산출용 */
  last_wrong_at: string
  /** 가장 최근 응답의 selected_answer */
  latest_selected_answer: number | null
  /** 가장 최근 응답의 is_correct */
  latest_is_correct: boolean | null
}

export async function fetchIncorrectQuizIdsByLectureIds(
  lectureIds: string[],
): Promise<{ data: IncorrectQuizEntry[] | null; error: Error | null }> {
  if (lectureIds.length === 0) return { data: [], error: null }
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user_quiz_response')
      .select('quiz_source, quiz_id, lecture_id, selected_answer, is_correct, created_at')
      .in('lecture_id', lectureIds)
      .order('created_at', { ascending: true })
    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }
    // 같은 (quiz_source, quiz_id) 의 행을 묶어 first_wrong_at / last_wrong_at / latest 응답 산출.
    // created_at 오름차순이라: 첫 false → first_wrong_at, 마지막 false → last_wrong_at, 마지막 행 → latest 응답.
    const grouped = new Map<string, IncorrectQuizEntry>()
    for (const r of (data ?? []) as UqrRow[]) {
      const key = `${r.quiz_source}:${r.quiz_id}`
      const existing = grouped.get(key)
      if (!existing) {
        if (r.is_correct === false) {
          grouped.set(key, {
            quiz_source: r.quiz_source as QuizSource,
            quiz_id: r.quiz_id,
            lecture_id: r.lecture_id,
            first_wrong_at: r.created_at,
            last_wrong_at: r.created_at,
            latest_selected_answer: r.selected_answer,
            latest_is_correct: r.is_correct,
          })
        }
        // is_correct=true 가 먼저 오면 묶음 미생성 — 다음 false 가 오면 그때 first_wrong_at 결정
        continue
      }
      // 이미 묶음 있음 — false 행이면 last_wrong_at 갱신, 모든 행에서 latest 응답 갱신
      if (r.is_correct === false) {
        existing.last_wrong_at = r.created_at
      }
      existing.latest_selected_answer = r.selected_answer
      existing.latest_is_correct = r.is_correct
    }
    return { data: Array.from(grouped.values()), error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) { await handleJWTExpiration() }
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * 학생 본인의 exam_prep 오답 일괄 조회 (own RLS 자동 적용).
 * exam_prep 응답은 exam_prep_response (별도 테이블) 에 저장되므로
 * fetchIncorrectQuizIdsByLectureIds (user_quiz_response 전용) 와 별개로 fetch + merge 한다.
 *
 * lecture_id 결정:
 *   - core: exam_prep_test.lecture_session_id
 *   - mid/final: exam_prep_question.source_lecture_id (core 출처 lecture)
 *
 * lecture_id 가 lectureIds 에 없으면 결과에서 제외 (수강 중 강좌 범위 필터).
 */
export async function fetchExamPrepIncorrectsByLectureIds(
  lectureIds: string[],
): Promise<{ data: IncorrectQuizEntry[] | null; error: Error | null }> {
  if (lectureIds.length === 0) return { data: [], error: null }
  try {
    const supabase = getSupabaseClient()
    // 천준영 본인 attempt 만 RLS 통과 — service_role 아님. 본인 user_id 자동 필터.
    const { data, error } = await supabase
      .from('exam_prep_response')
      .select(
        'question_id, selected, is_correct, answered_at, ' +
        'exam_prep_question(source_lecture_id, exam_prep_test(lecture_session_id))'
      )
      .order('answered_at', { ascending: true })
    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }

    interface EpRow {
      question_id: string
      selected: string | null
      is_correct: boolean | null
      answered_at: string
      exam_prep_question: {
        source_lecture_id: string | null
        exam_prep_test: { lecture_session_id: string | null } | null
      } | null
    }

    const lectureSet = new Set(lectureIds)
    const grouped = new Map<string, IncorrectQuizEntry>()

    for (const r of ((data ?? []) as unknown) as EpRow[]) {
      const q = r.exam_prep_question
      if (!q) continue
      const lectureId =
        q.exam_prep_test?.lecture_session_id ?? q.source_lecture_id ?? null
      if (!lectureId || !lectureSet.has(lectureId)) continue

      const key = `exam_prep:${r.question_id}`
      const selectedNum =
        r.selected != null && r.selected !== '' ? parseInt(r.selected, 10) : null
      const existing = grouped.get(key)
      if (!existing) {
        if (r.is_correct === false) {
          grouped.set(key, {
            quiz_source: 'exam_prep' as QuizSource,
            quiz_id: r.question_id,
            lecture_id: lectureId,
            first_wrong_at: r.answered_at,
            last_wrong_at: r.answered_at,
            latest_selected_answer:
              selectedNum != null && !Number.isNaN(selectedNum) ? selectedNum + 1 : null,
            latest_is_correct: r.is_correct,
          })
        }
        continue
      }
      if (r.is_correct === false) {
        existing.last_wrong_at = r.answered_at
      }
      existing.latest_selected_answer =
        selectedNum != null && !Number.isNaN(selectedNum) ? selectedNum + 1 : null
      existing.latest_is_correct = r.is_correct
    }
    return { data: Array.from(grouped.values()), error: null }
  } catch (err) {
    if (isJWTExpiredError(err)) { await handleJWTExpiration() }
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/* ── 누적 정/오답 카운트 Supabase 직접 집계 ── */

/**
 * 학생 본인의 user_quiz_response 누적 응답 일괄 조회 (own RLS 자동 적용).
 * content / customize 출처 누적 정/오답 카운트 산출용 — 매 풀이 시도 1행 = 1 카운트.
 * exam_prep 는 user_quiz_response 에 안 들어가므로 fetchExamPrepMasteryCounts 사용.
 */
export async function fetchQuizResponsesByLectureIds(
  lectureIds: string[],
): Promise<{
  data: Array<{ quiz_source: QuizSource; quiz_id: string; correct: boolean | null }> | null
  error: Error | null
}> {
  if (lectureIds.length === 0) return { data: [], error: null }
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('user_quiz_response')
      .select('quiz_source, quiz_id, is_correct')
      .in('lecture_id', lectureIds)
    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }
    return {
      data: ((data ?? []) as Array<{
        quiz_source: QuizSource
        quiz_id: string
        is_correct: boolean | null
      }>).map(r => ({ quiz_source: r.quiz_source, quiz_id: r.quiz_id, correct: r.is_correct })),
      error: null,
    }
  } catch (err) {
    if (isJWTExpiredError(err)) { await handleJWTExpiration() }
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
}

/**
 * 학생 본인의 exam_prep_mastery 누적 카운트 조회 (own RLS 자동 적용).
 * exam_prep 는 mastery.correct_count / incorrect_count 가 SSOT.
 */
export async function fetchExamPrepMasteryCounts(
  questionIds: string[],
): Promise<{
  data: Array<{ question_id: string; correct_count: number; incorrect_count: number }> | null
  error: Error | null
}> {
  if (questionIds.length === 0) return { data: [], error: null }
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('exam_prep_mastery')
      .select('question_id, correct_count, incorrect_count')
      .in('question_id', questionIds)
    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }
    return {
      data: (data ?? []) as Array<{
        question_id: string
        correct_count: number
        incorrect_count: number
      }>,
      error: null,
    }
  } catch (err) {
    if (isJWTExpiredError(err)) { await handleJWTExpiration() }
    return { data: null, error: err instanceof Error ? err : new Error(getErrorMessage(err)) }
  }
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
