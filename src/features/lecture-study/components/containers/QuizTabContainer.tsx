/**
 * @file QuizTabContainer.tsx
 * @description 회차별 학습 - 퀴즈 탭 컨테이너
 *   교수자가 생성한 AI 퀴즈를 유형별로 나열하며, 즐겨찾기/풀이결과를 StudentQuizCard로 표시한다.
 * @module features/lecture-study/components/containers
 * @dependencies instructorQuizService, quizStatusService, StudentQuizCard
 */

'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, HelpCircle, Sparkles, Bot } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/Dialog'
import { useTranslations } from 'next-intl'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { trackQuizAttempt } from '@/shared/hooks/useAnalytics'
import { quizAnalytics, bookmarkAnalytics, quizExtraAnalytics } from '@/shared/lib/analytics'
import {
  getInstructorQuizzes,
  type InstructorQuizItem,
  type InstructorQuizType,
} from '../../services/instructorQuizService'
import { lectureService } from '../../services/lectureService'
import { SourceButton } from '../ui/SourceButton'
import { useSourceNavigation } from '../../hooks/useSourceNavigation'
import {
  getQuizStatusByLecture,
  toggleBookmark,
  updateCorrect,
  grantReward,
  getBookmarksByLecture,
  type QuizStatus,
} from '../../services/quizStatusService'
import { StudentQuizCard, type StudentQuizItem } from '@/shared/components/quiz'
import { useEssayGrading } from '../../hooks/useEssayGrading'
import { hasEssayGradingRecord } from '../../domain/essayGradingView'
import { FlameRewardModal } from '../ui/FlameRewardModal'
import { QuizFilterBar } from '../ui/QuizFilterBar'
import {
  buildQuizSections,
  countActiveQuizFilters,
  getAvailableQuizFormats,
  getAvailableQuizTypes,
  getAvailableSourcePages,
  buildSourcePageGroups,
  type QuizSourceMaterial,
  toggleFilterValue,
  EMPTY_QUIZ_FILTER,
  type QuizAnswerFormat,
  type QuizFilterState,
  type QuizScopeMode,
} from '../../domain/filterQuizzes'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'

interface QuizTabContainerProps {
  lectureId: string
  courseId: string
  courseTitle?: string
  weekNumber?: number | null
  sessionNumber?: number | null
}

/**
 * 이 문항을 풀었다고 볼 수 있는지.
 *
 * 객관식은 정오답이 곧 풀이 기록이지만, 서술형은 채점이 끝나기 전(correct=null)에도
 * 이미 제출된 상태다 — 답안 본문의 존재를 함께 본다. 이 판정이 어긋나면 서술형이
 * 섞인 회차에서 완주 보상이 영영 지급되지 않는다.
 */
function isQuizAnswered(status: QuizStatus | undefined): boolean {
  if (!status) return false
  return status.correct != null || (status.answer_text ?? '').trim() !== ''
}

/** InstructorQuizItem → StudentQuizItem 변환 */
function toStudentQuiz(quiz: InstructorQuizItem): StudentQuizItem {
  return {
    quiz_id: quiz.quiz_id,
    quiz_type: quiz.quiz_type,
    question: quiz.question,
    answer: quiz.model_answer ?? null,
    explanation: quiz.explanation,
    difficulty: quiz.difficulty,
    answer_format: quiz.answer_format ?? 'multiple_choice',
    choices: quiz.choices.map((c) => ({
      choice_id: c.choice_id,
      choice_order: c.choice_order,
      choice_text: c.choice_text,
      is_correct: c.is_correct,
      choice_explanation: c.choice_explanation,
    })),
  }
}

export function QuizTabContainer({ lectureId, courseId, courseTitle, weekNumber, sessionNumber }: QuizTabContainerProps) {
  const [quizzes, setQuizzes] = useState<InstructorQuizItem[]>([])
  const [statusMap, setStatusMap] = useState<Map<string, QuizStatus>>(new Map())
  const [bookmarkSet, setBookmarkSet] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRewardModal, setShowRewardModal] = useState(false)
  // 전체 다시 풀기: 확인 모달 표시 + 카드 강제 리마운트용 키
  const [showRetryConfirm, setShowRetryConfirm] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  // 슬라이드 페이지 필터를 자료명으로 묶기 위한 회차 강의자료 메타
  const [sourceMaterials, setSourceMaterials] = useState<QuizSourceMaterial[]>([])
  // 필터 · 풀이 범위 (클라이언트 사이드 전용 — 추가 API 호출 없음)
  const [filter, setFilter] = useState<QuizFilterState>(EMPTY_QUIZ_FILTER)
  const [scope, setScope] = useState<QuizScopeMode>('all')
  const t = useTranslations('lectureStudy.quiz')
  const tSummary = useTranslations('lectureStudy.summary')
  const { locale } = useI18n()

  const {
    isMobile,
    handleMaterialSourceClick,
    handleRecordingSourceClick,
    totalMaterialPages,
    totalRecordingChunks,
  } = useSourceNavigation(lectureId)

  const setQuizChatContext = useLectureStudyStore(s => s.setQuizChatContext)

  // 서술형 루브릭 채점 — 제출(202) 후 폴링으로 요소별 결과를 받아온다
  const {
    gradingByQuiz,
    submitEssay,
    seedGradings,
    clearGrading,
    resetAll: resetEssayGrading,
  } = useEssayGrading()

  // 보상 판정이 중복 호출되지 않도록 ref로 관리
  const rewardCheckingRef = useRef(false)

  // 퀴즈별 풀이 시작 시점 기록 (duration_ms 계산용)
  const quizStartTimeRef = useRef<Map<string, number>>(new Map())

  // 필터/풀이 범위 변경 시 스크롤 보정용
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // AI튜터 유사문제 추천 딥링크(?quiz=<quiz_id>) — 해당 카드로 스크롤 + 잠깐 하이라이트
  const searchParams = useSearchParams()
  const deepLinkQuizId = searchParams.get('quiz')
  const [highlightQuizId, setHighlightQuizId] = useState<string | null>(null)
  const deepLinkDoneRef = useRef(false)
  const filterBarRef = useRef<HTMLDivElement>(null)

  const weekSessionLabel = weekNumber != null && sessionNumber != null
    ? locale === 'ko'
      ? `${weekNumber}주차 ${String(sessionNumber).padStart(2, '0')}차시`
      : `W${weekNumber} S${String(sessionNumber).padStart(2, '0')}`
    : ''

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      setQuizzes([])
      setStatusMap(new Map())
      // 회차/언어가 바뀌면 필터·풀이 범위도 초기 상태로 되돌린다
      setFilter(EMPTY_QUIZ_FILTER)
      setScope('all')
      // 진행 중이던 채점 폴링도 끊는다 — 이전 회차의 결과가 새 화면에 도착하면 안 된다
      resetEssayGrading()

      // 퀴즈 + 상태 + 즐겨찾기를 병렬 조회
      const [quizResult, statusResult, bookmarkResult] = await Promise.all([
        getInstructorQuizzes(lectureId, locale),
        getQuizStatusByLecture(lectureId, 'content'),
        getBookmarksByLecture(lectureId),
      ])

      if (cancelled) return

      if (quizResult.error) {
        setError(quizResult.error.message)
        setIsLoading(false)
        return
      }

      const loadedQuizzes = quizResult.data ?? []
      setQuizzes(loadedQuizzes)

      if (loadedQuizzes.length > 0) {
        quizAnalytics.start(lectureId, { quiz_type: 'content', question_count: loadedQuizzes.length })
      }

      if (statusResult.data) {
        const map = new Map<string, QuizStatus>()
        for (const s of statusResult.data) {
          map.set(s.quiz_id, s)
        }
        setStatusMap(map)

        // 서술형 채점 결과 복원. grading_status 가 없는 행은 채점 도입 이전 경로로 들어온
        // 자가평가 제출(is_correct=true 센티널)이라 채점 UI 를 그리면 안 된다.
        const essayIds = new Set(
          loadedQuizzes.filter((q) => q.answer_format === 'essay').map((q) => q.quiz_id),
        )
        seedGradings(
          statusResult.data
            .filter((s) => essayIds.has(s.quiz_id) && hasEssayGradingRecord(s.grading_status))
            .map((s) => ({ quizId: s.quiz_id, responseId: s.response_id, source: s })),
        )
      }

      if (bookmarkResult.data) {
        const bSet = new Set<string>()
        for (const b of bookmarkResult.data) {
          bSet.add(b.quiz_id)
        }
        setBookmarkSet(bSet)
      }

      // 모든 퀴즈의 풀이 시작 시간 기록 (재풀이 시에도 duration_ms 측정)
      const now = Date.now()
      for (const q of loadedQuizzes) {
        quizStartTimeRef.current.set(q.quiz_id, now)
      }

      setIsLoading(false)
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [lectureId, locale, seedGradings, resetEssayGrading])

  // 회차 강의자료 메타(파일명 · 페이지 수) — 슬라이드 페이지 필터의 자료별 그룹핑에만 쓴다.
  // 실패 시 빈 배열로 두면 필터가 기존 평면 목록으로 폴백되므로 별도 에러 처리 없음.
  useEffect(() => {
    let cancelled = false
    async function fetchMaterials() {
      const result = await lectureService.getSnapshotSelections(lectureId)
      if (cancelled) return
      setSourceMaterials(
        (result.data?.materials ?? []).map((m) => ({
          material_id: m.material_id,
          original_filename: m.original_filename,
          total_pages: m.total_pages,
        })),
      )
    }
    fetchMaterials()
    return () => {
      cancelled = true
    }
  }, [lectureId])

  // 즐겨찾기 토글
  const handleBookmarkToggle = useCallback(
    async (quizId: string) => {
      const isCurrentlyBookmarked = bookmarkSet.has(quizId)
      const newBookmark = !isCurrentlyBookmarked

      bookmarkAnalytics.toggle(lectureId, { quiz_id: quizId, bookmarked: newBookmark })

      // 낙관적 업데이트
      setBookmarkSet((prev) => {
        const next = new Set(prev)
        if (newBookmark) next.add(quizId)
        else next.delete(quizId)
        return next
      })

      // 추가 시 현재 풀이 상태 복사
      const status = newBookmark ? statusMap.get(quizId) : undefined
      const result = await toggleBookmark(
        'content', quizId, lectureId, newBookmark,
        status?.answer ?? null, status?.correct ?? null,
      )
      if (result.error) {
        // 실패 시 롤백
        setBookmarkSet((prev) => {
          const next = new Set(prev)
          if (isCurrentlyBookmarked) next.add(quizId)
          else next.delete(quizId)
          return next
        })
      }
    },
    [bookmarkSet, lectureId, statusMap],
  )

  /**
   * 회차의 모든 문항을 풀었으면 완주 계측 + 보상을 요청한다 (정답/오답 무관).
   * 객관식·서술형이 각자 상태를 반영한 map 을 넘겨 호출한다 — 최종 판정·멱등 처리는 서버 몫.
   */
  const maybeGrantReward = useCallback(
    async (updatedMap: Map<string, QuizStatus>) => {
      if (rewardCheckingRef.current) return
      const allAnswered =
        quizzes.length > 0 && quizzes.every((q) => isQuizAnswered(updatedMap.get(q.quiz_id)))
      if (!allAnswered) return

      const correctCount = Array.from(updatedMap.values()).filter((s) => s.correct === true).length
      quizAnalytics.complete(lectureId, {
        total_duration_ms: 0,
        accuracy: correctCount / quizzes.length,
        question_count: quizzes.length,
      })
      rewardCheckingRef.current = true
      const rewardResult = await grantReward(lectureId, 'content')
      rewardCheckingRef.current = false
      if (rewardResult.data?.rewarded) {
        setShowRewardModal(true)
      }
    },
    [quizzes, lectureId],
  )

  // 풀이 결과 업데이트 + 보상 판정
  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean, answer: number, answerText?: string) => {
      const quiz = quizzes.find(q => q.quiz_id === quizId)

      // duration_ms 계산 후 시작 시간 갱신 (재풀이 대비)
      const startTime = quizStartTimeRef.current.get(quizId)
      const durationMs = startTime ? Math.round(Date.now() - startTime) : 0
      quizStartTimeRef.current.set(quizId, Date.now())

      trackQuizAttempt({
        quiz_id: quizId,
        correct: isCorrect,
        quiz_type: quiz?.quiz_type ?? '',
        lecture_id: lectureId,
        course_id: courseId,
      })
      quizAnalytics.answer(lectureId, { question_index: quizzes.findIndex(q => q.quiz_id === quizId), correct: isCorrect, duration_ms: durationMs, quiz_type: quiz?.quiz_type ?? '' })

      const current = statusMap.get(quizId)

      // 낙관적 업데이트
      setStatusMap((prev) => {
        const next = new Map(prev)
        next.set(quizId, {
          quiz_id: quizId,
          quiz_source: 'content',
          correct: isCorrect,
          answer,
          answer_text: answerText ?? null,
        })
        return next
      })

      const result = await updateCorrect('content', quizId, lectureId, isCorrect, answer, durationMs, answerText)
      if (result.error) {
        // 실패 시 롤백
        setStatusMap((prev) => {
          const next = new Map(prev)
          if (current) {
            next.set(quizId, current)
          } else {
            next.delete(quizId)
          }
          return next
        })
        return
      }

      // 보상 판정: 모든 content 퀴즈가 풀이되었으면 reward 요청 (정답/오답 무관)
      const updatedMap = new Map(statusMap)
      updatedMap.set(quizId, {
        quiz_id: quizId,
        quiz_source: 'content',
        correct: isCorrect,
        answer,
        answer_text: answerText ?? null,
      })
      await maybeGrantReward(updatedMap)
    },
    [statusMap, lectureId, quizzes, maybeGrantReward],
  )

  /**
   * 서술형 답안 제출 — 답안은 즉시 저장되고 채점은 백그라운드로 돈다(202).
   *
   * 낙관적 상태의 correct 를 null 로 두는 것이 핵심이다. 서술형의 정오답은 이제
   * 서버가 루브릭 점수에서 파생하므로, 화면이 미리 true 라고 적으면 그게 곧 옛 센티널이다.
   */
  const handleEssaySubmit = useCallback(
    async (quizId: string, answerText: string) => {
      const quiz = quizzes.find((q) => q.quiz_id === quizId)

      const startTime = quizStartTimeRef.current.get(quizId)
      const durationMs = startTime ? Math.round(Date.now() - startTime) : 0
      quizStartTimeRef.current.set(quizId, Date.now())

      const current = statusMap.get(quizId)
      const optimistic: QuizStatus = {
        quiz_id: quizId,
        quiz_source: 'content',
        correct: null,
        answer: null,
        answer_text: answerText,
        grading_status: 'pending',
      }
      setStatusMap((prev) => new Map(prev).set(quizId, optimistic))

      const result = await submitEssay(quizId, lectureId, answerText, durationMs)
      if (!result.ok) {
        // 저장 자체가 실패했으면 제출 전으로 되돌린다 — 채점 표시도 훅이 이미 걷어냈다.
        setStatusMap((prev) => {
          const next = new Map(prev)
          if (current) next.set(quizId, current)
          else next.delete(quizId)
          return next
        })
        return
      }

      // 계측은 제출이 서버에 확정된 뒤에만.
      // correct=true 는 기존 서술형 계측과 동일한 값이다 — 제출 시점엔 채점 결과를 모르고,
      // 이 이벤트의 정의를 지금 바꾸면 GA 지표 계열이 여기서 끊긴다. 계측 정의 변경은
      // 별도 결정 사항으로 남긴다(DB user_quiz_response.is_correct 는 이제 실제 판정값이다).
      trackQuizAttempt({
        quiz_id: quizId,
        correct: true,
        quiz_type: quiz?.quiz_type ?? '',
        lecture_id: lectureId,
        course_id: courseId,
      })
      quizAnalytics.answer(lectureId, {
        question_index: quizzes.findIndex((q) => q.quiz_id === quizId),
        correct: true,
        duration_ms: durationMs,
        quiz_type: quiz?.quiz_type ?? '',
      })

      await maybeGrantReward(new Map(statusMap).set(quizId, optimistic))
    },
    [statusMap, lectureId, courseId, quizzes, submitEssay, maybeGrantReward],
  )

  // 선택 해제(리셋)
  const handleResetAnswer = useCallback(
    async (quizId: string) => {
      // 리셋 시 풀이 시작 시간 갱신
      quizStartTimeRef.current.set(quizId, Date.now())
      // 이 문항의 채점 표시도 지운다 — 진행 중이던 폴링도 함께 끊긴다
      clearGrading(quizId)
      const current = statusMap.get(quizId)

      setStatusMap((prev) => {
        const next = new Map(prev)
        next.set(quizId, {
          quiz_id: quizId,
          quiz_source: 'content',
          correct: null,
          answer: null,
        })
        return next
      })

      const result = await updateCorrect('content', quizId, lectureId, null, null)
      if (result.error) {
        setStatusMap((prev) => {
          const next = new Map(prev)
          if (current) {
            next.set(quizId, current)
          } else {
            next.delete(quizId)
          }
          return next
        })
      }
    },
    [statusMap, lectureId, clearGrading],
  )

  // 전체 다시 풀기: 현재 회차의 모든 content 퀴즈 풀이 상태를 초기화한다.
  // user_quiz_response 는 누적 INSERT 구조라, null 응답을 새로 INSERT 하면
  // "최신 응답 = null" 이 되어 미풀이 상태로 보인다(기존 정답/오답 기록은 보존).
  const handleRetryAll = useCallback(async () => {
    setShowRetryConfirm(false)
    const prevMap = statusMap

    // 낙관적 업데이트: 모든 상태 리셋 + 카드 리마운트 + 풀이 시작시간 갱신
    const now = Date.now()
    setStatusMap((prev) => {
      const next = new Map(prev)
      for (const quiz of quizzes) {
        next.set(quiz.quiz_id, {
          quiz_id: quiz.quiz_id,
          quiz_source: 'content',
          correct: null,
          answer: null,
        })
        quizStartTimeRef.current.set(quiz.quiz_id, now)
      }
      return next
    })
    setResetKey((prev) => prev + 1)
    rewardCheckingRef.current = false
    // 모든 문항의 채점 표시·폴링을 함께 걷어낸다
    resetEssayGrading()

    const results = await Promise.allSettled(
      quizzes.map((quiz) => updateCorrect('content', quiz.quiz_id, lectureId, null, null)),
    )
    const hasError = results.some(
      (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error),
    )
    if (hasError) {
      // 일부 실패 시 직전 상태로 롤백
      setStatusMap(prevMap)
    }
  }, [quizzes, lectureId, statusMap, resetEssayGrading])

  // ── 필터 · 풀이 범위 ──
  // 필터 선택지는 실제 존재하는 값만 노출한다 (레거시 유형이 섞인 미재생성 회차 대응)
  const availableTypes = useMemo(() => getAvailableQuizTypes(quizzes), [quizzes])
  const availableFormats = useMemo(() => getAvailableQuizFormats(quizzes), [quizzes])
  const availablePages = useMemo(() => getAvailableSourcePages(quizzes), [quizzes])
  // 페이지 번호는 자료들을 이어붙인 전역 번호라, 자료명으로 묶어 보여주려면 자료 메타가 필요하다.
  // 실패해도 평면 목록으로 폴백되므로 조용히 넘어간다.
  const pageGroups = useMemo(
    () => (sourceMaterials.length > 0 ? buildSourcePageGroups(availablePages, sourceMaterials) : []),
    [availablePages, sourceMaterials],
  )
  const activeFilterCount = countActiveQuizFilters(filter)

  // 필터(AND 조합) + 풀이 범위를 적용한 유형별 섹션
  const { sections, filteredCount, visibleCount } = useMemo(
    () => buildQuizSections(quizzes, filter, bookmarkSet, scope),
    [quizzes, filter, bookmarkSet, scope],
  )

  // 목록 길이가 바뀔 때 화면이 튀지 않도록 필터 영역 기준으로 부드럽게 맞춘다
  const scrollListToFilterBar = useCallback(() => {
    const container = scrollContainerRef.current
    const filterBar = filterBarRef.current
    if (!container || !filterBar) return
    // offsetParent 에 의존하지 않도록 rect 차이로 컨테이너 내부 오프셋을 계산
    const target =
      filterBar.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop
    // 이미 필터 영역이 보이는 위치면 그대로 둔다 (불필요한 스크롤 방지)
    if (container.scrollTop <= target) return
    container.scrollTo({ top: target, behavior: 'smooth' })
  }, [])

  const handleToggleType = useCallback((type: InstructorQuizType) => {
    setFilter((prev) => ({ ...prev, types: toggleFilterValue(prev.types, type) }))
    scrollListToFilterBar()
  }, [scrollListToFilterBar])

  const handleToggleFormat = useCallback((format: QuizAnswerFormat) => {
    setFilter((prev) => ({ ...prev, formats: toggleFilterValue(prev.formats, format) }))
    scrollListToFilterBar()
  }, [scrollListToFilterBar])

  const handleToggleBookmarkedOnly = useCallback(() => {
    setFilter((prev) => ({ ...prev, bookmarkedOnly: !prev.bookmarkedOnly }))
    scrollListToFilterBar()
  }, [scrollListToFilterBar])

  const handleTogglePage = useCallback((page: number) => {
    setFilter((prev) => ({ ...prev, pages: toggleFilterValue(prev.pages, page) }))
    scrollListToFilterBar()
  }, [scrollListToFilterBar])

  const handleResetFilter = useCallback(() => {
    setFilter(EMPTY_QUIZ_FILTER)
    scrollListToFilterBar()
  }, [scrollListToFilterBar])

  const handleScopeChange = useCallback((next: QuizScopeMode) => {
    setScope(next)
    scrollListToFilterBar()
  }, [scrollListToFilterBar])

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>{t('loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-gray-400">
        {error}
      </div>
    )
  }

  if (quizzes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400 dark:text-gray-500">
        <HelpCircle className="h-10 w-10" />
        <p className="text-sm">{t('empty')}</p>
      </div>
    )
  }

  // 딥링크 대상 카드로 스크롤 — scrollIntoView 는 hidden 조상까지 스크롤시키는 사고가 있어
  // (2026-08-22 대화 화면 실측) 컨테이너 scrollTop 을 직접 계산한다.
  useEffect(() => {
    if (!deepLinkQuizId || deepLinkDoneRef.current || quizzes.length === 0) return
    const container = scrollContainerRef.current
    if (!container) return
    const target = container.querySelector<HTMLElement>(`[data-quiz-id="${CSS.escape(deepLinkQuizId)}"]`)
    if (!target) return
    deepLinkDoneRef.current = true
    const cRect = container.getBoundingClientRect()
    const tRect = target.getBoundingClientRect()
    container.scrollTo({ top: container.scrollTop + (tRect.top - cRect.top) - 16, behavior: 'smooth' })
    setHighlightQuizId(deepLinkQuizId)
    const timer = setTimeout(() => setHighlightQuizId(null), 2500)
    return () => clearTimeout(timer)
  }, [deepLinkQuizId, quizzes])

  // 전체 문항 번호를 위한 카운터
  let globalIndex = 0

  return (
    <div ref={scrollContainerRef} className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-6 pb-24">
      {showRewardModal && (
        <FlameRewardModal
          courseName={courseTitle ?? ''}
          weekSession={weekSessionLabel}
          onClose={() => setShowRewardModal(false)}
        />
      )}
      {/* AI 퀴즈 안내 문구 */}
      <div className="flex items-center gap-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 px-4 py-3">
        <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
        <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          {t('aiGeneratedNotice')}
        </p>
      </div>

      {/* 필터 + 풀이 범위 선택 (전체 문제 초기화 버튼 포함) */}
      <div ref={filterBarRef}>
        <QuizFilterBar
          totalCount={quizzes.length}
          filteredCount={filteredCount}
          visibleCount={visibleCount}
          availableTypes={availableTypes}
          availableFormats={availableFormats}
          availablePages={availablePages}
          pageGroups={pageGroups}
          filter={filter}
          activeFilterCount={activeFilterCount}
          scope={scope}
          onToggleType={handleToggleType}
          onToggleFormat={handleToggleFormat}
          onToggleBookmarkedOnly={handleToggleBookmarkedOnly}
          onTogglePage={handleTogglePage}
          onResetFilter={handleResetFilter}
          onScopeChange={handleScopeChange}
          onRetryAll={() => setShowRetryConfirm(true)}
        />
      </div>

      {/* 필터 결과 0건 */}
      {sections.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 px-6 py-10 text-gray-400 dark:text-gray-500">
          <HelpCircle className="h-8 w-8" />
          <p className="text-sm">{t('filter.noResult')}</p>
          <button
            type="button"
            onClick={handleResetFilter}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
          >
            {t('filter.reset')}
          </button>
        </div>
      )}

      {sections.map((group) => (
        <section key={group.type}>
          {/* 유형 섹션 헤더 */}
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">
              {t(`sectionLabel.${group.type}`)}
            </h3>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {t('itemCount', { count: group.items.length })}
            </span>
          </div>

          {/* 퀴즈 카드 목록 */}
          <div className="space-y-3">
            {group.items.map((quiz) => {
              const idx = globalIndex++
              const status = statusMap.get(quiz.quiz_id)
              return (
                <div
                  key={`${quiz.quiz_id}-${resetKey}`}
                  data-quiz-id={quiz.quiz_id}
                  className={highlightQuizId === quiz.quiz_id
                    ? 'rounded-2xl ring-2 ring-indigo-400 ring-offset-2 transition-shadow'
                    : undefined}
                >
                <StudentQuizCard
                  quiz={toStudentQuiz(quiz)}
                  index={idx}
                  isBookmarked={bookmarkSet.has(quiz.quiz_id)}
                  isCorrect={status?.correct ?? null}
                  selectedAnswer={status?.answer ?? null}
                  essayAnswer={status?.answer_text ?? null}
                  essayGrading={gradingByQuiz[quiz.quiz_id] ?? null}
                  onBookmarkToggle={handleBookmarkToggle}
                  onCorrectUpdate={handleCorrectUpdate}
                  onEssaySubmit={handleEssaySubmit}
                  onResetAnswer={handleResetAnswer}
                  onRevealToggle={(quizId, shown) => {
                    quizExtraAnalytics.revealToggle(lectureId, { quiz_id: quizId, shown, quiz_source: 'content' })
                  }}
                  renderAnswerExtra={
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      {quiz.source && (quiz.source.source_pages?.length ?? 0) > 0 && (
                        <SourceButton
                          label={tSummary('sourceButtonMaterials')}
                          tooltipId={`quiz-material-source-${quiz.quiz_id}`}
                          tooltipContent={tSummary('sourceTooltipPages', { pages: quiz.source.source_pages!.join(', ') })}
                          disabled={false}
                          disabledClick={false}
                          onClick={() =>
                            handleMaterialSourceClick(
                              `quiz-${quiz.quiz_id}`,
                              quiz.source?.source_pages ?? [],
                              totalMaterialPages,
                            )
                          }
                        />
                      )}
                      {quiz.source && (quiz.source.source_chunks?.length ?? 0) > 0 && (
                        <SourceButton
                          label={tSummary('sourceButtonRecordings')}
                          tooltipId={`quiz-recording-source-${quiz.quiz_id}`}
                          tooltipContent={tSummary('sourceTooltipChunks', { chunks: quiz.source.source_chunks!.join(', ') })}
                          disabled={false}
                          disabledClick={false}
                          onClick={() =>
                            handleRecordingSourceClick(
                              `quiz-${quiz.quiz_id}`,
                              quiz.source?.source_chunks ?? [],
                              totalRecordingChunks,
                              // 청크 본문이 로케일별이므로 인용도 로케일에 맞춰 전달
                              locale === 'en'
                                ? quiz.source?.source_quotes_eng
                                : quiz.source?.source_quotes,
                            )
                          }
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          quizExtraAnalytics.askAiClick(lectureId, { quiz_id: quiz.quiz_id, quiz_type: quiz.quiz_type })
                          const isEssayQuiz = quiz.answer_format === 'essay'
                          setQuizChatContext({
                            quizId: quiz.quiz_id,
                            quizIndex: idx,
                            courseTitle: courseTitle ?? '',
                            weekNumber: weekNumber ?? 0,
                            sessionNumber: sessionNumber ?? 0,
                            question: quiz.question,
                            explanation: quiz.explanation,
                            // 서술형은 선지가 없으므로 생략하고 모범답안을 대신 전달
                            ...(isEssayQuiz
                              ? { modelAnswer: quiz.model_answer ?? undefined }
                              : {
                                  choices: quiz.choices.map(c => ({
                                    choice_order: c.choice_order,
                                    choice_text: c.choice_text,
                                    is_correct: c.is_correct,
                                    choice_explanation: c.choice_explanation,
                                  })),
                                }),
                            source: quiz.source ?? {},
                          })
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                      >
                        <Bot className="h-3 w-3" />
                        {t('askAiChatbot')}
                      </button>
                    </div>
                  }
                />
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* 전체 다시 풀기 확인 모달 */}
      <Dialog open={showRetryConfirm} onOpenChange={setShowRetryConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('retryAllConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('retryAllConfirm')}
              <span className="mt-2 block text-xs text-gray-400 dark:text-gray-500">
                {t('retryAllConfirmNote')}
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setShowRetryConfirm(false)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('retryAllCancel')}
            </button>
            <button
              type="button"
              onClick={handleRetryAll}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              {t('retryAllConfirmCta')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
