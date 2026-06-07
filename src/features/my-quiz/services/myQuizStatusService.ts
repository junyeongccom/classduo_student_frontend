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
      // exam_prep_question 은 레거시 단일 4지선다(options/answer/explanation)와
      // 신규 payload형(question_format + payload: 매칭/빈칸/복수선택)이 공존한다.
      // 저장소 카드가 쓰는 통합 모양(choices[] + answer + explanation)으로 양쪽을 어댑트한다.
      interface ExamPrepRow {
        id: string
        stem: string
        options: string[] | null
        answer: string | null
        explanation: Record<string, string> | null
        difficulty: number | null
        question_format: string | null
        payload: Record<string, unknown> | null
        // 영어 번역 — exam_prep_question 에 prod 생성 완료 (stem_eng/options_eng/explanation_eng/payload_eng).
        stem_eng: string | null
        options_eng: string[] | null
        explanation_eng: Record<string, string> | null
        payload_eng: Record<string, unknown> | null
      }
      const { data, error: err } = await supabase
        .from('exam_prep_question')
        .select('id, stem, options, answer, explanation, difficulty, question_format, payload, stem_eng, options_eng, explanation_eng, payload_eng')
        .in('id', quizIds)
      if (err) {
        if (isJWTExpiredError(err)) { await handleJWTExpiration(); return { data: null, error: new Error('세션이 만료되었습니다.') } }
        return { data: null, error: new Error(getErrorMessage(err)) }
      }
      const examRows = (data ?? []) as ExamPrepRow[]

      // explanation dict → 표시 텍스트.
      //   레거시 선지별 키(opt0~optN) 는 "N번: ..." 으로, payload형 단일 키(text/detailed) 는 값만.
      const examExplanationText = (exp: Record<string, string> | null): string | null => {
        if (!exp) return null
        const entries = Object.entries(exp)
        if (entries.length === 0) return null
        if (entries.every(([k]) => /^opt\d+$/.test(k))) {
          return entries
            .map(([k, v]) => `${parseInt(k.slice(3), 10) + 1}번: ${v}`)
            .join('\n')
        }
        return exp.detailed ?? exp.text ?? entries.map(([, v]) => v).join('\n')
      }

      // 한 문항 → choices[](텍스트+정답여부) + 정답 텍스트. 레거시/payload 공통 어댑터.
      // 영어(_eng) 는 한국어와 동일 인덱스/구조(payload_eng.choices, left/right_items, options_eng)이므로
      // 같은 인덱스로 zip 해 choice_text_eng / answer_eng 를 병행 산출. 영어 없으면 null fallback.
      type DerivedChoice = { choice_text: string; is_correct: boolean; choice_text_eng: string | null }
      const deriveExam = (
        r: ExamPrepRow,
      ): { choices: DerivedChoice[]; answer: string | null; answer_eng: string | null } => {
        const qf = r.question_format ?? null
        const p = (r.payload ?? {}) as Record<string, unknown>
        const pe = (r.payload_eng ?? {}) as Record<string, unknown>
        // 매칭 — 정답 연결쌍을 "좌항 → 우항" 행으로 표시 (모두 정답 배지).
        if (qf === 'term_definition_match3') {
          const left = (p.left_items as string[] | undefined) ?? []
          const right = (p.right_items as string[] | undefined) ?? []
          const leftE = (pe.left_items as string[] | undefined) ?? []
          const rightE = (pe.right_items as string[] | undefined) ?? []
          const hasEng = leftE.length > 0 || rightE.length > 0
          const pairs = (p.correct_pairs as [number, number][] | undefined) ?? []
          const choices = pairs.map(([li, ri]) => ({
            choice_text: `${left[li] ?? ''} → ${right[ri] ?? ''}`.trim(),
            is_correct: true,
            choice_text_eng: hasEng ? `${leftE[li] ?? ''} → ${rightE[ri] ?? ''}`.trim() : null,
          }))
          return {
            choices,
            answer: choices.map((c) => c.choice_text).join('\n') || null,
            answer_eng: hasEng
              ? choices.map((c) => c.choice_text_eng ?? '').join('\n') || null
              : null,
          }
        }
        // 선택지형(빈칸/복수/4지) — payload.choices + correct_answer(number | number[]).
        const pChoices = p.choices as string[] | undefined
        if (Array.isArray(pChoices) && pChoices.length > 0) {
          const peChoices = pe.choices as string[] | undefined
          const hasEng = Array.isArray(peChoices) && peChoices.length > 0
          const ca = p.correct_answer
          const correctSet = new Set<number>(
            Array.isArray(ca)
              ? (ca as unknown[]).filter((v): v is number => typeof v === 'number')
              : typeof ca === 'number'
                ? [ca]
                : [],
          )
          const choices = pChoices.map((text, i) => ({
            choice_text: text,
            is_correct: correctSet.has(i),
            choice_text_eng: hasEng ? (peChoices[i] ?? null) : null,
          }))
          const answer = choices.filter((c) => c.is_correct).map((c) => c.choice_text).join(', ') || null
          const answer_eng = hasEng
            ? choices.filter((c) => c.is_correct).map((c) => c.choice_text_eng ?? '').join(', ') || null
            : null
          return { choices, answer, answer_eng }
        }
        // 레거시 단일 4지선다 — options + answer(인덱스 문자열).
        const opts = r.options ?? []
        const optsE = r.options_eng ?? []
        const hasEng = optsE.length > 0
        const correctIdx = r.answer != null && r.answer !== '' ? parseInt(r.answer, 10) : -1
        const choices = opts.map((opt, i) => ({
          choice_text: opt,
          is_correct: i === correctIdx,
          choice_text_eng: hasEng ? (optsE[i] ?? null) : null,
        }))
        return {
          choices,
          answer: correctIdx >= 0 ? (opts[correctIdx] ?? null) : null,
          answer_eng: hasEng && correctIdx >= 0 ? (optsE[correctIdx] ?? null) : null,
        }
      }

      const examDerived = new Map<
        string,
        { choices: DerivedChoice[]; answer: string | null; answer_eng: string | null }
      >()
      for (const r of examRows) examDerived.set(r.id, deriveExam(r))

      rawItems = examRows.map(r => ({
        quiz_id: r.id,
        quiz_type: 'EXAM_PREP',
        question: r.stem,
        answer: examDerived.get(r.id)?.answer ?? null,
        explanation: examExplanationText(r.explanation),
        difficulty: r.difficulty != null ? String(r.difficulty) : null,
        question_eng: r.stem_eng ?? null,
        answer_eng: examDerived.get(r.id)?.answer_eng ?? null,
        explanation_eng: examExplanationText(r.explanation_eng),
      }))
      // exam_prep choices 를 QuizChoice 형태로 직접 만든다 (별도 _choices 테이블 없음).
      // payload형은 선지별 해설을 통합 explanation 텍스트에 담으므로 choice_explanation 은 레거시 opt{i} 만.
      rawChoices = examRows.flatMap(r => {
        const choices = examDerived.get(r.id)?.choices ?? []
        return choices.map((c, i) => ({
          quiz_id: r.id,
          choice_id: `${r.id}:${i}`,
          choice_order: i + 1,
          choice_text: c.choice_text,
          is_correct: c.is_correct,
          choice_explanation: r.explanation?.[`opt${i}`] ?? null,
          choice_text_eng: c.choice_text_eng ?? null,
          choice_explanation_eng: r.explanation_eng?.[`opt${i}`] ?? null,
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
  /** exam_prep 한정 — 테스트 타입 (core/mid/final). 라벨 표시용. */
  exam_prep_test_type?: 'core' | 'mid' | 'final'
  /** exam_prep mid 한정 — 1/2/3. */
  exam_prep_segment_index?: number | null
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
        'exam_prep_question(source_lecture_id, exam_prep_test(test_type, segment_index, lecture_session_id))'
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
        exam_prep_test: {
          test_type: 'core' | 'mid' | 'final' | null
          segment_index: number | null
          lecture_session_id: string | null
        } | null
      } | null
    }

    const lectureSet = new Set(lectureIds)
    const grouped = new Map<string, IncorrectQuizEntry>()

    for (const r of ((data ?? []) as unknown) as EpRow[]) {
      const q = r.exam_prep_question
      if (!q) continue
      // mid/final 은 문항별 source_lecture_id 가 정확한 출처 강의(여러 회차에서 추출).
      // core 는 source_lecture_id 가 보통 null → exam_prep_test.lecture_session_id 로 fallback.
      const lectureId =
        q.source_lecture_id ?? q.exam_prep_test?.lecture_session_id ?? null
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
            exam_prep_test_type: q.exam_prep_test?.test_type ?? undefined,
            exam_prep_segment_index: q.exam_prep_test?.segment_index ?? null,
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
 * 학생 본인의 exam_prep_response 에서 is_correct=false 행 수를 question_id 별로 직접 카운트.
 * exam_prep_mastery.incorrect_count 는 Learning floor 정책으로 누적이 안 되는 케이스가 있어
 * (백엔드 mid_worker 주석 참조) 신뢰할 수 없음 → response 행 수가 SSOT.
 *
 * RLS 가 본인 attempt 의 response 만 노출하므로 별도 user_id 필터 불필요.
 */
export async function fetchExamPrepWrongCounts(
  questionIds: string[],
): Promise<{ data: Map<string, number> | null; error: Error | null }> {
  if (questionIds.length === 0) return { data: new Map(), error: null }
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('exam_prep_response')
      .select('question_id')
      .in('question_id', questionIds)
      .eq('is_correct', false)
    if (error) {
      if (isJWTExpiredError(error)) {
        const ok = await handleJWTExpiration()
        if (!ok) return { data: null, error: new Error('세션이 만료되었습니다.') }
        return { data: null, error: new Error('세션이 갱신되었습니다. 다시 시도해주세요.') }
      }
      return { data: null, error: new Error(getErrorMessage(error)) }
    }
    const map = new Map<string, number>()
    for (const r of ((data ?? []) as Array<{ question_id: string }>)) {
      map.set(r.question_id, (map.get(r.question_id) ?? 0) + 1)
    }
    return { data: map, error: null }
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
