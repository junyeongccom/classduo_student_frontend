/**
 * @file ExamModeContainer.tsx
 * @description 오답노트 시험 모드 — 회차/범위 선택 → 무작위 순차 풀이(정답 숨김) → 결과(점수·시간·회차별 정오)
 * @module features/my-quiz/components/exam-mode
 * @dependencies useQuizStorage(QuizStorageItem), buildExamSet, quizStatusService.updateCorrect, MarkdownMessage
 */
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  Settings2,
  Trophy,
  X,
} from 'lucide-react'
import type { QuizStorageItem } from '../../hooks/useQuizStorage'
import { updateCorrect } from '@/features/lecture-study/services/quizStatusService'
import { MarkdownMessage } from '@/features/ai-tutor/components/ui/MarkdownMessage'
import {
  deriveLectureOptions,
  estimateMinutes,
  selectExamItems,
  shuffle,
  type ExamSetOptions,
} from '../../domain/buildExamSet'
import {
  gradePayloadResponse,
  isSupportedPayloadFormat,
} from '../../domain/gradePayloadAnswer'
// 핵심주제학습(exam_prep) 특수 유형 풀이 폼 재사용 — 시험모드에서 유형별 UI/채점 정합.
import { Mcq4SingleForm } from '@/features/exam-prep-final/components/ui/forms/Mcq4SingleForm'
import { Mcq6MultiForm } from '@/features/exam-prep-final/components/ui/forms/Mcq6MultiForm'
import { FillBlank5SingleForm } from '@/features/exam-prep-final/components/ui/forms/FillBlank5SingleForm'
import { FillBlank7MultiForm } from '@/features/exam-prep-final/components/ui/forms/FillBlank7MultiForm'
import { MatchForm } from '@/features/exam-prep-final/components/ui/forms/MatchForm'
import type { QuizFormResult } from '@/features/exam-prep-final/components/ui/forms/types'

type Translate = (key: string, values?: Record<string, string | number>) => string

type Phase = 'setup' | 'running' | 'result'

interface AnswerRecord {
  item: QuizStorageItem
  /** 레거시 단일 4지선다 — 1-based choice_order (미선택 시 null). 특수 유형이면 null. */
  selectedOrder: number | null
  /**
   * exam_prep 특수 유형 응답 (polymorphic). 단일선택 유형이면 undefined.
   *  - mcq4 / fill_blank5_single → number
   *  - mcq6_multi               → number[]
   *  - fill_blank7_multi        → (number|null)[]
   *  - match                    → [number, number][]
   */
  payloadResponse?: unknown
  isCorrect: boolean
  durationMs: number
}

/** 시험모드에서 핵심주제학습 폼으로 풀 특수 유형인지 (exam_prep + 지원 question_format). */
function isPayloadItem(it: QuizStorageItem): boolean {
  return it.quiz_source === 'exam_prep' && isSupportedPayloadFormat(it.question_format)
}

/** 유형별 응답이 제출 가능한 상태인지 (다음/제출 버튼 활성 판정). */
function isPayloadResponseReady(
  questionFormat: string | null | undefined,
  payload: Record<string, unknown> | null | undefined,
  response: unknown,
): boolean {
  if (!questionFormat) return false
  switch (questionFormat) {
    case 'term_definition_match3': {
      const left = Array.isArray(payload?.left_items) ? (payload!.left_items as unknown[]).length : 3
      return Array.isArray(response) && response.length >= left
    }
    case 'category_fill_blank7_multi':
      return (
        Array.isArray(response) &&
        response.length >= 2 &&
        response.every((v) => typeof v === 'number')
      )
    case 'description_mcq6_multi':
      return Array.isArray(response) && response.length === 2
    default: // 단수 객관식 / 단일 빈칸
      return typeof response === 'number'
  }
}

/** payload(한/영) — locale 에 따라 영문 payload 우선. choices/left_items 등 텍스트만 영문, 인덱스 동일. */
function payloadForLocale(
  it: QuizStorageItem,
  locale: string,
): Record<string, unknown> {
  const ko = (it.payload ?? {}) as Record<string, unknown>
  const en = (it.payload_eng ?? {}) as Record<string, unknown>
  if (locale === 'en' && Object.keys(en).length > 0) {
    // 텍스트(choices/left_items/right_items)는 영문, 정답 인덱스(correct_answer/correct_pairs)는 KO 보존.
    return { ...ko, ...en, correct_answer: ko.correct_answer, correct_pairs: ko.correct_pairs }
  }
  return ko
}

/** payload 정답을 폼 result.correct_answer 형태로 변환 (리뷰 하이라이트용). */
function payloadCorrectAnswer(
  it: QuizStorageItem,
): number | number[] | [number, number][] | null {
  const p = (it.payload ?? {}) as Record<string, unknown>
  if (it.question_format === 'term_definition_match3') {
    return (p.correct_pairs as [number, number][] | undefined) ?? null
  }
  const ca = p.correct_answer
  if (typeof ca === 'number') return ca
  if (Array.isArray(ca)) {
    const nums = ca.filter((x): x is number => typeof x === 'number')
    // 단수 빈칸(fill_blank5_single)도 백엔드가 [n] 으로 줄 수 있어 단일이면 number 로 평탄화.
    if (it.question_format === 'category_fill_blank5_single' && nums.length === 1) return nums[0]
    return nums
  }
  return null
}

function qText(it: QuizStorageItem, locale: string): string {
  return locale === 'en' && it.question_eng ? it.question_eng : it.question
}
function eText(it: QuizStorageItem, locale: string): string | null {
  return locale === 'en' && it.explanation_eng ? it.explanation_eng : it.explanation
}
function cText(
  c: QuizStorageItem['choices'][number],
  locale: string,
): string {
  return locale === 'en' && c.choice_text_eng ? c.choice_text_eng : c.choice_text
}
/** 선지별 해설 (content/customize) — locale 우선. */
function cExpl(
  c: QuizStorageItem['choices'][number],
  locale: string,
): string | null {
  return locale === 'en' && c.choice_explanation_eng
    ? c.choice_explanation_eng
    : c.choice_explanation
}
function sortedChoices(it: QuizStorageItem) {
  return [...it.choices].sort((a, b) => a.choice_order - b.choice_order)
}
function lectureLabel(t: Translate, lectureNo: number): string {
  return t('landing.lectureWeek', { no: lectureNo })
}
function formatDuration(ms: number, t: Translate): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return t('examMode.duration', { m, s: s.toString().padStart(2, '0') })
}

/**
 * 시험모드 출처 배지 — "출처 종류 + 회차/강의". 핵심주제학습(exam_prep)은 useQuizStorage 에서
 * 이미 "핵심주제학습 N회차" 등으로 lecture_name 에 가공돼 들어오므로 그대로 쓰고,
 * 회차별 학습(content)·내가 만든 퀴즈(customize)는 출처 종류를 앞에 붙여 출처를 명시한다.
 */
function sourceLabel(t: Translate, item: QuizStorageItem): string {
  const detail = item.lecture_name ?? ''
  switch (item.quiz_source) {
    case 'exam_prep':
      return detail || t('storage.sourceLabels.examPrep')
    case 'customize': {
      const src = t('storage.sourceLabels.customize')
      return detail ? `${src} ${detail}` : src
    }
    case 'content': {
      const src = t('storage.sourceLabels.lectureContent')
      return detail ? `${src} ${detail}` : src
    }
    default:
      return detail
  }
}

/** 선지 번호(1-based) → 폼 라벨. exam_prep 폼은 A,B,C…(String.fromCharCode), legacy 리스트는 숫자. */
function letterLabel(n: number): string {
  return n >= 1 && n <= 26 ? String.fromCharCode(64 + n) : String(n)
}
function numberLabel(n: number): string {
  return String(n)
}

/**
 * "1: … 2: … 3: …" 처럼 선지 번호로 나열된 해설을 번호마다 단락으로 끊어 가독성 개선.
 * 번호는 원본 선지 순서를 가리키므로 toLabel 로 화면 선지 라벨(exam_prep=A,B,C / 그 외=숫자)에 맞추고,
 * 마크다운 단락 구분(\n\n)만 삽입한다.
 * 콜론 뒤 공백이 없는 "3:30"(시간)·"4:1"(비율) 등은 매칭되지 않으며, 번호 나열이 아닌 일반 해설은 그대로 둔다.
 */
function formatNumberedExplanation(
  text: string,
  toLabel: (n: number) => string,
): string {
  const out = text.replace(
    /\s*(\d{1,2}):[ \t]+/g,
    (_m, d: string) => `\n\n**${toLabel(Number(d))}:** `,
  )
  return out.replace(/^\s+/, '').trim()
}

/**
 * exam_prep 특수 유형 풀이/리뷰 폼 디스패처 — 핵심주제학습 폼을 mobile(fluid px) 레이아웃으로 재사용.
 * 시험모드 컬럼(max-w-3xl)은 1920 캔버스가 아니므로 cqw 의존이 없는 mobile 레이아웃이 적합.
 *  - result=null → 풀이 중(정답 숨김). result 제공 → 리뷰(정/오답 하이라이트).
 */
function PayloadFormView({
  item,
  locale,
  value,
  onChange,
  result,
}: {
  item: QuizStorageItem
  locale: string
  value: unknown
  onChange: (v: unknown) => void
  result: QuizFormResult | null
}) {
  const qf = item.question_format ?? null
  const p = payloadForLocale(item, locale)
  const stem = locale === 'en' && item.question_eng ? item.question_eng : item.question
  const choices = (p.choices as string[] | undefined) ?? []
  const disabled = result !== null

  switch (qf) {
    case 'term_definition_match3':
      return (
        <MatchForm
          mobile
          questionText={stem}
          leftItems={(p.left_items as string[] | undefined) ?? []}
          rightItems={(p.right_items as string[] | undefined) ?? []}
          value={(value as [number, number][] | null) ?? null}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          result={result}
        />
      )
    case 'category_fill_blank5_single':
      return (
        <FillBlank5SingleForm
          mobile
          questionText={stem}
          choices={choices}
          value={(value as number | null) ?? null}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          result={result}
        />
      )
    case 'category_fill_blank7_multi':
      return (
        <FillBlank7MultiForm
          mobile
          questionText={stem}
          choices={choices}
          value={(value as (number | null)[] | null) ?? null}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          result={result}
        />
      )
    case 'description_mcq6_multi':
      return (
        <Mcq6MultiForm
          mobile
          questionText={stem}
          choices={choices}
          value={(value as number[] | null) ?? null}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          result={result}
        />
      )
    // compare_contrast_mcq4 / reason_purpose_mcq4 / description_mcq4_single
    default:
      return (
        <Mcq4SingleForm
          mobile
          questionText={stem}
          choices={choices}
          value={(value as number | null) ?? null}
          onChange={(v) => onChange(v)}
          disabled={disabled}
          result={result}
        />
      )
  }
}

export default function ExamModeContainer({
  items,
  locale,
  onClose,
}: {
  items: QuizStorageItem[]
  locale: string
  onClose: () => void
}) {
  const t = useTranslations('myQuiz')
  const [phase, setPhase] = useState<Phase>('setup')

  // ── 설정 상태 ──
  const lectureOptions = useMemo(() => deriveLectureOptions(items), [items])
  const [selectedLectures, setSelectedLectures] = useState<number[]>([]) // 빈 배열 = 전체
  const [includeWrong, setIncludeWrong] = useState(true)
  const [includeFav, setIncludeFav] = useState(false)

  const opts: ExamSetOptions = {
    lectureNos: selectedLectures,
    includeWrong,
    includeFav,
  }
  const previewItems = useMemo(
    () => selectExamItems(items, opts),
    [items, selectedLectures, includeWrong, includeFav],
  )

  // ── 풀이 상태 ──
  const [examSet, setExamSet] = useState<QuizStorageItem[]>([])
  const [index, setIndex] = useState(0)
  // 인덱스별 답안 (앞뒤 이동·재선택 지원). null = 미응답.
  const [answers, setAnswers] = useState<(AnswerRecord | null)[]>([])
  const selectedOrder = answers[index]?.selectedOrder ?? null
  // 특수 유형 응답값 (polymorphic) — 폼 value 로 전달. 미응답이면 null.
  const payloadResponse = answers[index]?.payloadResponse ?? null
  const questionStartRef = useRef<number>(0)
  const startedAtRef = useRef<number>(0)
  const finishedAtRef = useRef<number>(0)

  // 시험 중 이탈 경고 (풀이 단계에서만 — 제출 전 기록 미저장)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const handleCloseClick = () => {
    if (phase === 'running') setShowExitConfirm(true)
    else onClose()
  }
  // 브라우저 새로고침/탭닫기 경고 (풀이 중에만)
  useEffect(() => {
    if (phase !== 'running') return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [phase])

  const startRun = (set: QuizStorageItem[]) => {
    setExamSet(set)
    setIndex(0)
    setAnswers(new Array(set.length).fill(null))
    const now = Date.now()
    startedAtRef.current = now
    questionStartRef.current = now
    setPhase('running')
  }

  const handleStart = () => {
    if (previewItems.length === 0) return
    startRun(shuffle(previewItems))
  }

  const finish = (finalAnswers: AnswerRecord[]) => {
    finishedAtRef.current = Date.now()
    // 모든 재풀이 결과를 incorrect 로그로 기록 (fire-and-forget, 실패 silent).
    for (const a of finalAnswers) {
      if (!a.item.lecture_id) continue
      updateCorrect(
        'incorrect',
        a.item.quiz_id,
        a.item.lecture_id,
        a.isCorrect,
        a.selectedOrder ?? null,
        a.durationMs,
      ).catch(() => {})
    }
    setPhase('result')
  }

  // 선택 즉시 해당 인덱스에 기록 (재선택 시 덮어씀). 레거시 단일 4지선다.
  const handleSelect = (order: number) => {
    const cur = examSet[index]
    const chosen = cur.choices.find((c) => c.choice_order === order)
    setAnswers((prev) => {
      const next = [...prev]
      next[index] = {
        item: cur,
        selectedOrder: order,
        isCorrect: chosen?.is_correct ?? false,
        durationMs: Date.now() - questionStartRef.current,
      }
      return next
    })
  }

  // exam_prep 특수 유형 응답 변경 — 매 변경마다 클라이언트 채점하여 기록(재선택 시 덮어씀).
  // 정/오답은 payload 의 correct_answer/correct_pairs 로 핵심주제학습과 동일하게 판정.
  const handlePayloadChange = (value: unknown) => {
    const cur = examSet[index]
    const payload = (cur.payload ?? {}) as Record<string, unknown>
    const ready = isPayloadResponseReady(cur.question_format, payload, value)
    const isCorrect = ready
      ? gradePayloadResponse(cur.question_format, payload, value)
      : false
    setAnswers((prev) => {
      const next = [...prev]
      next[index] = {
        item: cur,
        selectedOrder: null,
        payloadResponse: value,
        isCorrect,
        durationMs: Date.now() - questionStartRef.current,
      }
      return next
    })
  }

  const handlePrev = () => {
    if (index > 0) setIndex(index - 1)
  }

  // 현재 문항 응답이 다음으로 넘어갈 준비가 됐는지.
  //  - 레거시: 선택만 있으면 됨.
  //  - 특수 유형: 유형별 완성 조건(매칭 전부 연결 / 복수 2개 / 빈칸 다 채움)을 만족해야 함.
  const currentAnswerReady = (() => {
    const cur = examSet[index]
    const rec = answers[index]
    if (!cur || rec == null) return false
    if (isPayloadItem(cur)) {
      return isPayloadResponseReady(
        cur.question_format,
        (cur.payload ?? {}) as Record<string, unknown>,
        rec.payloadResponse,
      )
    }
    return rec.selectedOrder != null
  })()

  const handleNext = () => {
    if (!currentAnswerReady) return
    if (index + 1 < examSet.length) setIndex(index + 1)
    else finish(answers.filter((a): a is AnswerRecord => a != null))
  }

  // 문제 이동 시 해당 문제 소요시간 타이머 리셋 (풀이 중에만).
  useEffect(() => {
    if (phase === 'running') questionStartRef.current = Date.now()
  }, [index, phase])

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950">
      {/* 상단 바 */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900 md:px-8">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
          <Trophy className="h-4 w-4 text-[#6366F1]" />
          {t('examMode.title')}
        </div>
        <button
          onClick={handleCloseClick}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          aria-label={t('examMode.close')}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8">
        {phase === 'setup' && (
          <SetupPhase
            t={t}
            lectureOptions={lectureOptions}
            selectedLectures={selectedLectures}
            setSelectedLectures={setSelectedLectures}
            includeWrong={includeWrong}
            setIncludeWrong={setIncludeWrong}
            includeFav={includeFav}
            setIncludeFav={setIncludeFav}
            previewCount={previewItems.length}
            onStart={handleStart}
          />
        )}

        {phase === 'running' && examSet.length > 0 && (
          <RunPhase
            t={t}
            item={examSet[index]}
            index={index}
            total={examSet.length}
            locale={locale}
            selectedOrder={selectedOrder}
            payloadResponse={payloadResponse}
            canAdvance={currentAnswerReady}
            onSelect={handleSelect}
            onPayloadChange={handlePayloadChange}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        )}

        {phase === 'result' && (
          <ResultPhase
            t={t}
            answers={answers.filter((a): a is AnswerRecord => a != null)}
            locale={locale}
            elapsedMs={finishedAtRef.current - startedAtRef.current}
            onRetry={() => startRun(shuffle(examSet))}
            onReconfigure={() => setPhase('setup')}
            onClose={onClose}
          />
        )}
      </div>

      {showExitConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              {t('examMode.exitTitle')}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t('examMode.exitDesc')}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                {t('examMode.exitContinue')}
              </button>
              <button
                onClick={onClose}
                className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600"
              >
                {t('examMode.exitLeave')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================ 설정 ============================ */

function SetupPhase({
  t,
  lectureOptions,
  selectedLectures,
  setSelectedLectures,
  includeWrong,
  setIncludeWrong,
  includeFav,
  setIncludeFav,
  previewCount,
  onStart,
}: {
  t: Translate
  lectureOptions: ReturnType<typeof deriveLectureOptions>
  selectedLectures: number[]
  setSelectedLectures: React.Dispatch<React.SetStateAction<number[]>>
  includeWrong: boolean
  setIncludeWrong: (v: boolean) => void
  includeFav: boolean
  setIncludeFav: (v: boolean) => void
  previewCount: number
  onStart: () => void
}) {
  const noScope = !includeWrong && !includeFav
  const canStart = previewCount > 0 && !noScope

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-gray-50">
          {t('examMode.setupTitle')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('examMode.setupDesc')}
        </p>
      </div>

      {/* 범위 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('examMode.scope')}
        </p>
        <div className="flex flex-wrap gap-2">
          <ScopeToggle
            active={includeWrong}
            onClick={() => setIncludeWrong(!includeWrong)}
            label={t('examMode.scopeWrong')}
            tone="orange"
          />
          <ScopeToggle
            active={includeFav}
            onClick={() => setIncludeFav(!includeFav)}
            label={t('examMode.scopeFav')}
            tone="blue"
          />
        </div>
        {noScope && (
          <p className="mt-2 text-xs text-rose-500">{t('examMode.scopeRequired')}</p>
        )}
      </section>

      {/* 회차 */}
      <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('examMode.lecture')}
        </p>
        {lectureOptions.length === 0 ? (
          <p className="text-sm text-gray-400">{t('examMode.noReplayable')}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <LectureChip
              active={selectedLectures.length === 0}
              onClick={() => setSelectedLectures([])}
            >
              {t('examMode.allLectures')}
            </LectureChip>
            {lectureOptions.map((opt) => (
              <LectureChip
                key={opt.lectureNo}
                active={selectedLectures.includes(opt.lectureNo)}
                onClick={() =>
                  setSelectedLectures((prev) =>
                    prev.includes(opt.lectureNo)
                      ? prev.filter((x) => x !== opt.lectureNo)
                      : [...prev, opt.lectureNo],
                  )
                }
              >
                {lectureLabel(t, opt.lectureNo)}
                <span className="ml-1 text-[10px] font-medium text-gray-400">
                  {t('examMode.wrongCount', { n: opt.wrongCount })}
                  {opt.favCount > 0 ? ` · ★ ${opt.favCount}` : ''}
                </span>
              </LectureChip>
            ))}
          </div>
        )}
      </section>

      {/* 미리보기 + 시작 */}
      <div className="sticky bottom-0 -mx-4 border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-950 md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {t('examMode.totalPrefix')}{' '}
            <span className="text-lg font-black text-[#6366F1]">{previewCount}</span>
            {t('examMode.totalSuffix')}
            {previewCount > 0 && (
              <span className="ml-1 text-gray-400">
                {t('examMode.estimate', { m: estimateMinutes(previewCount) })}
              </span>
            )}
          </div>
          <button
            onClick={onStart}
            disabled={!canStart}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6366F1] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
          >
            <Trophy className="h-4 w-4" />
            {t('examMode.start')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ScopeToggle({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  tone: 'orange' | 'blue'
}) {
  const activeCls =
    tone === 'orange'
      ? 'border-[#F97316] bg-orange-50 text-[#C2410C] dark:bg-orange-950/30'
      : 'border-[#6366F1] bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/30'
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? activeCls
          : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
      }`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-md border ${
          active
            ? tone === 'orange'
              ? 'border-[#F97316] bg-[#F97316]'
              : 'border-[#6366F1] bg-[#6366F1]'
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        {active && <Check className="h-3 w-3 text-white" />}
      </span>
      {label}
    </button>
  )
}

function LectureChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-[#6366F1] bg-[#EEF2FF] text-[#4F46E5] dark:bg-indigo-950/30'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

/* ============================ 풀이 ============================ */

function RunPhase({
  t,
  item,
  index,
  total,
  locale,
  selectedOrder,
  payloadResponse,
  canAdvance,
  onSelect,
  onPayloadChange,
  onPrev,
  onNext,
}: {
  t: Translate
  item: QuizStorageItem
  index: number
  total: number
  locale: string
  selectedOrder: number | null
  payloadResponse: unknown
  canAdvance: boolean
  onSelect: (order: number) => void
  onPayloadChange: (value: unknown) => void
  onPrev: () => void
  onNext: () => void
}) {
  const choices = sortedChoices(item)
  const isLast = index + 1 >= total
  const progress = Math.round(((index + 1) / total) * 100)
  // exam_prep 특수 유형 — 핵심주제학습 폼으로 풀이 (정답은 결과 화면에서만 공개).
  const isPayload = isPayloadItem(item)

  return (
    <div className="space-y-5">
      {/* 진행도 */}
      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
          <span>
            {index + 1} / {total}
          </span>
          <span>{sourceLabel(t, item)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-[#6366F1] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 문제 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 md:p-6">
        {isPayload ? (
          // 유형별 폼 (풀이 중 — result=null 로 정답 숨김). question_format 디스패치.
          <PayloadFormView
            item={item}
            locale={locale}
            value={payloadResponse}
            onChange={onPayloadChange}
            result={null}
          />
        ) : (
          <>
            <h3 className="mb-5 text-base font-bold leading-relaxed text-gray-900 dark:text-gray-100">
              {qText(item, locale)}
            </h3>

            <ol className="space-y-2">
              {choices.map((c) => {
                const selected = c.choice_order === selectedOrder
                return (
                  <li key={c.choice_id}>
                    <button
                      onClick={() => onSelect(c.choice_order)}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                        selected
                          ? 'border-[#6366F1] bg-[#EEF2FF] text-gray-900 dark:bg-indigo-950/30 dark:text-gray-100'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                          selected
                            ? 'border-[#6366F1] bg-[#6366F1] text-white'
                            : 'border-gray-300 text-gray-400 dark:border-gray-600'
                        }`}
                      >
                        {c.choice_order}
                      </span>
                      <span className="flex-1">{cText(c, locale)}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </>
        )}
      </div>

      {/* 하단 액션 — 이전/다음 자유 이동 */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          disabled={index === 0}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('examMode.prev')}
        </button>
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#6366F1] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4F46E5] disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
        >
          {isLast ? t('examMode.submit') : t('examMode.next')}
          {!isLast && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

/* ============================ 결과 ============================ */

function ResultPhase({
  t,
  answers,
  locale,
  elapsedMs,
  onRetry,
  onReconfigure,
  onClose,
}: {
  t: Translate
  answers: AnswerRecord[]
  locale: string
  elapsedMs: number
  onRetry: () => void
  onReconfigure: () => void
  onClose: () => void
}) {
  const total = answers.length
  const correctCount = answers.filter((a) => a.isCorrect).length
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0

  // 회차별 정오
  const byLecture = useMemo(() => {
    const map = new Map<number, { lectureNo: number; correct: number; total: number }>()
    for (const a of answers) {
      const no = a.item.lecture_no
      if (no == null) continue
      const cur = map.get(no) ?? { lectureNo: no, correct: 0, total: 0 }
      cur.total += 1
      if (a.isCorrect) cur.correct += 1
      map.set(no, cur)
    }
    return [...map.entries()].sort((x, y) => x[0] - y[0]).map(([, v]) => v)
  }, [answers])

  return (
    <div className="space-y-6">
      {/* 점수 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('examMode.resultTitle')}
        </p>
        <p className="mt-2 text-4xl font-black text-[#6366F1]">
          {correctCount}
          <span className="text-2xl text-gray-400"> / {total}</span>
        </p>
        <p className="mt-1 text-sm font-semibold text-gray-600 dark:text-gray-300">
          {t('examMode.accuracy', { pct })}
        </p>
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5" />
          {t('examMode.elapsed', { time: formatDuration(elapsedMs, t) })}
        </p>
      </div>

      {/* 회차별 정오 */}
      {byLecture.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {t('examMode.byLecture')}
          </p>
          <ul className="space-y-2">
            {byLecture.map((l) => {
              const ratio = l.total > 0 ? l.correct / l.total : 0
              return (
                <li key={l.lectureNo} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {lectureLabel(t, l.lectureNo)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.round(ratio * 100)}%` }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-500">
                    {l.correct}/{l.total}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* 문항별 리뷰 */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {t('examMode.itemReview')}
        </p>
        {answers.map((a, i) => (
          <ReviewCard key={`${a.item.quiz_source}:${a.item.quiz_id}:${i}`} t={t} answer={a} locale={locale} />
        ))}
      </section>

      {/* 액션 */}
      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-950 md:-mx-8 md:px-8">
        <button
          onClick={onReconfigure}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <Settings2 className="h-4 w-4" />
          {t('examMode.reconfigure')}
        </button>
        <div className="flex gap-2">
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#6366F1] bg-white px-4 py-2.5 text-sm font-bold text-[#4F46E5] hover:bg-[#EEF2FF] dark:bg-gray-900"
          >
            <RotateCcw className="h-4 w-4" />
            {t('examMode.retry')}
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-[#6366F1] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4F46E5]"
          >
            {t('examMode.closeResult')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ReviewCard({
  t,
  answer,
  locale,
}: {
  t: Translate
  answer: AnswerRecord
  locale: string
}) {
  const [open, setOpen] = useState(false)
  const { item, selectedOrder, payloadResponse, isCorrect } = answer
  const choices = sortedChoices(item)
  const explanation = eText(item, locale)
  // exam_prep 특수 유형 — 핵심주제학습 폼으로 정/오답 하이라이트 렌더(legacy 선지 목록 대신).
  const isPayload = isPayloadItem(item)
  const payloadResult: QuizFormResult | null = isPayload
    ? { is_correct: isCorrect, correct_answer: payloadCorrectAnswer(item) }
    : null
  // 해설 라벨 정합: exam_prep 폼 선지는 A,B,C → 해설 번호도 문자로. legacy 리스트는 숫자 그대로.
  const explLabel = isPayload ? letterLabel : numberLabel
  // content/customize(legacy 객관식)는 선지별 해설(choice_explanation)을 시험모드에서도 노출.
  const choiceAnalysis = !isPayload
    ? choices
        .map((c) => ({ order: c.choice_order, correct: c.is_correct, text: cExpl(c, locale) }))
        .filter((c) => c.text)
    : []
  const hasExplanation = !!explanation || choiceAnalysis.length > 0

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isCorrect
          ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20'
          : 'border-rose-200 bg-rose-50/40 dark:border-rose-900 dark:bg-rose-950/20'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isCorrect
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
              : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
          }`}
        >
          {isCorrect ? t('examMode.correct') : t('examMode.wrong')}
        </span>
        <span className="text-[11px] text-gray-400">{sourceLabel(t, item)}</span>
      </div>

      {isPayload ? (
        // 폼이 stem + 본문(정/오답 하이라이트 포함)을 함께 렌더 → 별도 stem/선지 목록 미렌더.
        <PayloadFormView
          item={item}
          locale={locale}
          value={payloadResponse ?? null}
          onChange={() => {}}
          result={payloadResult}
        />
      ) : (
        <>
          <h4 className="mb-3 text-sm font-bold leading-relaxed text-gray-900 dark:text-gray-100">
            {qText(item, locale)}
          </h4>

          <ul className="space-y-1.5">
            {choices.map((c) => {
              const mine = c.choice_order === selectedOrder
              const correct = c.is_correct
              let cls =
                'flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-600 dark:text-gray-300'
              if (correct) cls += ' bg-emerald-100/60 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
              else if (mine) cls += ' bg-rose-100/60 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
              return (
                <li key={c.choice_id} className={cls}>
                  <span className="mt-0.5 text-[11px] font-bold">{c.choice_order}</span>
                  <span className="flex-1">{cText(c, locale)}</span>
                  {correct && <span className="text-[10px] font-bold">{t('examMode.correct')}</span>}
                  {mine && !correct && <span className="text-[10px] font-bold">{t('examMode.mySelection')}</span>}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {hasExplanation && (
        <div className="mt-3 border-t border-gray-200/60 pt-2 dark:border-gray-700/60">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-xs font-semibold text-[#6366F1] hover:text-[#4F46E5]"
          >
            {open ? t('examMode.hideExplanation') : t('examMode.showExplanation')}
          </button>
          {open && (
            <div className="mt-2 space-y-3">
              {/* 선지별 해설 (content/customize 객관식) — 선지 불릿(숫자)과 동일 라벨. */}
              {choiceAnalysis.length > 0 && (
                <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
                  <p className="mb-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    {t('examMode.choiceAnalysis')}
                  </p>
                  <div className="space-y-1.5">
                    {choiceAnalysis.map((c) => (
                      <div key={c.order} className="text-xs leading-relaxed">
                        <span
                          className={`mr-1 font-bold ${
                            c.correct
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {c.order}:
                        </span>
                        <span className="text-gray-600 dark:text-gray-300">{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 일반 해설 (exam_prep: 선지 번호→문자 매핑 / 그 외: 그대로). */}
              {explanation && (
                <div className="text-sm text-gray-700 dark:text-gray-200">
                  <MarkdownMessage
                    markdown={formatNumberedExplanation(explanation, explLabel)}
                    headingSize="compact"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
