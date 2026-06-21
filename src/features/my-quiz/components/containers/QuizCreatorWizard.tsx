/**
 * @file QuizCreatorWizard.tsx
 * @description 새 퀴즈 만들기 위저드 — 회차 선택 → 유형/문항 수 → 언어 → 생성
 * @module features/my-quiz/components/containers
 * @dependencies lucide-react, useCourseAndLecture
 */

'use client'

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookMarked,
  BookOpen,
  Check,
  GitBranch,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import type { LectureItem } from '../../hooks/useCourseAndLecture'

const QUIZ_TYPES = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'MISCONCEPTION',
  'STRUCTURE_OBJ',
] as const
type QuizType = (typeof QUIZ_TYPES)[number]

interface TypeMeta {
  Icon: typeof BookOpen
  iconBg: string
  iconText: string
}

const TYPE_META: Record<QuizType, TypeMeta> = {
  DEF_TO_TERM: {
    Icon: BookOpen,
    iconBg: 'bg-[#EEF2FF]',
    iconText: 'text-[#4F46E5]',
  },
  TERM_TO_DEF: {
    Icon: BookMarked,
    iconBg: 'bg-[#F5F3FF]',
    iconText: 'text-[#7C3AED]',
  },
  MISCONCEPTION: {
    Icon: AlertTriangle,
    iconBg: 'bg-orange-50',
    iconText: 'text-[#C2410C]',
  },
  STRUCTURE_OBJ: {
    Icon: GitBranch,
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
  },
}

const PRESETS: Record<string, Record<QuizType, number>> = {
  balanced: { DEF_TO_TERM: 5, TERM_TO_DEF: 5, MISCONCEPTION: 3, STRUCTURE_OBJ: 2 },
  terms: { DEF_TO_TERM: 8, TERM_TO_DEF: 7, MISCONCEPTION: 0, STRUCTURE_OBJ: 0 },
  depth: { DEF_TO_TERM: 2, TERM_TO_DEF: 2, MISCONCEPTION: 5, STRUCTURE_OBJ: 6 },
}

// 총 문항 수 상한. 백엔드(app-service 검증 1~60 + job-service count le=60)와 일치시킨다.
const MAX_TOTAL_COUNT = 15

interface QuizCreatorWizardProps {
  lectures: LectureItem[]
  /** 외부 딥링크로 사전 선택할 회차 id (이메일 '퀴즈 생성하기' 등). 없으면 미선택. */
  initialLectureId?: string | null
  isSubmitting: boolean
  error: string | null
  onSubmit: (
    lectureIds: string[],
    typeCounts: Record<QuizType, number>,
    language: 'ko' | 'en',
  ) => Promise<void>
  onBack: () => void
}

export default function QuizCreatorWizard({
  lectures,
  initialLectureId = null,
  isSubmitting,
  error,
  onSubmit,
  onBack,
}: QuizCreatorWizardProps) {
  const t = useTranslations('myQuiz')
  const locale = useLocale()
  const [selectedLectureIds, setSelectedLectureIds] = useState<string[]>(
    initialLectureId ? [initialLectureId] : [],
  )
  const [counts, setCounts] = useState<Record<QuizType, number>>({
    DEF_TO_TERM: 0,
    TERM_TO_DEF: 0,
    MISCONCEPTION: 0,
    STRUCTURE_OBJ: 0,
  })
  const [language, setLanguage] = useState<'ko' | 'en'>('ko')

  const totalCount = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  )

  // 선택된 회차들 (회차 번호 오름차순)
  const selectedLectures = useMemo(
    () =>
      lectures
        .filter((l) => selectedLectureIds.includes(l.lecture_id))
        .sort((a, b) => a.lecture_no - b.lecture_no),
    [lectures, selectedLectureIds],
  )

  // 하단 요약용 회차 라벨 — 선택한 회차 전체를 "1·2·3주차" 형식으로 표시 (압축하지 않음)
  const selectedLectureSummary = useMemo(() => {
    if (selectedLectures.length === 0) return null
    const nos = selectedLectures.map((l) => l.lecture_no)
    return t('landing.lectureWeek', { no: nos.join('·') })
  }, [selectedLectures, t])

  // 문항당 ~5초 (60문항 ≈ 5분). 생성 카드의 잔여시간 추정과 동일 기준.
  const estimatedMinutes = useMemo(
    () => (totalCount > 0 ? Math.max(1, Math.ceil((totalCount * 5) / 60)) : 0),
    [totalCount],
  )

  const ready = selectedLectureIds.length > 0 && totalCount > 0 && !isSubmitting

  // 단일 회차 선택만 허용 (복수 회차 선택 버그 수정). 같은 회차 재클릭 시 선택 해제.
  const toggleLecture = (lectureId: string) => {
    setSelectedLectureIds((prev) => (prev[0] === lectureId ? [] : [lectureId]))
  }

  // 유형별 상한 없음 — 총합(MAX_TOTAL_COUNT)만 제한. 절대값/델타 공용 clamp.
  const clampForType = (
    prev: Record<QuizType, number>,
    type: QuizType,
    value: number,
  ): number => {
    const othersTotal = (Object.keys(prev) as QuizType[]).reduce(
      (sum, k) => (k === type ? sum : sum + (prev[k] ?? 0)),
      0,
    )
    const maxForType = MAX_TOTAL_COUNT - othersTotal
    return Math.max(0, Math.min(maxForType, value))
  }

  const adjustCount = (type: QuizType, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [type]: clampForType(prev, type, (prev[type] ?? 0) + delta),
    }))
  }

  // 직접 입력 — 절대값으로 설정(총합 상한 내로 clamp). 빈 입력/비숫자는 0.
  const setCount = (type: QuizType, value: number) => {
    const safe = Number.isFinite(value) ? Math.floor(value) : 0
    setCounts((prev) => ({ ...prev, [type]: clampForType(prev, type, safe) }))
  }

  const applyPreset = (key: keyof typeof PRESETS) => {
    // 프리셋은 교체가 아니라 누적 — 클릭마다 해당 프리셋 값을 통째로 더한다.
    // 더했을 때 총합이 상한(MAX_TOTAL_COUNT)을 넘으면 → 1× 프리셋(최소)으로 되돌려 순환시킨다.
    // (예: 균형 5·5·3·2 반복 클릭 → 15 → 30 → 45 → 60 → 다시 15)
    setCounts((prev) => {
      const preset = PRESETS[key]
      const presetSum = Object.values(preset).reduce((a, b) => a + b, 0)
      const currentSum = Object.values(prev).reduce((a, b) => a + b, 0)
      if (currentSum + presetSum > MAX_TOTAL_COUNT) {
        return { ...preset } // 상한 초과 → 최소(1×)로 순환
      }
      const next = { ...prev }
      for (const [type, add] of Object.entries(preset) as [QuizType, number][]) {
        next[type] = (next[type] ?? 0) + add
      }
      return next
    })
  }

  const clearCounts = () => {
    setCounts({ DEF_TO_TERM: 0, TERM_TO_DEF: 0, MISCONCEPTION: 0, STRUCTURE_OBJ: 0 })
  }

  const handleSubmit = async () => {
    if (!ready || selectedLectureIds.length === 0) return
    await onSubmit(selectedLectureIds, counts, language)
  }

  const step2Active = selectedLectureIds.length > 0
  const step3Active = step2Active

  return (
    <div className="flex h-full flex-col">
      <style>{`
        .qcw-lecture-card.selected {
          border-color: #6366F1;
          background: linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%);
          box-shadow: 0 4px 12px rgba(99,102,241,0.15);
        }
        .qcw-lecture-card.selected .qcw-lecture-num { background: #6366F1; color: white; }
        .qcw-step-inactive { opacity: 0.5; pointer-events: none; filter: grayscale(0.3); }
        .qcw-type-card.has-count { border-color: #6366F1; background: #FAFAFF; }
        .qcw-counter-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px;
          background: white; border: 1px solid rgb(229 231 235);
          color: rgb(75 85 99); font-weight: 700; font-size: 16px;
          transition: all 0.15s;
        }
        .qcw-counter-btn:hover:not(:disabled) {
          border-color: #6366F1; color: #6366F1; background: #EEF2FF;
        }
        .qcw-counter-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @keyframes qcw-ring-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
          50% { box-shadow: 0 0 0 4px rgba(99,102,241,0.15); }
        }
        .qcw-step-active .qcw-step-num { animation: qcw-ring-pulse 2s ease-in-out infinite; }
      `}</style>

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="mx-auto max-w-5xl px-8 py-8">
          {/* 뒤로 */}
          <button
            onClick={onBack}
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('wizard.back')}
          </button>
          <div className="mb-8">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              {t('wizard.subtitle')}
            </p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl md:text-5xl">
              {t('wizard.title')}
            </h1>
          </div>

          {/* ===================== STEP 1: 회차 선택 ===================== */}
          <section
            className={`${selectedLectureIds.length === 0 ? 'qcw-step-active' : ''} mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900`}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="qcw-step-num inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#6366F1] text-xs font-bold text-white">
                1
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">{t('wizard.step1Title')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('wizard.step1Desc')}
                  {selectedLectureIds.length > 0 && (
                    <span className="ml-1 font-semibold text-[#6366F1]">
                      · {t('wizard.selectedCountSuffix', { count: selectedLectureIds.length })}
                    </span>
                  )}
                </p>
                <p className="mt-1.5 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-[#6366F1] dark:bg-indigo-900/30 dark:text-indigo-300">
                  {t('wizard.step1FixNote')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3 md:gap-3 lg:grid-cols-4">
              {lectures.map((l) => {
                const selected = selectedLectureIds.includes(l.lecture_id)
                const dateLabel = `${l.lecture_date ? new Date(l.lecture_date).toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', { month: 'long', day: 'numeric' }) : ''} · ${t('wizard.materialReady')}`
                return (
                  <button
                    key={l.lecture_id}
                    onClick={() => toggleLecture(l.lecture_id)}
                    className={`qcw-lecture-card group flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm md:flex-col md:items-start md:gap-0 md:rounded-xl dark:border-gray-700 dark:bg-gray-800 ${
                      selected ? 'selected' : ''
                    }`}
                  >
                    <div className="flex shrink-0 items-center md:mb-2 md:w-full md:justify-between">
                      <span className="qcw-lecture-num inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 md:h-7 md:w-7 md:text-xs">
                        {l.lecture_no}
                      </span>
                      {selected && <Check className="ml-2 h-4 w-4 text-[#6366F1] md:ml-0" />}
                    </div>
                    <div className="min-w-0 flex-1 md:w-full">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-gray-50 md:mb-0.5">
                        <span className="md:hidden">
                          {l.title ?? t('selector.lectureLabel', { no: l.lecture_no })}
                        </span>
                        <span className="hidden md:inline">
                          {t('selector.lectureLabel', { no: l.lecture_no })}
                        </span>
                      </p>
                      {l.title && (
                        <p className="hidden truncate text-xs text-gray-500 md:mb-0.5 md:block dark:text-gray-400">
                          {l.title}
                        </p>
                      )}
                      <p className="truncate text-[11px] text-gray-400">{dateLabel}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* ===================== STEP 2: 문제 유형 ===================== */}
          <section
            className={`${step2Active ? 'qcw-step-active' : 'qcw-step-inactive'} mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900`}
          >
            <div className="mb-1 flex items-center gap-3">
              <span
                className={`qcw-step-num inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                  step2Active ? 'bg-[#6366F1]' : 'bg-gray-300'
                }`}
              >
                2
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">
                  {t('wizard.step2Title')}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('wizard.step2Desc', { max: MAX_TOTAL_COUNT })}
                </p>
                <p className="mt-1.5 inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-[#6366F1] dark:bg-indigo-900/30 dark:text-indigo-300">
                  {t('wizard.step2FixNote')}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {QUIZ_TYPES.map((type) => {
                const meta = TYPE_META[type]
                const count = counts[type]
                const Icon = meta.Icon
                return (
                  <div
                    key={type}
                    className={`qcw-type-card rounded-xl border border-gray-200 bg-white p-4 transition dark:border-gray-700 dark:bg-gray-800 ${
                      count > 0 ? 'has-count' : ''
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.iconBg} ${meta.iconText}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                            {t(`wizard.typeLabel.${type}`)}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {t(`wizard.typeSub.${type}`)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">{t('wizard.fiveChoice')}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustCount(type, -1)}
                          disabled={count === 0}
                          className="qcw-counter-btn"
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={count}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^0-9]/g, '')
                            setCount(type, digits === '' ? 0 : parseInt(digits, 10))
                          }}
                          aria-label={t(`wizard.typeLabel.${type}`)}
                          className="w-10 rounded-md border border-gray-200 py-0.5 text-center text-base font-bold tabular-nums text-gray-900 focus:border-[#6366F1] focus:outline-none focus:ring-1 focus:ring-[#6366F1] dark:border-gray-600 dark:bg-gray-900 dark:text-gray-50"
                        />
                        <button
                          type="button"
                          onClick={() => adjustCount(type, +1)}
                          disabled={totalCount >= MAX_TOTAL_COUNT}
                          className="qcw-counter-btn"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 빠른 선택 프리셋 */}
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
              <span className="text-[11px] font-semibold text-gray-400">{t('wizard.quickSelect')}</span>
              <button
                onClick={() => applyPreset('balanced')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-[#6366F1] hover:text-[#4F46E5] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {t('wizard.presetBalanced')}
              </button>
              <button
                onClick={() => applyPreset('terms')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-[#6366F1] hover:text-[#4F46E5] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {t('wizard.presetTerms')}
              </button>
              <button
                onClick={() => applyPreset('depth')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-[#6366F1] hover:text-[#4F46E5] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                {t('wizard.presetDepth')}
              </button>
              <button
                onClick={clearCounts}
                className="ml-auto text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                {t('wizard.resetAll')}
              </button>
            </div>
          </section>

          {/* ===================== STEP 3: 생성 언어 ===================== */}
          <section
            className={`${step3Active ? '' : 'qcw-step-inactive'} mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900`}
          >
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`qcw-step-num inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${
                  step3Active ? 'bg-[#6366F1]' : 'bg-gray-300'
                }`}
              >
                3
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">{t('wizard.step3Title')}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('wizard.step3Desc')}
                </p>
              </div>
            </div>

            <div className="inline-flex h-10 items-center rounded-xl bg-gray-100 p-1 text-sm font-semibold dark:bg-gray-800">
              <button
                onClick={() => setLanguage('ko')}
                className={`rounded-lg px-5 py-1.5 ${
                  language === 'ko'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-50'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t('wizard.langKo')}
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`rounded-lg px-5 py-1.5 ${
                  language === 'en'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-50'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                English
              </button>
            </div>
          </section>

          {/* 안내 + 에러 */}
          <div className="flex items-start gap-3 rounded-2xl bg-[#EEF2FF] p-4 dark:bg-[#312E81]/30">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#6366F1]" />
            <p className="text-xs text-[#4F46E5] dark:text-[#A5B4FC]">
              <span className="font-semibold">{t('wizard.noticeBold')}</span>
              {' '}
              {t('wizard.noticeRest')}
            </p>
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-3 rounded-2xl bg-red-50 p-4 dark:bg-red-900/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="h-32" />
        </div>
      </div>

      {/* ===================== STICKY BOTTOM BAR =====================
          모바일: 한 줄 요약(라벨 생략, 점으로 구분) + 풀폭 버튼 (세로 스택)
          데스크탑(md+): 기존 4컬럼 (라벨 + 값) + 우측 버튼 */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8 md:py-4 dark:border-gray-700 dark:bg-gray-900/90">
        {/* 모바일 전용 — 컴팩트 인라인 요약 + 풀폭 버튼 */}
        <div className="flex flex-col gap-2 md:hidden">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            <span className={selectedLectureSummary ? '' : 'text-gray-400'}>
              {selectedLectureSummary ?? t('wizard.lectureNotSelected')}
            </span>
            <span className="text-gray-300">·</span>
            <span>
              <span className="font-bold text-[#6366F1]">{totalCount}</span>
              <span className="ml-0.5">{t('wizard.questionUnit')}</span>
            </span>
            <span className="text-gray-300">·</span>
            <span>{t('wizard.minutesApprox', { min: totalCount > 0 ? estimatedMinutes : 0 })}</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!ready}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition ${
              ready
                ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5] hover:shadow-lg'
                : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {isSubmitting ? t('wizard.submitting') : t('create.generate')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* 데스크탑 — 기존 4컬럼 */}
        <div className="mx-auto hidden max-w-5xl items-center justify-between gap-4 md:flex">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-400">{t('wizard.selectedLecture')}</p>
              <p
                className={`text-sm font-bold ${selectedLectures.length > 0 ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400'}`}
              >
                {selectedLectures.length === 0
                  ? t('wizard.notSelected')
                  : selectedLectures.length === 1
                    ? selectedLectures[0].title
                      ? t('landing.lectureWeekWithTitle', {
                          no: selectedLectures[0].lecture_no,
                          title: selectedLectures[0].title,
                        })
                      : t('landing.lectureWeek', { no: selectedLectures[0].lecture_no })
                    : t('wizard.lectureSummaryWithCount', {
                        summary: selectedLectureSummary ?? '',
                        count: selectedLectures.length,
                      })}
              </p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400">{t('wizard.totalQuestions')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                <span className="text-[#6366F1]">{totalCount}</span>
                <span className="ml-0.5 text-xs text-gray-500">{t('wizard.questionUnit')}</span>
              </p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400">{t('wizard.estimatedTime')}</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                {t('wizard.minutesApprox', { min: totalCount > 0 ? estimatedMinutes : 0 })}
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!ready}
            className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition ${
              ready
                ? 'bg-[#6366F1] text-white hover:bg-[#4F46E5] hover:shadow-lg'
                : 'cursor-not-allowed bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            {isSubmitting ? t('wizard.submitting') : t('create.generate')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
