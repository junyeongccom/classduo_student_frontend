/**
 * @file QuizStorageContainer.tsx
 * @description 내 퀴즈 저장소 — 즐겨찾기/오답 통합 + 출처/회차/유형 필터 + 카드 뷰 + 정답 가림 토글 (오답: 인라인 풀이 + 해설 expand)
 * @module features/my-quiz/components/containers
 * @dependencies useQuizStorage, useCourseAndLecture, lucide-react
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import {
  ArrowUpDown,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lightbulb,
  SlidersHorizontal,
  X,
  XCircle,
} from 'lucide-react'
import { useCourseAndLecture } from '../../hooks/useCourseAndLecture'
import { useQuizStorage, type QuizStorageItem } from '../../hooks/useQuizStorage'
import { updateCorrect } from '@/features/lecture-study/services/quizStatusService'
import type { StudentQuizType } from '@/shared/components/quiz'
import { CORE_TEST_TO_LECTURE_NO } from '@/features/exam-prep-final/domain/coreTestLectureMap'

type SegmentValue = 'all' | 'fav' | 'wrong'
/**
 * 학생이 접근 가능한 3종 출처:
 *   - 'lecture-content' = 회차별 학습 콘텐츠형 퀴즈 (raw quiz_source = 'content')
 *   - 'exam-prep'       = 기말 대비 학습 (exam_prep_* 테이블; bookmark/incorrect 백엔드 연동 시 자동 표시)
 *   - 'customize'       = 내가 만든 퀴즈 (raw quiz_source = 'customize')
 *
 *   raw quiz_source = 'instructor' 는 학생 UI 에 노출되지 않으므로 제외.
 */
type SourceValue = 'all' | 'lecture-content' | 'exam-prep' | 'customize'
type AnswersMode = 'off' | 'on'

const ANSWERS_KEY = 'quizStorage:answers'

interface SourceMeta {
  pillBg: string
  pillText: string
  dot: string
}

const SOURCE_META: Record<Exclude<SourceValue, 'all'>, SourceMeta> = {
  'lecture-content': {
    pillBg: 'bg-[#F5F3FF]',
    pillText: 'text-[#7C3AED]',
    dot: 'bg-[#8B5CF6]',
  },
  'exam-prep': {
    pillBg: 'bg-orange-50',
    pillText: 'text-[#C2410C]',
    dot: 'bg-[#F97316]',
  },
  customize: {
    pillBg: 'bg-[#EEF2FF]',
    pillText: 'text-[#4F46E5]',
    dot: 'bg-[#6366F1]',
  },
}

// 출처 → i18n 키 매핑 (storage.sourceLabels)
const SOURCE_LABEL_KEY: Record<Exclude<SourceValue, 'all'>, string> = {
  'lecture-content': 'lectureContent',
  'exam-prep': 'examPrep',
  customize: 'customize',
}

/**
 * raw quiz_source → 화면 표시용 카테고리.
 * 'instructor' 는 학생 UI 미노출이므로 null 반환 (필터에서 제거).
 * 'exam_prep' 은 user_quiz_status 에 함께 저장되며, 표시 카테고리는 'exam-prep'.
 */
function toDisplaySource(
  src: 'instructor' | 'content' | 'customize' | 'exam_prep' | 'incorrect',
): Exclude<SourceValue, 'all'> | null {
  if (src === 'content') return 'lecture-content'
  if (src === 'customize') return 'customize'
  if (src === 'exam_prep') return 'exam-prep'
  // 'instructor' 는 학생 UI 미노출, 'incorrect' 는 활동 로그 source 라 별개 표시 카테고리 없음
  return null
}

// 회상(RECALL) + 서술형 구조(STRUCTURE) 는 사용 중단. 객관식 구조(STRUCTURE_OBJ)는 실제로
// 생성되므로 '구조' 라벨로 1회만 노출 (이전에 STRUCTURE + STRUCTURE_OBJ 둘 다 등재되어
// 동일 라벨 "구조" 가 2번 보이던 문제 수정).
// exam_prep 는 quiz_type 메타가 없어 유형 필터 적용 시 자동으로 결과에서 제외된다.
const STORAGE_TYPES: StudentQuizType[] = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'MISCONCEPTION',
  'STRUCTURE_OBJ',
]

function formatRelative(
  iso: string | null,
  t: (key: string, values?: Record<string, string | number>) => string,
): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const day = 24 * 60 * 60 * 1000
  const days = Math.floor(diff / day)
  if (days <= 0) return t('storage.today')
  if (days === 1) return t('storage.yesterday')
  if (days < 7) return t('storage.daysAgo', { n: days })
  if (days < 30) return t('storage.weeksAgo', { n: Math.floor(days / 7) })
  return t('storage.monthsAgo', { n: Math.floor(days / 30) })
}

export default function QuizStorageContainer() {
  const params = useParams<{ courseId?: string }>()
  const courseIdParam = params?.courseId ?? null
  const locale = useLocale()
  const t = useTranslations('myQuiz')

  const {
    courses,
    selectedCourseId,
    lectureInfoMap,
    isLoading: courseLoading,
  } = useCourseAndLecture(courseIdParam)
  // URL effect 폐기 — useCourseAndLecture(courseIdParam) 가 직접 처리.
  // 자동 첫강좌 선택 → URL 보정 두 단계로 인한 깜빡임 방지.

  // 현 과목의 모든 회차 (저장소는 기본적으로 전체 회차 대상)
  const courseLectures = useMemo(() => {
    const c = courses.find((x) => x.course_id === selectedCourseId)
    return (c?.lectures ?? [])
      .filter((l) => l.is_available !== false)
      .sort((a, b) => a.lecture_no - b.lecture_no)
  }, [courses, selectedCourseId])

  const allLectureIds = useMemo(
    () => courseLectures.map((l) => l.lecture_id),
    [courseLectures],
  )

  // 회차 칩 다중 선택 상태 (빈 배열 = 전체) — content/customize 용
  const [lectureFilter, setLectureFilter] = useState<string[]>([])
  // 유형 단일 선택 (null = 전체) — content/customize 용
  const [typeFilter, setTypeFilter] = useState<StudentQuizType | null>(null)
  // 핵심테스트 번호 다중 선택 (빈 배열 = 전체) — exam-prep 출처 전용
  const [coreTestFilter, setCoreTestFilter] = useState<number[]>([])
  // segmented
  const [segment, setSegment] = useState<SegmentValue>('all')
  // 출처 칩 (single)
  const [sourceFilter, setSourceFilter] = useState<SourceValue>('all')
  // 정렬
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  // advanced filters expanded
  const [advancedOpen, setAdvancedOpen] = useState(false)
  // 정답 모드 — localStorage 복원 (lazy initializer로 첫 렌더부터 정확한 값 사용 → 깜빡임 방지)
  const [answersMode, setAnswersMode] = useState<AnswersMode>(() => {
    if (typeof window === 'undefined') return 'off'
    const a = window.localStorage.getItem(ANSWERS_KEY)
    return a === 'on' ? 'on' : 'off'
  })
  useEffect(() => {
    try { localStorage.setItem(ANSWERS_KEY, answersMode) } catch {}
  }, [answersMode])

  const effectiveLectureIds =
    lectureFilter.length > 0 ? lectureFilter : allLectureIds

  const { items, isLoading, error } = useQuizStorage({
    lectureIds: effectiveLectureIds,
    lectureInfoMap,
  })

  // 핵심테스트 번호 → lecture_no 변환 (선택된 핵심테스트들의 lecture_no Set)
  const coreTestLectureNoSet = useMemo(() => {
    const s = new Set<number>()
    for (const n of coreTestFilter) {
      const ln = CORE_TEST_TO_LECTURE_NO[n]
      if (ln != null) s.add(ln)
    }
    return s
  }, [coreTestFilter])

  // 클라이언트 사이드 필터링
  const filtered = useMemo(() => {
    let list = items
    if (segment === 'fav') list = list.filter((q) => q.is_bookmark)
    if (segment === 'wrong') list = list.filter((q) => q.is_wrong)
    // instructor 출처는 학생 UI 미노출이므로 항상 제외 (toDisplaySource 가 null)
    list = list.filter((q) => toDisplaySource(q.quiz_source) !== null)
    if (sourceFilter !== 'all')
      list = list.filter((q) => toDisplaySource(q.quiz_source) === sourceFilter)
    // 유형 필터 — content/customize 만 (exam_prep 는 quiz_type 메타 없음)
    if (typeFilter) list = list.filter((q) => q.quiz_type === typeFilter)
    // 핵심테스트 번호 필터 — exam-prep 출처 선택 + 1개 이상 선택된 경우에만 적용
    if (sourceFilter === 'exam-prep' && coreTestLectureNoSet.size > 0) {
      list = list.filter(
        (q) => q.lecture_no != null && coreTestLectureNoSet.has(q.lecture_no),
      )
    }
    // 정렬 — 오답 세그먼트는 last_wrong_at 기준 (오답이 발생한 시각으로 1번~20번 풀이 순서대로 정확히 정렬)
    const sortKey = segment === 'wrong'
      ? (q: QuizStorageItem) => q.last_wrong_at ?? q.last_activity_at
      : (q: QuizStorageItem) => q.last_activity_at
    list = [...list].sort((a, b) => {
      const aT = sortKey(a) ? new Date(sortKey(a) as string).getTime() : 0
      const bT = sortKey(b) ? new Date(sortKey(b) as string).getTime() : 0
      return sortOrder === 'newest' ? bT - aT : aT - bT
    })
    return list
  }, [items, segment, sourceFilter, typeFilter, sortOrder, coreTestLectureNoSet])

  const totalCounts = useMemo(() => {
    let fav = 0,
      wrong = 0
    for (const q of items) {
      if (q.is_bookmark) fav += 1
      if (q.is_wrong) wrong += 1
    }
    return { fav, wrong, total: items.length }
  }, [items])

  const handleResetFilters = () => {
    setSegment('all')
    setSourceFilter('all')
    setLectureFilter([])
    setTypeFilter(null)
    setCoreTestFilter([])
  }

  const rootClass = answersMode === 'on' ? 'answers-on' : 'answers-off'

  return (
    <div className="h-full overflow-y-auto">
      {/* 로컬 스타일 — answers-off/on 토글 + view 토글 */}
      <style>{`
        .qs-choice-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; border-radius: 9999px;
          border: 1px solid rgb(229 231 235);
          background: white; color: rgb(156 163 175);
          font-size: 10px; font-weight: 700; line-height: 1;
          flex-shrink: 0; margin-top: 2px;
        }
        .qs-choice-row { display: flex; align-items: flex-start; gap: 8px; color: rgb(75 85 99); font-size: 13px; padding: 4px 6px; border-radius: 6px; }
        .qs-choice-text { flex: 1; }
        .qs-answer-badge, .qs-mine-badge, .qs-mine-indicator { display: none; font-size: 10px; font-weight: 700; }

        .answers-off .qs-choice-row[data-mine="true"] { background: rgb(249 250 251); }
        .answers-off .qs-choice-row[data-mine="true"] .qs-choice-num {
          background: rgb(243 244 246); border-color: rgb(209 213 219); color: rgb(75 85 99);
        }
        .answers-off .qs-choice-row[data-mine="true"] .qs-mine-indicator {
          display: inline-flex; align-items: center; gap: 4px; margin-left: auto;
          color: rgb(156 163 175); font-size: 10px; font-weight: 600;
        }

        /* 채점 결과 색상 — answers-on 전역 토글 또는 카드별 인라인 풀이 (data-show-results) 양쪽 모두 적용 */
        .answers-on .qs-choice-row[data-correct="true"],
        .qs-choice-row[data-show-results="true"][data-correct="true"] {
          color: rgb(4 120 87); font-weight: 600;
        }
        .answers-on .qs-choice-row[data-correct="true"] .qs-choice-num,
        .qs-choice-row[data-show-results="true"][data-correct="true"] .qs-choice-num {
          background: rgb(209 250 229); border-color: rgb(209 250 229); color: rgb(4 120 87);
        }
        .answers-on .qs-choice-row[data-correct="true"] .qs-answer-badge,
        .qs-choice-row[data-show-results="true"][data-correct="true"] .qs-answer-badge {
          display: inline; margin-left: auto; color: rgb(5 150 105);
        }

        .answers-on .qs-choice-row[data-mine="true"]:not([data-correct="true"]),
        .qs-choice-row[data-show-results="true"][data-mine="true"]:not([data-correct="true"]) {
          color: rgb(225 29 72); font-weight: 600;
        }
        .answers-on .qs-choice-row[data-mine="true"]:not([data-correct="true"]) .qs-choice-num,
        .qs-choice-row[data-show-results="true"][data-mine="true"]:not([data-correct="true"]) .qs-choice-num {
          background: rgb(255 228 230); border-color: rgb(255 228 230); color: rgb(225 29 72);
        }
        .answers-on .qs-choice-row[data-mine="true"]:not([data-correct="true"]) .qs-mine-badge,
        .qs-choice-row[data-show-results="true"][data-mine="true"]:not([data-correct="true"]) .qs-mine-badge {
          display: inline; margin-left: auto; color: rgb(244 63 94);
        }

        .qs-no-scrollbar::-webkit-scrollbar { display: none; }
        .qs-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }

        .qs-switch-track { position: relative; display: inline-flex; align-items: center; width: 32px; height: 18px; border-radius: 9999px; background: rgb(209 213 219); transition: background 0.2s; }
        .qs-switch-track.is-on { background: #6366F1; }
        .qs-switch-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 9999px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: transform 0.2s; }
        .qs-switch-track.is-on .qs-switch-knob { transform: translateX(14px); }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
        {/* ===================== PAGE HEADER ===================== */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6 md:gap-6">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400 md:mb-2 md:text-sm">
              {t('storage.subtitle')}
            </p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50 md:text-4xl xl:text-5xl">
              {t('storage.pageTitle')}
            </h1>
          </div>
          <div className="flex shrink-0 items-end gap-4 pb-1 md:gap-8 md:pb-2">
            <div className="text-right">
              <p className="mb-0.5 text-[11px] text-gray-400 dark:text-gray-500 md:mb-1 md:text-xs">{t('storage.favorites')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-50 md:text-2xl">
                <span className="text-[#6366F1]">{totalCounts.fav}</span>
                <span className="ml-1 text-sm text-gray-500 dark:text-gray-400 md:text-base">{t('storage.countUnit')}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="mb-0.5 text-[11px] text-gray-400 dark:text-gray-500 md:mb-1 md:text-xs">{t('storage.wrong')}</p>
              <p className="text-lg font-bold text-[#F97316] md:text-2xl">{totalCounts.wrong}</p>
            </div>
          </div>
        </div>

        {/* ===================== FILTER BAR ===================== */}
        <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 md:gap-4">
            <div className="inline-flex h-9 items-center rounded-xl bg-gray-100 p-1 text-xs font-semibold dark:bg-gray-800 md:h-10 md:text-sm">
              <SegBtn
                active={segment === 'all'}
                onClick={() => setSegment('all')}
              >
                {t('storage.all')} <span className="ml-1 text-[11px] text-gray-400 md:text-xs">{totalCounts.total}</span>
              </SegBtn>
              <SegBtn
                active={segment === 'fav'}
                onClick={() => setSegment('fav')}
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('storage.favorites')}</span>
                <span className="text-[11px] text-gray-400 md:text-xs">{totalCounts.fav}</span>
              </SegBtn>
              <SegBtn
                active={segment === 'wrong'}
                onClick={() => setSegment('wrong')}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('storage.wrong')}</span>
                <span className="text-[11px] text-gray-400 md:text-xs">{totalCounts.wrong}</span>
              </SegBtn>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 md:px-3 md:py-2 md:text-xs"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortOrder === 'newest' ? t('sort.newest') : t('sort.oldest')}
              </button>
              <button
                onClick={() => setAdvancedOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 md:px-3 md:py-2 md:text-xs"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {t('storage.filter')}
                {(lectureFilter.length > 0 ||
                  typeFilter !== null ||
                  coreTestFilter.length > 0) && (
                  <span className="ml-1 rounded-full bg-[#6366F1] px-1.5 py-0.5 text-[10px] text-white">
                    {(lectureFilter.length > 0 ? 1 : 0) +
                      (typeFilter ? 1 : 0) +
                      (coreTestFilter.length > 0 ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* 출처 칩 — 항상 보임 */}
          <div className="qs-no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 text-xs font-semibold text-gray-400">{t('storage.source')}</span>
            <Chip
              active={sourceFilter === 'all'}
              onClick={() => setSourceFilter('all')}
            >
              {t('storage.all')}
            </Chip>
            {(['lecture-content', 'exam-prep', 'customize'] as const).map((src) => {
              const meta = SOURCE_META[src]
              return (
                <Chip
                  key={src}
                  active={sourceFilter === src}
                  onClick={() => setSourceFilter(src)}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {t(`storage.sourceLabels.${SOURCE_LABEL_KEY[src]}`)}
                </Chip>
              )
            })}
          </div>

          {/* Advanced — 출처가 exam-prep 이면 핵심테스트 1~26 칩, 그 외엔 회차 + 유형 */}
          {advancedOpen && (
            <div className="mt-3 space-y-2.5 border-t border-gray-100 pt-3 dark:border-gray-800">
              {sourceFilter === 'exam-prep' ? (
                <div className="space-y-1.5">
                  {([
                    [1, 9],
                    [10, 18],
                    [19, 26],
                  ] as const).map(([start, end], rowIdx) => (
                    <div key={rowIdx} className="flex flex-wrap items-center gap-2">
                      <span className="w-16 shrink-0 text-xs font-semibold text-gray-400">
                        {rowIdx === 0 ? t('storage.coreTest') : ''}
                      </span>
                      {rowIdx === 0 && (
                        <Chip
                          active={coreTestFilter.length === 0}
                          onClick={() => setCoreTestFilter([])}
                        >
                          {t('storage.all')}
                        </Chip>
                      )}
                      {Array.from(
                        { length: end - start + 1 },
                        (_, i) => start + i,
                      ).map((n) => (
                        <Chip
                          key={n}
                          active={coreTestFilter.includes(n)}
                          onClick={() =>
                            setCoreTestFilter((prev) =>
                              prev.includes(n)
                                ? prev.filter((x) => x !== n)
                                : [...prev, n],
                            )
                          }
                        >
                          {t('storage.coreTestNo', { n })}
                        </Chip>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="qs-no-scrollbar flex items-center gap-2 overflow-x-auto">
                    <span className="w-12 shrink-0 text-xs font-semibold text-gray-400">{t('storage.lecture')}</span>
                    <Chip
                      active={lectureFilter.length === 0}
                      onClick={() => setLectureFilter([])}
                    >
                      {t('storage.all')}
                    </Chip>
                    {courseLectures.map((l) => (
                      <Chip
                        key={l.lecture_id}
                        active={lectureFilter.includes(l.lecture_id)}
                        onClick={() =>
                          setLectureFilter((prev) =>
                            prev.includes(l.lecture_id)
                              ? prev.filter((x) => x !== l.lecture_id)
                              : [...prev, l.lecture_id],
                          )
                        }
                      >
                        {t('landing.lectureWeek', { no: l.lecture_no })}
                      </Chip>
                    ))}
                  </div>

                  <div className="qs-no-scrollbar flex items-center gap-2 overflow-x-auto">
                    <span className="w-12 shrink-0 text-xs font-semibold text-gray-400">{t('storage.type')}</span>
                    <Chip active={typeFilter === null} onClick={() => setTypeFilter(null)}>
                      {t('storage.all')}
                    </Chip>
                    {STORAGE_TYPES.map((tp) => (
                      <Chip
                        key={tp}
                        active={typeFilter === tp}
                        onClick={() => setTypeFilter(tp)}
                      >
                        {t(`storage.typeLabels.${tp}`)}
                      </Chip>
                    ))}
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-gray-400 hover:text-gray-600"
                >
                  {t('storage.resetFilters')}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===================== TOOLBAR (count + view + answers) ===================== */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 md:gap-2 md:text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{t('storage.countBadge', { count: filtered.length })}</span>
            <span>{t('storage.problemsLabel')}</span>
            <span className="text-gray-300">·</span>
            <span>{sortOrder === 'newest' ? t('sort.newest') : t('sort.oldest')}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Answers toggle */}
            <button
              onClick={() => setAnswersMode((m) => (m === 'on' ? 'off' : 'on'))}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 md:gap-2 md:px-3 md:text-xs"
            >
              {answersMode === 'on' ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              <span>{answersMode === 'on' ? t('storage.showAnswers') : t('storage.hideAnswers')}</span>
              <span
                className={`qs-switch-track ${answersMode === 'on' ? 'is-on' : ''}`}
              >
                <span className="qs-switch-knob" />
              </span>
            </button>
          </div>
        </div>

        {/* ===================== CONTENT ===================== */}
        <div className={rootClass}>
          {(courseLoading || isLoading) && filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
              {t('selector.loading')}
            </div>
          )}

          {!courseLoading && !isLoading && filtered.length === 0 && (
            <EmptyState onReset={handleResetFilters} />
          )}

          {filtered.length > 0 && (
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              {filtered.map((q) => (
                <QuizCard
                  key={`${q.quiz_source}:${q.quiz_id}`}
                  item={q}
                  locale={locale}
                  isWrongTab={segment === 'wrong'}
                  answersMode={answersMode}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-16" />
      </div>
    </div>
  )
}

/* =====================================================================
   서브 컴포넌트
   ===================================================================== */

function SegBtn({
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
      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 md:gap-1.5 md:px-5 md:py-1.5 ${
        active
          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
          : 'text-gray-500 hover:text-gray-900'
      }`}
    >
      {children}
    </button>
  )
}

function Chip({
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
      className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? 'border-[#6366F1] bg-[#EEF2FF] text-[#4F46E5]'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}

function QuizCard({
  item,
  locale,
  isWrongTab,
  answersMode,
}: {
  item: QuizStorageItem
  locale: string
  isWrongTab: boolean
  answersMode: AnswersMode
}) {
  const t = useTranslations('myQuiz')
  const display = toDisplaySource(item.quiz_source)
  const meta = display ? SOURCE_META[display] : SOURCE_META['lecture-content']
  const sourceLabel = display ? t(`storage.sourceLabels.${SOURCE_LABEL_KEY[display]}`) : ''
  const lectureLabel = item.lecture_name ?? ''
  const typeLabel = STORAGE_TYPES.includes(item.quiz_type)
    ? t(`storage.typeLabels.${item.quiz_type}`)
    : ''
  const question =
    locale === 'en' && item.question_eng ? item.question_eng : item.question
  const explanation =
    locale === 'en' && item.explanation_eng ? item.explanation_eng : item.explanation
  const sortedChoices = [...item.choices].sort(
    (a, b) => a.choice_order - b.choice_order,
  )

  // 인라인 풀이 — 다시 들어오면 reset (component state). 오답 탭 + answersMode='off' 일 때만 가능.
  const [attemptIdx, setAttemptIdx] = useState<number | null>(null)
  const [explanationOpen, setExplanationOpen] = useState(false)

  const canSolve = isWrongTab && answersMode === 'off' && attemptIdx == null
  // 풀이 후 또는 정답표시 ON 이면 채점 결과 표시
  const showResults = answersMode === 'on' || attemptIdx != null

  const handleChoiceClick = async (idx: number, isCorrect: boolean) => {
    if (!canSolve) return
    setAttemptIdx(idx)
    if (!item.lecture_id) return
    try {
      await updateCorrect(
        'incorrect',
        item.quiz_id,
        item.lecture_id,
        isCorrect,
        idx + 1,  // 1-based
        null,
      )
    } catch {
      // silent — 활동 로그 적재 실패는 사용자에게 영향 없음
    }
  }

  return (
    <article className="group relative rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Top row — 점 세개 메뉴 제거 (오답 삭제 차단) */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${meta.pillBg} ${meta.pillText}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {sourceLabel}
          </span>
          {(lectureLabel || typeLabel) && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-gray-400">
                {[lectureLabel, typeLabel].filter(Boolean).join(' · ')}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {item.is_wrong && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-[#C2410C]">
              <X className="h-3 w-3" />
              {t('storage.wrongBadge')}{item.wrong_count > 0 ? t('storage.wrongCountSuffix', { count: item.wrong_count }) : ''}
            </span>
          )}
          {item.is_bookmark && (
            <span
              className="rounded-lg p-1.5 text-blue-500"
              title={t('storage.bookmarkTitle')}
            >
              <Bookmark className="h-4 w-4 fill-current" />
            </span>
          )}
        </div>
      </div>

      {/* Question */}
      <h3 className="mb-3 text-sm font-bold leading-relaxed text-gray-900 dark:text-gray-100">
        {question}
      </h3>

      {/* Choices — 오답 탭 정답표시 OFF 상태에서 클릭하면 채점 + 색상 표시 + INSERT */}
      <ol className="space-y-1">
        {sortedChoices.map((c, idx) => {
          const order = idx + 1
          const isCorrect = c.is_correct
          // attempt 가 있으면 그 index, 없으면 stored selected (answersMode='on' 케이스용)
          const isMine = attemptIdx != null
            ? attemptIdx === idx
            : (answersMode === 'on' && item.selected_answer === idx)
          const text = locale === 'en' && c.choice_text_eng ? c.choice_text_eng : c.choice_text

          // 채점 결과 색상 (showResults 시) — answers-on / answers-off 클래스로 CSS 분기
          // 단, attemptIdx 가 있을 때는 강제로 answers-on 처럼 보여야 하므로 inline 처리
          const choiceClass = canSolve
            ? 'qs-choice-row cursor-pointer hover:bg-gray-50'
            : 'qs-choice-row'

          return (
            <li
              key={c.choice_id}
              className={choiceClass}
              data-correct={isCorrect ? 'true' : 'false'}
              data-mine={isMine ? 'true' : 'false'}
              data-show-results={showResults ? 'true' : 'false'}
              onClick={canSolve ? () => handleChoiceClick(idx, isCorrect) : undefined}
            >
              <span className="qs-choice-num">{order}</span>
              <span className="qs-choice-text">{text}</span>
              <span className="qs-answer-badge">{t('storage.answerBadge')}</span>
              <span className="qs-mine-badge">{t('storage.myChoice')}</span>
              <span className="qs-mine-indicator">
                <span>•</span>{t('storage.iChose')}
              </span>
            </li>
          )
        })}
      </ol>

      {/* Footer — 다시 풀기 → 해설 보기 (expand) */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
        <span className="text-gray-400">
          {formatRelative(isWrongTab ? (item.last_wrong_at ?? item.last_activity_at) : item.last_activity_at, t)}
          {item.is_bookmark && item.is_wrong
            ? t('storage.favAndWrong')
            : item.is_bookmark
              ? t('storage.favOnly')
              : t('storage.wrongOnly')}
        </span>
        <button
          onClick={() => setExplanationOpen((o) => !o)}
          className="inline-flex items-center gap-1 font-semibold text-[#6366F1] hover:text-[#4F46E5]"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          {explanationOpen ? t('storage.closeExplanation') : t('storage.showExplanation')}
          {explanationOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Explanation — expand 시 카드 내부에 펼쳐짐 (아래 카드들이 자연스럽게 밀려남, grid layout 덕분) */}
      {explanationOpen && (
        <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t('storage.explanation')}</p>
          {explanation ? (
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">
              {explanation}
            </p>
          ) : (
            <p className="text-gray-400">{t('storage.noExplanation')}</p>
          )}
          {/* exam_prep 출처는 explanation 필드에 이미 "1번:, 2번:..." 형식 전체 분석이 들어있어
              choice_explanation 까지 출력하면 동일 내용이 두 번 나옴 → 선지별 분석 섹션 생략 */}
          {item.quiz_source !== 'exam_prep' &&
            sortedChoices.some((c) => c.choice_explanation || c.choice_explanation_eng) && (
            <ul className="mt-3 space-y-1.5 border-t border-gray-200 pt-2.5 dark:border-gray-700">
              {sortedChoices.map((c, idx) => {
                const exp =
                  locale === 'en' && c.choice_explanation_eng
                    ? c.choice_explanation_eng
                    : c.choice_explanation
                if (!exp) return null
                return (
                  <li key={c.choice_id} className="text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      {t('storage.coreTestNo', { n: idx + 1 })}
                      {c.is_correct ? t('storage.correctSuffix') : ''}:
                    </span>{' '}
                    {exp}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  const t = useTranslations('myQuiz')
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
        <Bookmark className="h-6 w-6 text-gray-300" />
      </div>
      <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">
        {t('storage.emptyTitle')}
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        {t('storage.emptyDesc')}
      </p>
      <button
        onClick={onReset}
        className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5]"
      >
        {t('storage.resetFilters')}
      </button>
    </div>
  )
}
