/**
 * @file QuizCreatorWizard.tsx
 * @description 새 퀴즈 만들기 위저드 — 회차 선택 → 유형/문항 수 → 언어 → 생성
 * @module features/my-quiz/components/containers
 * @dependencies lucide-react, useCourseAndLecture
 */

'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
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
  label: string
  sub: string
  Icon: typeof BookOpen
  iconBg: string
  iconText: string
}

const TYPE_META: Record<QuizType, TypeMeta> = {
  DEF_TO_TERM: {
    label: '정의 → 용어',
    sub: '설명 보고 용어 고르기',
    Icon: BookOpen,
    iconBg: 'bg-[#EEF2FF]',
    iconText: 'text-[#4F46E5]',
  },
  TERM_TO_DEF: {
    label: '용어 → 정의',
    sub: '용어 보고 설명 고르기',
    Icon: BookMarked,
    iconBg: 'bg-[#F5F3FF]',
    iconText: 'text-[#7C3AED]',
  },
  MISCONCEPTION: {
    label: '오개념 탐지',
    sub: '틀린 설명 1개 찾기',
    Icon: AlertTriangle,
    iconBg: 'bg-orange-50',
    iconText: 'text-[#C2410C]',
  },
  STRUCTURE_OBJ: {
    label: '구조 이해',
    sub: '개념 관계·구조 묻기',
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

interface QuizCreatorWizardProps {
  lectures: LectureItem[]
  isSubmitting: boolean
  error: string | null
  onSubmit: (
    lectureId: string,
    typeCounts: Record<QuizType, number>,
    language: 'ko' | 'en',
  ) => Promise<void>
  onBack: () => void
}

export default function QuizCreatorWizard({
  lectures,
  isSubmitting,
  error,
  onSubmit,
  onBack,
}: QuizCreatorWizardProps) {
  const t = useTranslations('myQuiz.create')
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
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

  const selectedLecture = useMemo(
    () => lectures.find((l) => l.lecture_id === selectedLectureId) ?? null,
    [lectures, selectedLectureId],
  )

  const estimatedMinutes = useMemo(
    () => (totalCount > 0 ? Math.max(1, Math.ceil((75 + totalCount * 8) / 60)) : 0),
    [totalCount],
  )

  const ready = !!selectedLectureId && totalCount > 0 && !isSubmitting

  const adjustCount = (type: QuizType, delta: number) => {
    setCounts((prev) => ({
      ...prev,
      [type]: Math.max(0, Math.min(20, (prev[type] ?? 0) + delta)),
    }))
  }

  const applyPreset = (key: keyof typeof PRESETS) => {
    setCounts({ ...PRESETS[key] })
  }

  const clearCounts = () => {
    setCounts({ DEF_TO_TERM: 0, TERM_TO_DEF: 0, MISCONCEPTION: 0, STRUCTURE_OBJ: 0 })
  }

  const handleSubmit = async () => {
    if (!ready || !selectedLectureId) return
    await onSubmit(selectedLectureId, counts, language)
  }

  const step2Active = selectedLectureId != null
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
            뒤로
          </button>
          <div className="mb-8">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              회차와 유형을 정하면 AI가 약 1~2분 만에 만들어드려요
            </p>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-gray-50 md:text-5xl">
              새 퀴즈 만들기
            </h1>
          </div>

          {/* ===================== STEP 1: 회차 선택 ===================== */}
          <section
            className={`${selectedLectureId == null ? 'qcw-step-active' : ''} mb-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900`}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="qcw-step-num inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#6366F1] text-xs font-bold text-white">
                1
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">회차 선택</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  퀴즈를 만들 회차를 1개 골라주세요
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {lectures.map((l) => {
                const selected = selectedLectureId === l.lecture_id
                return (
                  <button
                    key={l.lecture_id}
                    onClick={() => setSelectedLectureId(l.lecture_id)}
                    className={`qcw-lecture-card group rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 ${
                      selected ? 'selected' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="qcw-lecture-num inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                        {l.lecture_no}
                      </span>
                      {selected && <Check className="h-4 w-4 text-[#6366F1]" />}
                    </div>
                    <p className="mb-0.5 truncate text-sm font-bold text-gray-900 dark:text-gray-50">
                      {l.title ?? `${l.lecture_no}회차`}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {l.lecture_date ? new Date(l.lecture_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : ''}
                      {' · 자료 준비됨'}
                    </p>
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
                  문제 유형 · 문항 수
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  유형별로 몇 문항씩 만들지 정해주세요 (각 0~20개)
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
                            {meta.label}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {meta.sub}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">5지선다</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => adjustCount(type, -1)}
                          disabled={count === 0}
                          className="qcw-counter-btn"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-base font-bold tabular-nums text-gray-900 dark:text-gray-50">
                          {count}
                        </span>
                        <button
                          type="button"
                          onClick={() => adjustCount(type, +1)}
                          disabled={count === 20}
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
              <span className="text-[11px] font-semibold text-gray-400">빠른 선택</span>
              <button
                onClick={() => applyPreset('balanced')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-[#6366F1] hover:text-[#4F46E5] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                균형 (5·5·3·2)
              </button>
              <button
                onClick={() => applyPreset('terms')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-[#6366F1] hover:text-[#4F46E5] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                용어 위주 (8·7·0·0)
              </button>
              <button
                onClick={() => applyPreset('depth')}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:border-[#6366F1] hover:text-[#4F46E5] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                심화 (2·2·5·6)
              </button>
              <button
                onClick={clearCounts}
                className="ml-auto text-xs font-semibold text-gray-400 hover:text-gray-600"
              >
                전체 초기화
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
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-50">생성 언어</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  문제와 해설이 작성될 언어를 골라주세요
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
                한국어
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
              <span className="font-semibold">생성 후 미리보기 없이 세션이 만들어집니다.</span>
              {' '}완료되면 "내 퀴즈 세션" 목록에 자동 추가되며, 클릭해서 바로 풀이를 시작할 수 있어요.
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

      {/* ===================== STICKY BOTTOM BAR ===================== */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white/90 px-8 py-4 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-400">선택한 회차</p>
              <p
                className={`text-sm font-bold ${selectedLecture ? 'text-gray-900 dark:text-gray-50' : 'text-gray-400'}`}
              >
                {selectedLecture
                  ? `${selectedLecture.lecture_no}주차${selectedLecture.title ? ` · ${selectedLecture.title}` : ''}`
                  : '선택 안 됨'}
              </p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400">총 문항</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                <span className="text-[#6366F1]">{totalCount}</span>
                <span className="ml-0.5 text-xs text-gray-500">문항</span>
              </p>
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-[11px] font-semibold text-gray-400">예상 소요</p>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                {totalCount > 0 ? `~${estimatedMinutes}분` : '~0분'}
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
            {isSubmitting ? '생성 시작 중...' : '퀴즈 생성하기'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
