/**
 * @file QuizCreatorContainer.tsx
 * @description 문제 만들기 — 랜딩(세션 목록 + Hero CTA) ↔ 위저드 ↔ 세션 상세
 * @module features/my-quiz/components/containers
 * @dependencies myQuizService, useCourseAndLecture, QuizCreatorWizard, SessionDetailView
 *
 * IA (2026-04-30 리뉴얼):
 *   - landing: 페이지 헤더 + 통계 + Hero CTA + 세션 그리드/리스트 (카드/리스트 토글)
 *   - wizard:  Hero CTA 클릭 시 진입. 회차 → 유형 → 언어 → 생성
 *   - session-detail: 기존 SessionDetailView 그대로 재사용
 */

'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type SVGProps,
} from 'react'
import { useParams } from 'next/navigation'
import { useFormatter, useTranslations } from 'next-intl'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock,
  LayoutGrid,
  List,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/shared/hooks/useToast'
import { customQuizAnalytics } from '@/shared/lib/analytics'
import * as myQuizService from '../../services/myQuizService'
import * as statusService from '../../services/myQuizStatusService'
import type { SessionSolvingStats } from '../../services/myQuizStatusService'
import type { QuizSession } from '../../types'
import { useCourseAndLecture } from '../../hooks/useCourseAndLecture'
import QuizCreatorWizard from './QuizCreatorWizard'
import SessionDetailView from './SessionDetailView'

type View = 'landing' | 'wizard' | 'session-detail'
type SessionsViewMode = 'cards' | 'list'

const SESSIONS_VIEW_KEY = 'createQuizSessionsView'

const ALLOWED_QUIZ_TYPES = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'MISCONCEPTION',
  'STRUCTURE_OBJ',
] as const

export default function QuizCreatorContainer() {
  const params = useParams<{ courseId?: string }>()
  const courseIdParam = params?.courseId ?? null
  const t = useTranslations('myQuiz')
  const format = useFormatter()
  const { toasts, error: showErrorToast } = useToast()

  const {
    courses,
    selectedCourse,
    selectedCourseId,
    isLoading: courseLoading,
  } = useCourseAndLecture(courseIdParam)
  // URL effect 폐기 — useCourseAndLecture(courseIdParam) 가 직접 처리.
  // 이전 구현은 자동 첫강좌 선택 → URL 보정 두 단계로 selectedCourseId 가 두 번 변경되어
  // fetchSessions 두 번 실행 + 깜빡임 발생.

  const [view, setView] = useState<View>('landing')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const [sessions, setSessions] = useState<QuizSession[]>([])
  const [solvingStatsMap, setSolvingStatsMap] = useState<Map<string, SessionSolvingStats>>(
    new Map(),
  )
  // 초기 true — 빈 상태 잠깐 보였다 갱신되는 깜빡임 방지
  const [isLoadingSessions, setIsLoadingSessions] = useState(true)
  const [pollingTimedOut, setPollingTimedOut] = useState(false)
  const pollStartTimeRef = useRef<number | null>(null)

  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // localStorage 복원 — lazy initializer 로 첫 렌더부터 정확한 값 사용 (깜빡임 방지)
  const [sessionsView, setSessionsView] = useState<SessionsViewMode>(() => {
    if (typeof window === 'undefined') return 'cards'
    const v = window.localStorage.getItem(SESSIONS_VIEW_KEY)
    return v === 'list' ? 'list' : 'cards'
  })
  useEffect(() => {
    try {
      localStorage.setItem(SESSIONS_VIEW_KEY, sessionsView)
    } catch {}
  }, [sessionsView])

  // ─── 풀이 통계 ───
  const fetchSolvingStats = useCallback(async (list: QuizSession[]) => {
    const completedIds = list
      .filter((s) => s.status === 'COMPLETED')
      .map((s) => s.session_id)
    if (completedIds.length === 0) {
      setSolvingStatsMap(new Map())
      return
    }
    const result = await statusService.getSessionSolvingStats(completedIds)
    if (result.data) setSolvingStatsMap(result.data)
  }, [])

  // ─── 세션 목록 ───
  // 주의: selectedCourse 는 courses.find(...) 결과로 매 렌더마다 새 참조라
  // useCallback deps 에 넣으면 매 렌더 새 fetchSessions 가 생성되어 useEffect 무한 재실행 → 깜빡임.
  // courses 와 selectedCourseId 만 deps 로 두고 lectures 는 함수 내부에서 lookup.
  const fetchSessions = useCallback(async () => {
    if (!selectedCourseId) return
    setIsLoadingSessions(true)
    const result = await myQuizService.getSessions()
    if (result.error || !result.data) {
      setIsLoadingSessions(false)
      return
    }
    const lectures = courses.find((c) => c.course_id === selectedCourseId)?.lectures ?? []
    const courseLectureIds = new Set(lectures.map((l) => l.lecture_id))
    const filtered = (result.data.sessions ?? [])
      .filter((s) => courseLectureIds.has(s.lecture_id))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
    setSessions(filtered)
    setIsLoadingSessions(false)
    fetchSolvingStats(filtered)
  }, [selectedCourseId, courses, fetchSolvingStats])

  useEffect(() => {
    setSessions([])
    setPollingTimedOut(false)
    if (selectedCourseId) {
      fetchSessions()
    } else if (!courseLoading) {
      // 강좌 로딩 끝났는데 selectedCourseId 가 없으면 로딩 해제 (수강 강좌 0건 케이스)
      setIsLoadingSessions(false)
    }
  }, [selectedCourseId, fetchSessions, courseLoading])

  // ─── CREATING 폴링 ───
  const hasCreatingRef = useRef(false)
  hasCreatingRef.current = sessions.some((s) => s.status === 'CREATING')

  useEffect(() => {
    if (!hasCreatingRef.current || !selectedCourseId) return
    if (pollStartTimeRef.current === null) pollStartTimeRef.current = Date.now()
    setPollingTimedOut(false)
    const MAX_POLL_MS = 5 * 60 * 1000

    const lectures = courses.find((c) => c.course_id === selectedCourseId)?.lectures ?? []
    const courseLectureIds = new Set(lectures.map((l) => l.lecture_id))

    const interval = setInterval(async () => {
      if (
        pollStartTimeRef.current !== null &&
        Date.now() - pollStartTimeRef.current > MAX_POLL_MS
      ) {
        clearInterval(interval)
        pollStartTimeRef.current = null
        setPollingTimedOut(true)
        return
      }
      const result = await myQuizService.getSessions()
      if (!result.data) return
      const filtered = (result.data.sessions ?? [])
        .filter((s) => courseLectureIds.has(s.lecture_id))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .map((s) =>
          s.status === 'CREATING' &&
          s.generated_count != null &&
          s.generated_count >= s.quiz_count
            ? { ...s, status: 'COMPLETED' as const }
            : s,
        )
      setSessions(filtered)
      fetchSolvingStats(filtered)
      const stillCreating = filtered.some((s) => s.status === 'CREATING')
      if (!stillCreating) {
        clearInterval(interval)
        pollStartTimeRef.current = null
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedCourseId, courses, sessions.length, fetchSolvingStats])

  // ─── 세션 액션 ───
  const handleDelete = useCallback(
    async (sessionId: string) => {
      const result = await myQuizService.deleteSession(sessionId)
      if (result.error) {
        showErrorToast(t('error.deleteFailed'))
        return
      }
      setSessions((prev) => prev.filter((s) => s.session_id !== sessionId))
    },
    [showErrorToast, t],
  )

  // ─── 위저드 제출 ───
  const handleWizardSubmit = useCallback(
    async (
      lectureId: string,
      typeCounts: Record<string, number>,
      language: 'ko' | 'en',
    ) => {
      if (isCreating) return
      setIsCreating(true)
      setCreateError(null)

      const safeCounts: Record<string, number> = {}
      for (const type of ALLOWED_QUIZ_TYPES) {
        safeCounts[type] = Math.max(0, Math.min(20, typeCounts[type] ?? 0))
      }
      const totalCount = Object.values(safeCounts).reduce((a, b) => a + b, 0)
      if (totalCount === 0) {
        setCreateError(t('error.createFailed'))
        setIsCreating(false)
        return
      }

      customQuizAnalytics.generate({
        lecture_id: lectureId,
        type_counts: safeCounts,
        course_id: selectedCourseId ?? undefined,
      })

      const result = await myQuizService.createSession(
        lectureId,
        safeCounts,
        language,
      )
      if (result.error || !result.data) {
        const errorMsg =
          result.status === 400 ? t('create.noSnapshot') : t('error.createFailed')
        setCreateError(errorMsg)
        setIsCreating(false)
        return
      }

      const newSession: QuizSession = {
        session_id: result.data.session_id,
        student_id: '',
        lecture_id: lectureId,
        course_id: selectedCourseId ?? '',
        generation_batch_id: null,
        language,
        status: 'CREATING',
        quiz_count: totalCount,
        title: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSessions((prev) => [newSession, ...prev])
      setIsCreating(false)
      setView('landing')
    },
    [isCreating, t, selectedCourseId],
  )

  // ─── 통계 ───
  const stats = useMemo(() => {
    const total = sessions.length
    let completedCount = 0
    let scoreSum = 0
    let scoreN = 0
    for (const s of sessions) {
      if (s.status !== 'COMPLETED') continue
      completedCount += 1
      const stat = solvingStatsMap.get(s.session_id)
      if (stat && stat.total > 0 && stat.answered >= stat.total) {
        scoreSum += Math.round((stat.correct / stat.total) * 100)
        scoreN += 1
      }
    }
    const avg = scoreN > 0 ? Math.round(scoreSum / scoreN) : null
    return { total, completedCount, averageScore: avg }
  }, [sessions, solvingStatsMap])

  // ─── 회차 라벨 헬퍼 ───
  const getLectureLabel = useCallback(
    (lectureId: string): string => {
      if (!selectedCourse) return ''
      const lecture = selectedCourse.lectures.find(
        (l) => l.lecture_id === lectureId,
      )
      if (!lecture) return ''
      return `${lecture.lecture_no}주차`
    },
    [selectedCourse],
  )

  const getLectureFull = useCallback(
    (lectureId: string): string => {
      if (!selectedCourse) return ''
      const lecture = selectedCourse.lectures.find(
        (l) => l.lecture_id === lectureId,
      )
      if (!lecture) return ''
      return lecture.title
        ? `${lecture.lecture_no}주차 · ${lecture.title}`
        : `${lecture.lecture_no}주차`
    },
    [selectedCourse],
  )

  // ─── 뷰 분기 ───
  if (view === 'session-detail' && selectedSessionId) {
    const session = sessions.find((s) => s.session_id === selectedSessionId)
    const detailLectureId = session?.lecture_id
    if (!detailLectureId) {
      // fallback
      setView('landing')
      return null
    }
    const lecture = selectedCourse?.lectures.find(
      (l) => l.lecture_id === detailLectureId,
    )
    const lectureLabel = lecture
      ? lecture.title
        ? t('selector.lectureLabelWithTitle', {
            no: lecture.lecture_no,
            title: lecture.title,
          })
        : t('selector.lectureLabel', { no: lecture.lecture_no })
      : ''
    const courseName = selectedCourse
      ? selectedCourse.section
        ? `${selectedCourse.title} (${selectedCourse.section})`
        : selectedCourse.title
      : ''
    return (
      <SessionDetailView
        sessionId={selectedSessionId}
        lectureId={detailLectureId}
        onBack={() => {
          setSelectedSessionId(null)
          setView('landing')
          fetchSolvingStats(sessions)
        }}
        courseName={courseName}
        lectureName={lectureLabel}
        createdAt={session?.created_at}
      />
    )
  }

  if (view === 'wizard') {
    // 콘텐츠 생성 완료 회차만 노출 (is_available !== false). 미준비 회차는 숨김.
    const lectures = (selectedCourse?.lectures ?? [])
      .filter((l) => l.is_available !== false)
      .slice()
      .sort((a, b) => a.lecture_no - b.lecture_no)
    return (
      <QuizCreatorWizard
        lectures={lectures}
        isSubmitting={isCreating}
        error={createError}
        onSubmit={handleWizardSubmit}
        onBack={() => {
          setCreateError(null)
          setView('landing')
        }}
      />
    )
  }

  // ─── LANDING VIEW ───
  return (
    <div className="h-full overflow-y-auto">
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-1">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs text-white shadow-lg"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .qcl-hero {
          background: linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 50%, #E0E7FF 100%);
          border-color: rgba(99, 102, 241, 0.4);
        }
        .qcl-hero:hover { box-shadow: 0 8px 24px rgba(99,102,241,0.18); border-color: #6366F1; }

        @keyframes qcl-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .qcl-shimmer {
          background: linear-gradient(90deg, #93C5FD 0%, #6366F1 50%, #93C5FD 100%);
          background-size: 200% 100%;
          animation: qcl-shimmer 2s linear infinite;
        }

        .qcl-sessions-cards .qcl-grid { display: grid; }
        .qcl-sessions-cards .qcl-list { display: none; }
        .qcl-sessions-list .qcl-grid { display: none; }
        .qcl-sessions-list .qcl-list { display: block; }
      `}</style>

      <div className="mx-auto max-w-6xl px-8 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
              맞춤형 퀴즈를 직접 만들어 학습 효율을 높이세요
            </p>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-gray-50 md:text-5xl">
              문제 만들기
            </h1>
          </div>
          <div className="flex shrink-0 items-end gap-8 pb-2">
            <div className="text-right">
              <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
                생성한 세션
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                <span className="text-[#6366F1]">{stats.total}</span>
                <span className="ml-1 text-base text-gray-500 dark:text-gray-400">
                  개
                </span>
              </p>
            </div>
            {stats.averageScore != null && (
              <div className="text-right">
                <p className="mb-1 text-xs text-gray-400 dark:text-gray-500">
                  평균 점수
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.averageScore}
                  <span className="ml-0.5 text-base text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Hero CTA */}
        <button
          onClick={() => {
            setCreateError(null)
            setView('wizard')
          }}
          className="qcl-hero group relative mb-8 flex min-h-[180px] w-full overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200"
        >
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                <Plus className="h-7 w-7 text-[#6366F1]" />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  CREATE · AI 맞춤 생성
                </p>
                <h2 className="mb-1.5 text-2xl font-black text-gray-900 dark:text-gray-50">
                  새 퀴즈 만들기
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  회차를 선택하고 유형·난이도를 정하면 AI가 즉시 생성해드려요
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pr-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-[#4F46E5]">
                <Sparkles className="h-3.5 w-3.5" />약 1~2분 소요
              </span>
              <ArrowRight className="h-5 w-5 text-[#6366F1] transition-transform group-hover:translate-x-1" />
            </div>
          </div>
        </button>

        {/* Sessions section header */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">
              내 퀴즈 세션
            </h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {sessions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              <ArrowUpDown className="h-3.5 w-3.5" />
              최신순
            </button>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" />
            {/* View toggle */}
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setSessionsView('cards')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  sessionsView === 'cards'
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                카드
              </button>
              <button
                onClick={() => setSessionsView('list')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-semibold ${
                  sessionsView === 'list'
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                리스트
              </button>
            </div>
          </div>
        </div>

        {/* Polling timeout 안내 */}
        {pollingTimedOut && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('session.pollingTimeout')}</span>
          </div>
        )}

        {/* ===== Sessions content ===== */}
        <div
          className={
            sessionsView === 'cards' ? 'qcl-sessions-cards' : 'qcl-sessions-list'
          }
        >
          {(courseLoading || isLoadingSessions) && sessions.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
              <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-gray-400" />
              불러오는 중...
            </div>
          )}

          {!courseLoading && !isLoadingSessions && sessions.length === 0 && (
            <EmptyState onCreate={() => setView('wizard')} />
          )}

          {sessions.length > 0 && (
            <>
              {/* Cards */}
              <div className="qcl-grid grid-cols-1 gap-4 md:grid-cols-2">
                {sessions.map((s) => (
                  <SessionCard
                    key={s.session_id}
                    session={s}
                    stats={solvingStatsMap.get(s.session_id) ?? null}
                    lectureLabel={getLectureLabel(s.lecture_id)}
                    onSelect={() => {
                      setSelectedSessionId(s.session_id)
                      setView('session-detail')
                    }}
                    onDelete={() => handleDelete(s.session_id)}
                    formattedDate={
                      s.created_at
                        ? format.dateTime(new Date(s.created_at), {
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''
                    }
                  />
                ))}
              </div>

              {/* List */}
              <div className="qcl-list overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div className="grid grid-cols-12 gap-2 border-b border-gray-200 bg-gray-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:border-gray-700 dark:bg-gray-800">
                  <div className="col-span-1">상태</div>
                  <div className="col-span-4">제목</div>
                  <div className="col-span-2">회차</div>
                  <div className="col-span-2">결과</div>
                  <div className="col-span-2">생성</div>
                  <div className="col-span-1 text-right" />
                </div>
                {sessions.map((s) => (
                  <SessionListRow
                    key={s.session_id}
                    session={s}
                    stats={solvingStatsMap.get(s.session_id) ?? null}
                    lectureLabel={getLectureLabel(s.lecture_id)}
                    onSelect={() => {
                      setSelectedSessionId(s.session_id)
                      setView('session-detail')
                    }}
                    formattedDate={
                      s.created_at
                        ? format.dateTime(new Date(s.created_at), {
                            month: '2-digit',
                            day: '2-digit',
                          })
                        : ''
                    }
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

function SessionCard({
  session,
  stats,
  lectureLabel,
  onSelect,
  onDelete,
  formattedDate,
}: {
  session: QuizSession
  stats: SessionSolvingStats | null
  lectureLabel: string
  onSelect: () => void
  onDelete: () => void
  formattedDate: string
}) {
  const isCreating = session.status === 'CREATING'
  const isFailed = session.status === 'FAILED'
  const isCompleted = session.status === 'COMPLETED'
  const isSolvingComplete =
    stats != null && stats.total > 0 && stats.answered >= stats.total
  const scorePercent =
    stats && stats.total > 0
      ? Math.round((stats.correct / stats.total) * 100)
      : null

  if (isCreating) {
    const progress =
      session.quiz_count > 0
        ? Math.min(
            100,
            ((session.generated_count ?? 0) / session.quiz_count) * 100,
          )
        : 0
    const remainingMin = Math.max(
      0,
      Math.ceil(((session.quiz_count - (session.generated_count ?? 0)) * 8) / 60),
    )
    return (
      <article className="relative rounded-2xl border border-blue-200 bg-blue-50/30 p-5 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[#4F46E5]">
              {lectureLabel}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">{session.quiz_count}문항</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-600">
            <Loader2 className="h-3 w-3 animate-spin" />
            생성 중
          </span>
        </div>
        <h3 className="mb-1 truncate text-base font-bold text-gray-900 dark:text-gray-50">
          {session.title || '새 퀴즈 세션'}
        </h3>
        <p className="mb-3 text-xs text-gray-400">
          <Calendar className="inline h-3 w-3" /> 방금 시작 · 약 {remainingMin}분 남음
        </p>
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-500">AI 생성 진행</span>
            <span className="font-semibold text-blue-600">
              {session.generated_count ?? 0}/{session.quiz_count}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
            <div
              className="qcl-shimmer h-full rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-blue-600">
          <Sparkles className="inline h-3 w-3" /> AI가 회차 내용에 맞춰 문제를 작성하고 있어요
        </p>
      </article>
    )
  }

  if (isFailed) {
    return (
      <article className="group relative rounded-2xl border border-red-200 bg-red-50/30 p-5 dark:border-red-900 dark:bg-red-950/20">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">
              {lectureLabel}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">생성 시도</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
            <AlertTriangle className="h-3 w-3" />
            실패
          </span>
        </div>
        <h3 className="mb-1 truncate text-base font-bold text-red-700">
          생성 중 오류 발생
        </h3>
        <p className="mb-3 text-xs text-red-500">
          학습 데이터가 충분하지 않거나 일시적인 문제로 생성에 실패했습니다
        </p>
        <div className="flex items-center justify-between border-t border-red-100 pt-3 text-xs">
          <span className="text-gray-400">{formattedDate}</span>
          <button
            onClick={onDelete}
            className="font-semibold text-red-500 hover:text-red-700"
          >
            삭제
          </button>
        </div>
      </article>
    )
  }

  // COMPLETED
  const scoreBadgeClass =
    scorePercent == null
      ? 'bg-gray-100 text-gray-500'
      : scorePercent >= 80
        ? 'bg-emerald-50 text-emerald-600'
        : scorePercent >= 60
          ? 'bg-blue-50 text-blue-600'
          : 'bg-orange-50 text-orange-600'

  return (
    <article
      onClick={onSelect}
      className="group relative cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[#4F46E5]">
            {lectureLabel}
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-400">{session.quiz_count}문항</span>
          {/* 진행도 배지 — 휴지통(우상단 absolute)과 겹치지 않게 문항 수 오른쪽으로 이동 */}
          {!(isSolvingComplete && scorePercent != null) && (
            stats && stats.answered > 0 ? (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <Clock className="h-3 w-3" />
                  진행 중
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">미시작</span>
              </>
            )
          )}
        </div>
        {/* 우상단: 점수% 만 (진행 중/미시작 배지는 좌측으로 이동했음) */}
        {isSolvingComplete && scorePercent != null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${scoreBadgeClass}`}
          >
            <CheckCircle2 className="h-3 w-3" />
            {scorePercent}%
          </span>
        )}
      </div>

      <h3 className="mb-1 truncate text-base font-bold text-gray-900 dark:text-gray-50">
        {session.title || `${lectureLabel} 퀴즈 세션`}
      </h3>
      <p className="mb-3 text-xs text-gray-400">
        <Calendar className="inline h-3 w-3" /> {formattedDate} 생성
      </p>

      {stats && stats.answered > 0 && !isSolvingComplete && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-500">진행률</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {stats.answered}/{stats.total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{
                width: `${stats.total > 0 ? (stats.answered / stats.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs dark:border-gray-800">
        <span className="text-gray-500">
          {isSolvingComplete
            ? '풀이 완료'
            : stats && stats.answered > 0
              ? `정답률 ${
                  stats.answered > 0
                    ? Math.round((stats.correct / stats.answered) * 100)
                    : 0
                }% · ${stats.correct}/${stats.answered}`
              : `${session.quiz_count}문항 대기 중`}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          className={`inline-flex items-center gap-1 font-semibold ${
            isSolvingComplete
              ? 'text-[#6366F1] hover:text-[#4F46E5]'
              : 'rounded-md bg-[#6366F1] px-2.5 py-1 text-white hover:bg-[#4F46E5]'
          }`}
        >
          {isSolvingComplete
            ? '결과 보기'
            : stats && stats.answered > 0
              ? '계속하기'
              : '풀이 시작'}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute top-4 right-4 rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        title="삭제"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </article>
  )
}

function SessionListRow({
  session,
  stats,
  lectureLabel,
  onSelect,
  formattedDate,
}: {
  session: QuizSession
  stats: SessionSolvingStats | null
  lectureLabel: string
  onSelect: () => void
  formattedDate: string
}) {
  const isCreating = session.status === 'CREATING'
  const isFailed = session.status === 'FAILED'
  const isSolvingComplete =
    stats != null && stats.total > 0 && stats.answered >= stats.total
  const scorePercent =
    isSolvingComplete && stats
      ? Math.round((stats.correct / stats.total) * 100)
      : null

  let StatusIcon: ComponentType<SVGProps<SVGSVGElement>> = CircleDashed
  let statusColor = 'bg-gray-100 text-gray-400'
  let resultNode: React.ReactNode = (
    <span className="text-xs text-gray-400">미시작</span>
  )

  if (isCreating) {
    StatusIcon = Loader2
    statusColor = 'bg-blue-100 text-blue-600'
    const progress =
      session.quiz_count > 0
        ? Math.min(
            100,
            ((session.generated_count ?? 0) / session.quiz_count) * 100,
          )
        : 0
    resultNode = (
      <div className="flex items-center gap-1.5">
        <div className="h-1 w-12 overflow-hidden rounded-full bg-blue-100">
          <div className="qcl-shimmer h-full rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-blue-600">
          {session.generated_count ?? 0}/{session.quiz_count}
        </span>
      </div>
    )
  } else if (isFailed) {
    StatusIcon = AlertTriangle
    statusColor = 'bg-red-100 text-red-600'
    resultNode = <span className="text-xs text-red-500">학습 데이터 부족</span>
  } else if (isSolvingComplete && scorePercent != null) {
    StatusIcon = CheckCircle2
    statusColor =
      scorePercent >= 80
        ? 'bg-emerald-50 text-emerald-600'
        : scorePercent >= 60
          ? 'bg-blue-50 text-blue-600'
          : 'bg-orange-50 text-orange-600'
    const badgeColor =
      scorePercent >= 80
        ? 'bg-emerald-50 text-emerald-600'
        : scorePercent >= 60
          ? 'bg-blue-50 text-blue-600'
          : 'bg-orange-50 text-orange-600'
    resultNode = (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${badgeColor}`}
      >
        {scorePercent}%
      </span>
    )
  } else if (stats && stats.answered > 0) {
    StatusIcon = Clock
    statusColor = 'bg-blue-50 text-blue-600'
    const pct = stats.total > 0 ? (stats.answered / stats.total) * 100 : 0
    resultNode = (
      <div className="flex items-center gap-1.5">
        <div className="h-1 w-12 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-semibold text-gray-600">
          {stats.answered}/{stats.total}
        </span>
      </div>
    )
  }

  return (
    <button
      onClick={isCreating || isFailed ? undefined : onSelect}
      disabled={isCreating || isFailed}
      className={`grid w-full grid-cols-12 items-center gap-2 border-b border-gray-100 px-5 py-3 text-left dark:border-gray-800 ${
        isCreating
          ? 'bg-blue-50/20'
          : isFailed
            ? 'bg-red-50/20'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <div className="col-span-1">
        <span
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${statusColor}`}
        >
          <StatusIcon className={`h-3.5 w-3.5 ${isCreating ? 'animate-spin' : ''}`} />
        </span>
      </div>
      <div
        className={`col-span-4 truncate text-sm font-bold ${isFailed ? 'text-red-700' : 'text-gray-900 dark:text-gray-50'}`}
      >
        {isFailed
          ? '생성 중 오류 발생'
          : session.title || `${lectureLabel} 퀴즈 세션`}
      </div>
      <div className="col-span-2 text-xs text-gray-500">
        {lectureLabel} · {session.quiz_count}문항
      </div>
      <div className="col-span-2">{resultNode}</div>
      <div className="col-span-2 text-xs text-gray-400">{formattedDate}</div>
      <div className="col-span-1 flex justify-end">
        {!isCreating && !isFailed && (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </button>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5F3FF] to-[#E0E7FF]">
        <Pencil className="h-7 w-7 text-[#6366F1]" />
      </div>
      <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-50">
        아직 만든 퀴즈가 없어요
      </h3>
      <p className="mb-5 text-sm text-gray-500">
        회차를 골라 약점 보완용 퀴즈를 직접 만들어보세요. 평균 1~2분이면 완성됩니다.
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5]"
      >
        <Plus className="h-4 w-4" />첫 퀴즈 만들기
      </button>
    </div>
  )
}
