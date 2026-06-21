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
import { useParams, useSearchParams } from 'next/navigation'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'

type View = 'landing' | 'wizard' | 'session-detail'
type SessionsViewMode = 'cards' | 'list'

const SESSIONS_VIEW_KEY = 'createQuizSessionsView'

const ALLOWED_QUIZ_TYPES = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'MISCONCEPTION',
  'STRUCTURE_OBJ',
] as const

// 미풀이 누적 생성 제한(프론트 소프트 가드): 안 푼 생성 문항(Σ 생성−푼)이 이 값 이상이면
// 새 퀴즈 생성을 막는다. 사행성 거래/과생성(생성만 하고 안 푸는) 비용·DB부하 방지 목적.
// 백엔드 UNSOLVED_QUIZ_LIMIT 와 동일 임계.
const UNSOLVED_BLOCK_THRESHOLD = 30

/** type_counts 합계를 target 으로 비례 축소한다 (정수, 합계 정확히 target). 일일 한도 잔여만큼 부분 생성용. */
function trimCounts(
  counts: Record<string, number>,
  target: number,
): Record<string, number> {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  if (total <= target) return { ...counts }
  const scaled = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => [k, (v * target) / total] as [string, number])
  const result: Record<string, number> = {}
  let assigned = 0
  for (const [k, val] of scaled) {
    const floored = Math.floor(val)
    result[k] = floored
    assigned += floored
  }
  // 내림으로 남은 잔여를 소수부가 큰 순서로 +1 배분 → 합계 정확히 target.
  let rem = target - assigned
  const byFrac = scaled
    .map(([k, val]) => [k, val - Math.floor(val)] as [string, number])
    .sort((a, b) => b[1] - a[1])
  for (let i = 0; i < byFrac.length && rem > 0; i++) {
    result[byFrac[i][0]] += 1
    rem--
  }
  return result
}

interface PartialOffer {
  lectureIds: string[]
  counts: Record<string, number>
  language: 'ko' | 'en'
  remaining: number
}

export default function QuizCreatorContainer() {
  const params = useParams<{ courseId?: string }>()
  const courseIdParam = params?.courseId ?? null
  // 이메일 등 외부 딥링크: ?new=1 → 위저드 바로 진입, &lectureId= → 해당 회차 사전 선택
  const searchParams = useSearchParams()
  const wantNewQuiz = searchParams?.get('new') === '1'
  const deepLinkLectureId = searchParams?.get('lectureId') ?? null
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

  const [view, setView] = useState<View>(wantNewQuiz ? 'wizard' : 'landing')
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
  // 미풀이(잔여) 한도 차단 전용 팝업 — 이 가드에 걸렸을 때만 노출.
  const [unsolvedBlock, setUnsolvedBlock] = useState(false)
  // 일일 한도 잔여만큼 줄여서 생성할지 확인 제안 (429 + 잔여>0 시)
  const [partialOffer, setPartialOffer] = useState<PartialOffer | null>(null)

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
  // courses 는 fetchCourses 호출 시마다 새 참조로 변경되므로 useCallback deps 에 넣으면
  // fetchSessions 가 매번 재생성되어 아래 useEffect 가 다회 발동 → setSessions([]) 깜빡임.
  // courses 는 ref 로 우회하여 fetchSessions 의 안정적 참조를 보장한다.
  const coursesRef = useRef(courses)
  coursesRef.current = courses

  const fetchSessions = useCallback(async () => {
    if (!selectedCourseId) return
    setIsLoadingSessions(true)
    const result = await myQuizService.getSessions()
    if (result.error || !result.data) {
      setIsLoadingSessions(false)
      return
    }
    const lectures =
      coursesRef.current.find((c) => c.course_id === selectedCourseId)?.lectures ?? []
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
  }, [selectedCourseId, fetchSolvingStats])

  // selectedCourseId 가 실제로 변경된 경우에만 sessions 비움 (강좌 간 데이터 섞임 방지).
  // 동일 selectedCourseId 로 fetchSessions 가 재호출되는 케이스(예: refresh)에서는 빈 상태
  // 깜빡임을 만들지 않도록 setSessions([]) 호출 조건부.
  const prevSelectedCourseIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (
      prevSelectedCourseIdRef.current !== null &&
      prevSelectedCourseIdRef.current !== selectedCourseId
    ) {
      setSessions([])
    }
    prevSelectedCourseIdRef.current = selectedCourseId
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

  // CREATING 세션이 있을 때만 3초 폴링.
  // sessions.length 와 courses 를 deps 에 두면 setSessions 호출마다 useEffect 재실행 →
  // setInterval 이 매 polling 사이클마다 재생성되어 깜빡임 발생. ref 로 우회.
  useEffect(() => {
    if (!selectedCourseId) return
    if (pollStartTimeRef.current === null && hasCreatingRef.current) {
      pollStartTimeRef.current = Date.now()
    }
    const MAX_POLL_MS = 5 * 60 * 1000

    const interval = setInterval(async () => {
      if (!hasCreatingRef.current) return  // CREATING 없으면 idle (interval 은 유지)
      if (
        pollStartTimeRef.current !== null &&
        Date.now() - pollStartTimeRef.current > MAX_POLL_MS
      ) {
        pollStartTimeRef.current = null
        setPollingTimedOut(true)
        return
      }
      const lectures =
        coursesRef.current.find((c) => c.course_id === selectedCourseId)?.lectures ?? []
      const courseLectureIds = new Set(lectures.map((l) => l.lecture_id))
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
        pollStartTimeRef.current = null
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [selectedCourseId, fetchSolvingStats])

  // ─── 세션 액션 ───
  // 삭제 확인 다이얼로그 — 삭제 버튼 클릭 시 바로 지우지 않고 확인을 먼저 받는다.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteId || isDeleting) return
    setIsDeleting(true)
    await handleDelete(pendingDeleteId)
    setIsDeleting(false)
    setPendingDeleteId(null)
  }, [pendingDeleteId, isDeleting, handleDelete])

  // ─── 생성 실행 (위저드 제출 / 부분생성 확인 공용) ───
  const runCreate = useCallback(
    async (
      lectureIds: string[],
      counts: Record<string, number>,
      language: 'ko' | 'en',
    ) => {
      const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)
      if (totalCount === 0) {
        setCreateError(t('error.createFailed'))
        setIsCreating(false)
        return
      }
      setIsCreating(true)
      setCreateError(null)

      const result = await myQuizService.createSession(lectureIds, counts, language)
      if (result.error || !result.data) {
        // 일일 한도 초과(429) + 잔여 한도가 남아있으면 "그만큼만 생성" 확인 제안.
        if (result.status === 429) {
          const detail = result.error as {
            error_code?: string
            limit?: number
            used?: number
          } | null
          // 미풀이(잔여) 한도 차단 → 전용 팝업 (이 가드에 걸렸을 때만).
          if (detail?.error_code === 'UNSOLVED_QUIZ_LIMIT_EXCEEDED') {
            setUnsolvedBlock(true)
            setIsCreating(false)
            return
          }
          const limit = detail?.limit ?? 1000
          const used = detail?.used ?? limit
          const remaining = Math.max(0, limit - used)
          if (remaining > 0 && remaining < totalCount) {
            setPartialOffer({
              lectureIds,
              counts: trimCounts(counts, remaining),
              language,
              remaining,
            })
            setIsCreating(false)
            return
          }
        }
        const errorMsg =
          result.status === 429
            ? t('create.dailyLimit')
            : result.status === 400
              ? t('create.noSnapshot')
              : t('error.createFailed')
        setCreateError(errorMsg)
        setIsCreating(false)
        return
      }

      const newSession: QuizSession = {
        session_id: result.data.session_id,
        student_id: '',
        lecture_id: lectureIds[0],
        lecture_ids: lectureIds,
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
    [t, selectedCourseId],
  )

  // ─── 위저드 제출 ───
  const handleWizardSubmit = useCallback(
    async (
      lectureIds: string[],
      typeCounts: Record<string, number>,
      language: 'ko' | 'en',
    ) => {
      if (isCreating) return
      if (lectureIds.length === 0) return

      // 미풀이 누적 가드: 안 푼 생성 문항(Σ 생성−푼)이 임계 이상이면 새 생성 차단.
      // solvingStatsMap 은 완료 세션의 {생성(total)/푼(answered)} 통계 — 추가 조회 없이 계산.
      let unsolved = 0
      for (const st of solvingStatsMap.values()) {
        unsolved += Math.max(0, (st.total ?? 0) - (st.answered ?? 0))
      }
      if (unsolved >= UNSOLVED_BLOCK_THRESHOLD) {
        setUnsolvedBlock(true)
        return
      }

      const safeCounts: Record<string, number> = {}
      for (const type of ALLOWED_QUIZ_TYPES) {
        // 유형별 상한 없음 — 총합(MAX_TOTAL_COUNT=60)은 위저드에서 제한.
        safeCounts[type] = Math.max(0, typeCounts[type] ?? 0)
      }
      if (Object.values(safeCounts).reduce((a, b) => a + b, 0) === 0) {
        setCreateError(t('error.createFailed'))
        return
      }

      // analytics.generate 는 단일 lecture_id 시그니처 — 대표(첫) 회차로 기록.
      customQuizAnalytics.generate({
        lecture_id: lectureIds[0],
        type_counts: safeCounts,
        course_id: selectedCourseId ?? undefined,
      })

      await runCreate(lectureIds, safeCounts, language)
    },
    [isCreating, runCreate, selectedCourseId, t, solvingStatsMap],
  )

  // 부분 생성 확인 → 줄인 문항 수로 재생성
  const confirmPartial = useCallback(() => {
    if (!partialOffer) return
    const { lectureIds, counts, language } = partialOffer
    setPartialOffer(null)
    void runCreate(lectureIds, counts, language)
  }, [partialOffer, runCreate])

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
      return t('landing.lectureWeek', { no: lecture.lecture_no })
    },
    [selectedCourse, t],
  )

  const getLectureFull = useCallback(
    (lectureId: string): string => {
      if (!selectedCourse) return ''
      const lecture = selectedCourse.lectures.find(
        (l) => l.lecture_id === lectureId,
      )
      if (!lecture) return ''
      return lecture.title
        ? t('landing.lectureWeekWithTitle', {
            no: lecture.lecture_no,
            title: lecture.title,
          })
        : t('landing.lectureWeek', { no: lecture.lecture_no })
    },
    [selectedCourse, t],
  )

  // ─── 세션 회차 라벨 (다중 회차 지원) ───
  // lecture_ids 가 있으면 회차 번호들을 "1·2·3주차" 형식으로 전체 표시(압축 없음).
  // 없으면 기존 단일 lecture_id 폴백 (하위 호환).
  const getSessionLectureLabel = useCallback(
    (session: QuizSession): string => {
      const ids =
        session.lecture_ids && session.lecture_ids.length > 0
          ? session.lecture_ids
          : [session.lecture_id]
      if (ids.length <= 1) return getLectureLabel(ids[0])
      if (!selectedCourse) return t('session.multiLectureCount', { count: ids.length })
      const nos = ids
        .map(
          (id) =>
            selectedCourse.lectures.find((l) => l.lecture_id === id)?.lecture_no,
        )
        .filter((n): n is number => n != null)
        .sort((a, b) => a - b)
      if (nos.length === 0) return t('session.multiLectureCount', { count: ids.length })
      // 선택한 회차 전체를 "1·2·3주차" 형식으로 표시 (압축하지 않음)
      return t('landing.lectureWeek', { no: nos.join('·') })
    },
    [getLectureLabel, selectedCourse, t],
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
    // 다중 회차 세션이면 회차 라벨을 합쳐서 표시, 단일이면 기존 단일 라벨.
    const isMultiLecture = (session?.lecture_ids?.length ?? 0) > 1
    const lectureLabel = isMultiLecture
      ? getSessionLectureLabel(session!)
      : lecture
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

  // 미풀이(잔여) 한도 차단 팝업 — 이 가드에 걸렸을 때만 노출. wizard/landing 공용.
  const unsolvedBlockDialog = (
    <Dialog
      open={unsolvedBlock}
      onOpenChange={(open) => {
        if (!open) setUnsolvedBlock(false)
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('create.gamblingBlockTitle')}</DialogTitle>
          <DialogDescription>{t('create.gamblingBlock')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={() => setUnsolvedBlock(false)}
            className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5]"
          >
            {t('create.gamblingBlockConfirm')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  if (view === 'wizard') {
    // 콘텐츠 생성 완료 회차만 노출 (is_available !== false). 미준비 회차는 숨김.
    const lectures = (selectedCourse?.lectures ?? [])
      .filter((l) => l.is_available !== false)
      .slice()
      .sort((a, b) => a.lecture_no - b.lecture_no)
    return (
      <>
        {unsolvedBlockDialog}
        <QuizCreatorWizard
          lectures={lectures}
          initialLectureId={deepLinkLectureId}
          isSubmitting={isCreating}
          error={createError}
          onSubmit={handleWizardSubmit}
          onBack={() => {
            setCreateError(null)
            setView('landing')
          }}
        />
      </>
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

      {/* 미풀이(잔여) 한도 차단 팝업 */}
      {unsolvedBlockDialog}

      {/* 일일 한도 잔여만큼 부분 생성 확인 */}
      <Dialog
        open={partialOffer !== null}
        onOpenChange={(open) => {
          if (!open) setPartialOffer(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('create.partialTitle')}</DialogTitle>
            <DialogDescription>
              {t('create.partialDesc', { remaining: partialOffer?.remaining ?? 0 })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setPartialOffer(null)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              {t('create.partialCancel')}
            </button>
            <button
              type="button"
              onClick={confirmPartial}
              className="rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#4F46E5]"
            >
              {t('create.partialConfirm', { remaining: partialOffer?.remaining ?? 0 })}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <div className="mx-auto max-w-6xl px-4 py-5 md:px-8 md:py-8">
        {/* Page header */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 md:mb-6 md:gap-6">
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs text-gray-500 dark:text-gray-400 md:mb-2 md:text-sm">
              {t('landing.subtitle')}
            </p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50 md:text-4xl xl:text-5xl">
              {t('landing.pageTitle')}
            </h1>
          </div>
          <div className="flex shrink-0 items-end gap-4 pb-1 md:gap-8 md:pb-2">
            <div className="text-right">
              <p className="mb-0.5 text-[11px] text-gray-400 dark:text-gray-500 md:mb-1 md:text-xs">
                {t('landing.generatedSessions')}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-50 md:text-2xl">
                <span className="text-[#6366F1]">{stats.total}</span>
                <span className="ml-1 text-sm text-gray-500 dark:text-gray-400 md:text-base">
                  {t('landing.sessionUnit')}
                </span>
              </p>
            </div>
            {stats.averageScore != null && (
              <div className="text-right">
                <p className="mb-0.5 text-[11px] text-gray-400 dark:text-gray-500 md:mb-1 md:text-xs">
                  {t('landing.averageScore')}
                </p>
                <p className="text-lg font-bold text-emerald-600 md:text-2xl">
                  {stats.averageScore}
                  <span className="ml-0.5 text-sm text-gray-500 dark:text-gray-400 md:text-base">
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
          className="qcl-hero group relative mb-6 flex min-h-[140px] w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 md:mb-8 md:min-h-[180px] md:p-6"
        >
          <div className="flex flex-1 flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm md:h-14 md:w-14">
                <Plus className="h-5 w-5 text-[#6366F1] md:h-7 md:w-7" />
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 md:mb-1.5 md:text-[11px]">
                  {t('landing.heroEyebrow')}
                </p>
                <h2 className="mb-1 text-lg font-black text-gray-900 dark:text-gray-50 md:mb-1.5 md:text-2xl">
                  {t('landing.heroTitle')}
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-300 md:text-sm">
                  {t('landing.heroDescription')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 md:pr-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-semibold text-[#4F46E5] md:px-3 md:py-1.5 md:text-xs">
                <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5" />
                {t('landing.estimateBadge')}
              </span>
              <ArrowRight className="h-4 w-4 text-[#6366F1] transition-transform group-hover:translate-x-1 md:h-5 md:w-5" />
            </div>
          </div>
        </button>

        {/* Sessions section header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-50 md:text-xl">
              {t('session.title')}
            </h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300 md:px-2.5 md:text-xs">
              {sessions.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 md:px-3 md:py-2 md:text-xs">
              <ArrowUpDown className="h-3.5 w-3.5" />
              {t('sort.newest')}
            </button>
            <div className="hidden h-5 w-px bg-gray-200 dark:bg-gray-700 sm:block" />
            {/* View toggle */}
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setSessionsView('cards')}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold md:px-2.5 md:py-1.5 md:text-xs ${
                  sessionsView === 'cards'
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('landing.viewCard')}</span>
              </button>
              <button
                onClick={() => setSessionsView('list')}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold md:px-2.5 md:py-1.5 md:text-xs ${
                  sessionsView === 'list'
                    ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('landing.viewList')}</span>
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
              {t('selector.loading')}
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
                    lectureLabel={getSessionLectureLabel(s)}
                    onSelect={() => {
                      setSelectedSessionId(s.session_id)
                      setView('session-detail')
                    }}
                    onDelete={() => setPendingDeleteId(s.session_id)}
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
                  <div className="col-span-1">{t('landing.colStatus')}</div>
                  <div className="col-span-4">{t('landing.colTitle')}</div>
                  <div className="col-span-2">{t('landing.colLecture')}</div>
                  <div className="col-span-2">{t('landing.colResult')}</div>
                  <div className="col-span-2">{t('landing.colCreated')}</div>
                  <div className="col-span-1 text-right" />
                </div>
                {sessions.map((s) => (
                  <SessionListRow
                    key={s.session_id}
                    session={s}
                    stats={solvingStatsMap.get(s.session_id) ?? null}
                    lectureLabel={getSessionLectureLabel(s)}
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

      {/* 세션 삭제 확인 다이얼로그 */}
      {pendingDeleteId && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={isDeleting ? undefined : () => setPendingDeleteId(null)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-50">
              {t('landing.deleteConfirmTitle')}
            </h3>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
              {t('landing.deleteConfirmMessage')}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId(null)}
                disabled={isDeleting}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                {t('landing.deleteConfirmCancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('landing.deleteConfirmYes')}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const t = useTranslations('myQuiz')
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
    // 문항당 ~5초 (60문항 ≈ 5분). 실제 생성이 그리 오래 걸리지 않음.
    const remainingMin = Math.max(
      0,
      Math.ceil(((session.quiz_count - (session.generated_count ?? 0)) * 5) / 60),
    )
    return (
      <article className="relative rounded-2xl border border-blue-200 bg-blue-50/30 p-5 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[#4F46E5]">
              {lectureLabel}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-400">
              {t('session.quizCount', { count: session.quiz_count })}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {remainingMin > 0 && (
              <span className="text-[11px] font-medium text-gray-400">
                {t('card.remainingMin', { min: remainingMin })}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('session.creating')}
            </span>
          </div>
        </div>
        <h3 className="mb-1 truncate text-base font-bold text-gray-900 dark:text-gray-50">
          {session.title || t('card.newSessionTitle')}
        </h3>
        <p className="mb-3 text-xs text-gray-400">
          <Calendar className="inline h-3 w-3" /> {t('card.startedJustNow')}
        </p>
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-500">{t('card.aiProgress')}</span>
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
          <Sparkles className="inline h-3 w-3" /> {t('card.aiWriting')}
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
            <span className="text-gray-400">{t('card.creationAttempt')}</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">
            <AlertTriangle className="h-3 w-3" />
            {t('session.failed')}
          </span>
        </div>
        <h3 className="mb-1 truncate text-base font-bold text-red-700">
          {t('card.creationError')}
        </h3>
        <p className="mb-3 text-xs text-red-500">
          {t('card.creationErrorDesc')}
        </p>
        <div className="flex items-center justify-between border-t border-red-100 pt-3 text-xs">
          <span className="text-gray-400">{formattedDate}</span>
          <button
            onClick={onDelete}
            className="font-semibold text-red-500 hover:text-red-700"
          >
            {t('landing.delete')}
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
          <span className="text-gray-400">
            {t('session.quizCount', { count: session.quiz_count })}
          </span>
          {/* 진행도 배지 — 휴지통(우상단 absolute)과 겹치지 않게 문항 수 오른쪽으로 이동 */}
          {!(isSolvingComplete && scorePercent != null) && (
            stats && stats.answered > 0 ? (
              <>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <Clock className="h-3 w-3" />
                  {t('session.solvingInProgress')}
                </span>
              </>
            ) : (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">{t('session.solvingNotStarted')}</span>
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
        {session.title || t('card.lectureSessionTitle', { lecture: lectureLabel })}
      </h3>
      <p className="mb-3 text-xs text-gray-400">
        <Calendar className="inline h-3 w-3" />{' '}
        {t('card.createdOn', { date: formattedDate })}
      </p>

      {stats && stats.answered > 0 && !isSolvingComplete && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-500">{t('session.progressRate')}</span>
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
            ? t('card.solvingComplete')
            : stats && stats.answered > 0
              ? t('card.accuracy', {
                  percent:
                    stats.answered > 0
                      ? Math.round((stats.correct / stats.answered) * 100)
                      : 0,
                  correct: stats.correct,
                  answered: stats.answered,
                })
              : t('card.questionsWaiting', { count: session.quiz_count })}
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
            ? t('session.viewResult')
            : stats && stats.answered > 0
              ? t('session.continueSession')
              : t('card.startSolving')}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute top-4 right-4 rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        title={t('landing.delete')}
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
  const t = useTranslations('myQuiz')
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
    <span className="text-xs text-gray-400">{t('session.solvingNotStarted')}</span>
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
    resultNode = (
      <span className="text-xs text-red-500">{t('card.insufficientData')}</span>
    )
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
          ? t('card.creationError')
          : session.title ||
            t('card.lectureSessionTitle', { lecture: lectureLabel })}
      </div>
      <div className="col-span-2 text-xs text-gray-500">
        {lectureLabel} · {t('session.quizCount', { count: session.quiz_count })}
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
  const t = useTranslations('myQuiz')
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-900">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5F3FF] to-[#E0E7FF]">
        <Pencil className="h-7 w-7 text-[#6366F1]" />
      </div>
      <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-gray-50">
        {t('landing.emptyTitle')}
      </h3>
      <p className="mb-5 text-sm text-gray-500">
        {t('landing.emptyDesc')}
      </p>
      <button
        onClick={onCreate}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366F1] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4F46E5]"
      >
        <Plus className="h-4 w-4" />
        {t('landing.emptyCta')}
      </button>
    </div>
  )
}
