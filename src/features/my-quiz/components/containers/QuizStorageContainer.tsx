/**
 * @file QuizStorageContainer.tsx
 * @description 내 퀴즈 저장소 — 즐겨찾기/오답 통합 + 출처/회차/유형 필터 + 카드/리스트 뷰 + 정답 가림 토글
 * @module features/my-quiz/components/containers
 * @dependencies useQuizStorage, useCourseAndLecture, lucide-react
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import {
  ArrowRight,
  ArrowUpDown,
  Bookmark,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  MoreHorizontal,
  SlidersHorizontal,
  X,
  XCircle,
} from 'lucide-react'
import { useCourseAndLecture } from '../../hooks/useCourseAndLecture'
import { useQuizStorage, type QuizStorageItem } from '../../hooks/useQuizStorage'
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
type ViewMode = 'cards' | 'list'
type AnswersMode = 'off' | 'on'

const VIEW_KEY = 'quizStorage:view'
const ANSWERS_KEY = 'quizStorage:answers'

interface SourceMeta {
  label: string
  pillBg: string
  pillText: string
  dot: string
}

const SOURCE_META: Record<Exclude<SourceValue, 'all'>, SourceMeta> = {
  'lecture-content': {
    label: '회차별 학습',
    pillBg: 'bg-[#F5F3FF]',
    pillText: 'text-[#7C3AED]',
    dot: 'bg-[#8B5CF6]',
  },
  'exam-prep': {
    label: '기말 대비 학습',
    pillBg: 'bg-orange-50',
    pillText: 'text-[#C2410C]',
    dot: 'bg-[#F97316]',
  },
  customize: {
    label: '내가 만든 퀴즈',
    pillBg: 'bg-[#EEF2FF]',
    pillText: 'text-[#4F46E5]',
    dot: 'bg-[#6366F1]',
  },
}

/**
 * raw quiz_source → 화면 표시용 카테고리.
 * 'instructor' 는 학생 UI 미노출이므로 null 반환 (필터에서 제거).
 * 'exam_prep' 은 user_quiz_status 에 함께 저장되며, 표시 카테고리는 'exam-prep'.
 */
function toDisplaySource(
  src: 'instructor' | 'content' | 'customize' | 'exam_prep',
): Exclude<SourceValue, 'all'> | null {
  if (src === 'content') return 'lecture-content'
  if (src === 'customize') return 'customize'
  if (src === 'exam_prep') return 'exam-prep'
  return null
}

// 회상(RECALL) + 서술형 구조(STRUCTURE) 는 사용 중단. 객관식 구조(STRUCTURE_OBJ)는 실제로
// 생성되므로 '구조' 라벨로 1회만 노출 (이전에 STRUCTURE + STRUCTURE_OBJ 둘 다 등재되어
// 동일 라벨 "구조" 가 2번 보이던 문제 수정).
// exam_prep 는 quiz_type 메타가 없어 유형 필터 적용 시 자동으로 결과에서 제외된다.
const TYPE_LABELS: Partial<Record<StudentQuizType, string>> = {
  DEF_TO_TERM: '정의→용어',
  TERM_TO_DEF: '용어→정의',
  MISCONCEPTION: '오개념',
  STRUCTURE_OBJ: '구조',
}

function formatRelative(iso: string | null): string {
  if (!iso) return ''
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const day = 24 * 60 * 60 * 1000
  const days = Math.floor(diff / day)
  if (days <= 0) return '오늘'
  if (days === 1) return '어제'
  if (days < 7) return `${days}일 전`
  if (days < 30) return `${Math.floor(days / 7)}주 전`
  return `${Math.floor(days / 30)}달 전`
}

export default function QuizStorageContainer() {
  const params = useParams<{ courseId?: string }>()
  const courseIdParam = params?.courseId ?? null
  const router = useRouter()
  const locale = useLocale()

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
  // 뷰 모드, 정답 모드 — localStorage 복원 (lazy initializer로 첫 렌더부터 정확한 값 사용 → 깜빡임 방지)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'cards'
    const v = window.localStorage.getItem(VIEW_KEY)
    return v === 'list' ? 'list' : 'cards'
  })
  const [answersMode, setAnswersMode] = useState<AnswersMode>(() => {
    if (typeof window === 'undefined') return 'off'
    const a = window.localStorage.getItem(ANSWERS_KEY)
    return a === 'on' ? 'on' : 'off'
  })
  useEffect(() => {
    try { localStorage.setItem(VIEW_KEY, viewMode) } catch {}
  }, [viewMode])
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
    // 정렬
    list = [...list].sort((a, b) => {
      const aT = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0
      const bT = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0
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

  const handleStudy = (q: QuizStorageItem) => {
    if (!q.lecture_id || !q.course_id) return
    // 단순 라우팅 — 회차 학습 페이지로 이동 (간이)
    router.push(`/studyspace/course/${q.course_id}/lecture/${q.lecture_id}`)
  }

  const rootClass = `${viewMode === 'cards' ? 'view-cards' : 'view-list'} ${
    answersMode === 'on' ? 'answers-on' : 'answers-off'
  }`

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

        .answers-on .qs-choice-row[data-correct="true"] { color: rgb(4 120 87); font-weight: 600; }
        .answers-on .qs-choice-row[data-correct="true"] .qs-choice-num {
          background: rgb(209 250 229); border-color: rgb(209 250 229); color: rgb(4 120 87);
        }
        .answers-on .qs-choice-row[data-correct="true"] .qs-answer-badge {
          display: inline; margin-left: auto; color: rgb(5 150 105);
        }

        .answers-on .qs-choice-row[data-mine="true"]:not([data-correct="true"]) {
          color: rgb(225 29 72); font-weight: 600;
        }
        .answers-on .qs-choice-row[data-mine="true"]:not([data-correct="true"]) .qs-choice-num {
          background: rgb(255 228 230); border-color: rgb(255 228 230); color: rgb(225 29 72);
        }
        .answers-on .qs-choice-row[data-mine="true"]:not([data-correct="true"]) .qs-mine-badge {
          display: inline; margin-left: auto; color: rgb(244 63 94);
        }

        .view-cards .qs-grid-cards { display: grid; }
        .view-cards .qs-list-rows { display: none; }
        .view-list .qs-grid-cards { display: none; }
        .view-list .qs-list-rows { display: block; }

        .qs-no-scrollbar::-webkit-scrollbar { display: none; }
        .qs-no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }

        .qs-switch-track { position: relative; display: inline-flex; align-items: center; width: 32px; height: 18px; border-radius: 9999px; background: rgb(209 213 219); transition: background 0.2s; }
        .qs-switch-track.is-on { background: #6366F1; }
        .qs-switch-knob { position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; border-radius: 9999px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: transform 0.2s; }
        .qs-switch-track.is-on .qs-switch-knob { transform: translateX(14px); }
      `}</style>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* ===================== PAGE HEADER ===================== */}
        <div className="mb-6 flex items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              내가 다시 풀어볼 문제 모음 · 출처 무관 통합
            </p>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-gray-50 md:text-5xl">
              내 퀴즈 저장소
            </h1>
          </div>
          <div className="flex shrink-0 items-end gap-8 pb-2">
            <div className="text-right">
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">즐겨찾기</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                <span className="text-[#6366F1]">{totalCounts.fav}</span>
                <span className="ml-1 text-base text-gray-500 dark:text-gray-400">개</span>
              </p>
            </div>
            <div className="text-right">
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">오답</p>
              <p className="text-2xl font-bold text-[#F97316]">{totalCounts.wrong}</p>
            </div>
          </div>
        </div>

        {/* ===================== FILTER BAR ===================== */}
        <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex h-10 items-center rounded-xl bg-gray-100 p-1 text-sm font-semibold dark:bg-gray-800">
              <SegBtn
                active={segment === 'all'}
                onClick={() => setSegment('all')}
              >
                전체 <span className="ml-1 text-xs text-gray-400">{totalCounts.total}</span>
              </SegBtn>
              <SegBtn
                active={segment === 'fav'}
                onClick={() => setSegment('fav')}
              >
                <Bookmark className="h-3.5 w-3.5" />
                즐겨찾기 <span className="text-xs text-gray-400">{totalCounts.fav}</span>
              </SegBtn>
              <SegBtn
                active={segment === 'wrong'}
                onClick={() => setSegment('wrong')}
              >
                <XCircle className="h-3.5 w-3.5" />
                오답 <span className="text-xs text-gray-400">{totalCounts.wrong}</span>
              </SegBtn>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setSortOrder((s) => (s === 'newest' ? 'oldest' : 'newest'))
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortOrder === 'newest' ? '최신순' : '오래된순'}
              </button>
              <button
                onClick={() => setAdvancedOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                필터
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
            <span className="shrink-0 text-xs font-semibold text-gray-400">출처</span>
            <Chip
              active={sourceFilter === 'all'}
              onClick={() => setSourceFilter('all')}
            >
              전체
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
                  {meta.label}
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
                        {rowIdx === 0 ? '핵심테스트' : ''}
                      </span>
                      {rowIdx === 0 && (
                        <Chip
                          active={coreTestFilter.length === 0}
                          onClick={() => setCoreTestFilter([])}
                        >
                          전체
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
                          {n}번
                        </Chip>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="qs-no-scrollbar flex items-center gap-2 overflow-x-auto">
                    <span className="w-12 shrink-0 text-xs font-semibold text-gray-400">회차</span>
                    <Chip
                      active={lectureFilter.length === 0}
                      onClick={() => setLectureFilter([])}
                    >
                      전체
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
                        {l.lecture_no}주차
                      </Chip>
                    ))}
                  </div>

                  <div className="qs-no-scrollbar flex items-center gap-2 overflow-x-auto">
                    <span className="w-12 shrink-0 text-xs font-semibold text-gray-400">유형</span>
                    <Chip active={typeFilter === null} onClick={() => setTypeFilter(null)}>
                      전체
                    </Chip>
                    {(Object.keys(TYPE_LABELS) as StudentQuizType[]).map((tp) => (
                      <Chip
                        key={tp}
                        active={typeFilter === tp}
                        onClick={() => setTypeFilter(tp)}
                      >
                        {TYPE_LABELS[tp]}
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
                  필터 초기화
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===================== TOOLBAR (count + view + answers) ===================== */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="font-semibold text-gray-700 dark:text-gray-300">{filtered.length}개</span>
            <span>의 문제</span>
            <span className="text-gray-300">·</span>
            <span>{sortOrder === 'newest' ? '최신순' : '오래된순'}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setViewMode('cards')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'cards'
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                카드
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  viewMode === 'list'
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                리스트
              </button>
            </div>

            <div className="h-5 w-px bg-gray-200" />

            {/* Answers toggle */}
            <button
              onClick={() => setAnswersMode((m) => (m === 'on' ? 'off' : 'on'))}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            >
              {answersMode === 'on' ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              <span>{answersMode === 'on' ? '정답 표시' : '정답 가림'}</span>
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
              불러오는 중...
            </div>
          )}

          {!courseLoading && !isLoading && filtered.length === 0 && (
            <EmptyState onReset={handleResetFilters} />
          )}

          {filtered.length > 0 && (
            <>
              {/* CARD VIEW */}
              <div className="qs-grid-cards grid-cols-1 gap-4 lg:grid-cols-2">
                {filtered.map((q) => (
                  <QuizCard
                    key={`${q.quiz_source}:${q.quiz_id}`}
                    item={q}
                    locale={locale}
                    onStudy={() => handleStudy(q)}
                  />
                ))}
              </div>

              {/* LIST VIEW */}
              <div className="qs-list-rows overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="grid grid-cols-12 gap-2 border-b border-gray-200 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-800">
                  <div className="col-span-1">상태</div>
                  <div className="col-span-3">출처</div>
                  <div className="col-span-5">문제</div>
                  <div className="col-span-2">시점</div>
                  <div className="col-span-1 text-right" />
                </div>
                {filtered.map((q) => (
                  <QuizListRow
                    key={`${q.quiz_source}:${q.quiz_id}`}
                    item={q}
                    locale={locale}
                    onStudy={() => handleStudy(q)}
                  />
                ))}
              </div>
            </>
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
      className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-1.5 ${
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
  onStudy,
}: {
  item: QuizStorageItem
  locale: string
  onStudy: () => void
}) {
  const display = toDisplaySource(item.quiz_source)
  const meta = display ? SOURCE_META[display] : SOURCE_META['lecture-content']
  const lectureLabel = item.lecture_name ?? ''
  const typeLabel = TYPE_LABELS[item.quiz_type] ?? ''
  const question =
    locale === 'en' && item.question_eng ? item.question_eng : item.question
  const sortedChoices = [...item.choices].sort(
    (a, b) => a.choice_order - b.choice_order,
  )

  return (
    <article className="group relative rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900">
      {/* Top row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${meta.pillBg} ${meta.pillText}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
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
              오답{item.wrong_count > 0 ? ` (${item.wrong_count}회 틀림)` : ''}
            </span>
          )}
          {item.is_bookmark && (
            <button
              className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50"
              title="즐겨찾기"
            >
              <Bookmark className="h-4 w-4 fill-current" />
            </button>
          )}
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-50">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Question */}
      <h3 className="mb-3 text-sm font-bold leading-relaxed text-gray-900 dark:text-gray-100">
        {question}
      </h3>

      {/* Choices */}
      <ol className="space-y-1">
        {sortedChoices.map((c, idx) => {
          const order = idx + 1
          const isCorrect = c.is_correct
          const isMine = item.selected_answer === idx
          const text = locale === 'en' && c.choice_text_eng ? c.choice_text_eng : c.choice_text
          return (
            <li
              key={c.choice_id}
              className="qs-choice-row"
              data-correct={isCorrect ? 'true' : 'false'}
              data-mine={isMine ? 'true' : 'false'}
            >
              <span className="qs-choice-num">{order}</span>
              <span className="qs-choice-text">{text}</span>
              <span className="qs-answer-badge">정답</span>
              <span className="qs-mine-badge">내가 선택</span>
              <span className="qs-mine-indicator">
                <span>•</span>내가 골랐던
              </span>
            </li>
          )
        })}
      </ol>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
        <span className="text-gray-400">
          {formatRelative(item.last_activity_at)}
          {item.is_bookmark && item.is_wrong
            ? ' · 즐겨찾기 + 오답'
            : item.is_bookmark
              ? ' 즐겨찾기'
              : ' 오답'}
        </span>
        <button
          onClick={onStudy}
          className="inline-flex items-center gap-1 font-semibold text-[#6366F1] hover:text-[#4F46E5]"
        >
          다시 풀기
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
}

function QuizListRow({
  item,
  locale,
  onStudy,
}: {
  item: QuizStorageItem
  locale: string
  onStudy: () => void
}) {
  const display = toDisplaySource(item.quiz_source)
  const meta = display ? SOURCE_META[display] : SOURCE_META['lecture-content']
  const question =
    locale === 'en' && item.question_eng ? item.question_eng : item.question

  return (
    <button
      onClick={onStudy}
      className="grid w-full grid-cols-12 items-center gap-2 border-b border-gray-100 px-5 py-3 text-left hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
    >
      <div className="col-span-1 flex items-center gap-1">
        {item.is_bookmark && (
          <Bookmark className="h-4 w-4 fill-current text-blue-500" />
        )}
        {item.is_wrong && (
          <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-orange-50 px-1.5 text-[10px] font-bold text-[#C2410C] whitespace-nowrap">
            <X className="h-3 w-3" />
            오답 ({item.wrong_count}회)
          </span>
        )}
      </div>
      <div className="col-span-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.pillBg} ${meta.pillText}`}
        >
          <span className={`h-1 w-1 rounded-full ${meta.dot}`} />
          {meta.label}
          {item.lecture_name ? ` · ${item.lecture_name}` : ''}
        </span>
      </div>
      <div className="col-span-5 truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
        {question}
      </div>
      <div className="col-span-2 text-xs text-gray-400">
        {formatRelative(item.last_activity_at)}
      </div>
      <div className="col-span-1 flex justify-end">
        <ArrowRight className="h-4 w-4 text-gray-400" />
      </div>
    </button>
  )
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
        <Bookmark className="h-6 w-6 text-gray-300" />
      </div>
      <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-100">
        조건에 맞는 문제가 없어요
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        필터를 줄이거나 다른 출처/회차를 골라보세요.
      </p>
      <button
        onClick={onReset}
        className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F46E5]"
      >
        필터 초기화
      </button>
    </div>
  )
}
