/**
 * @file QuizTabContainer.tsx
 * @description 회차별 학습 - 퀴즈 탭 컨테이너
 *   교수자가 생성한 AI 퀴즈를 유형별로 나열하며, 즐겨찾기/풀이결과를 StudentQuizCard로 표시한다.
 * @module features/lecture-study/components/containers
 * @dependencies instructorQuizService, quizStatusService, StudentQuizCard
 */

'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Loader2, HelpCircle, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { trackQuizAttempt } from '@/shared/hooks/useAnalytics'
import { quizAnalytics, bookmarkAnalytics } from '@/shared/lib/analytics'
import {
  getInstructorQuizzes,
  type InstructorQuizItem,
  type InstructorQuizType,
} from '../../services/instructorQuizService'
import {
  getQuizStatusByLecture,
  toggleBookmark,
  updateCorrect,
  grantReward,
  getBookmarksByLecture,
  type QuizStatus,
} from '../../services/quizStatusService'
import { StudentQuizCard, type StudentQuizItem } from '@/shared/components/quiz'
import { FlameRewardModal } from '../ui/FlameRewardModal'

interface QuizTabContainerProps {
  lectureId: string
  courseId: string
  courseTitle?: string
  weekNumber?: number | null
  sessionNumber?: number | null
}

const TYPE_ORDER: InstructorQuizType[] = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'STRUCTURE_OBJ',
  'MISCONCEPTION',
]

/** InstructorQuizItem → StudentQuizItem 변환 */
function toStudentQuiz(quiz: InstructorQuizItem): StudentQuizItem {
  return {
    quiz_id: quiz.quiz_id,
    quiz_type: quiz.quiz_type,
    question: quiz.question,
    answer: null,
    explanation: quiz.explanation,
    difficulty: quiz.difficulty,
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
  const t = useTranslations('lectureStudy.quiz')
  const { locale } = useI18n()

  // 보상 판정이 중복 호출되지 않도록 ref로 관리
  const rewardCheckingRef = useRef(false)

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
      }

      if (bookmarkResult.data) {
        const bSet = new Set<string>()
        for (const b of bookmarkResult.data) {
          bSet.add(b.quiz_id)
        }
        setBookmarkSet(bSet)
      }

      setIsLoading(false)
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [lectureId, locale])

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

  // 풀이 결과 업데이트 + 보상 판정
  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean, answer: number) => {
      const quiz = quizzes.find(q => q.quiz_id === quizId)
      trackQuizAttempt({
        quiz_id: quizId,
        correct: isCorrect,
        quiz_type: quiz?.quiz_type ?? '',
        lecture_id: lectureId,
        course_id: courseId,
      })
      quizAnalytics.answer(lectureId, { question_index: quizzes.findIndex(q => q.quiz_id === quizId), correct: isCorrect, duration_ms: 0, quiz_type: quiz?.quiz_type ?? '' })

      const current = statusMap.get(quizId)

      // 낙관적 업데이트
      setStatusMap((prev) => {
        const next = new Map(prev)
        next.set(quizId, {
          quiz_id: quizId,
          quiz_source: 'content',
          correct: isCorrect,
          answer,
        })
        return next
      })

      const result = await updateCorrect('content', quizId, lectureId, isCorrect, answer)
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
      if (!rewardCheckingRef.current) {
        const updatedMap = new Map(statusMap)
        updatedMap.set(quizId, {
          quiz_id: quizId,
          quiz_source: 'content',
          correct: isCorrect,
          answer,
        })

        const allAnswered =
          quizzes.length > 0 &&
          quizzes.every((q) => updatedMap.get(q.quiz_id)?.correct != null)

        if (allAnswered) {
          const correctCount = Array.from(updatedMap.values()).filter(s => s.correct === true).length
          quizAnalytics.complete(lectureId, { total_duration_ms: 0, accuracy: correctCount / quizzes.length, question_count: quizzes.length })
          rewardCheckingRef.current = true
          const rewardResult = await grantReward(lectureId, 'content')
          rewardCheckingRef.current = false
          if (rewardResult.data?.rewarded) {
            setShowRewardModal(true)
          }
        }
      }
    },
    [statusMap, lectureId, quizzes],
  )

  // 선택 해제(리셋)
  const handleResetAnswer = useCallback(
    async (quizId: string) => {
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
    [statusMap, lectureId],
  )

  // 유형별로 그룹화 (정의된 순서대로)
  const groupedQuizzes = useMemo(() => {
    const groups: { type: InstructorQuizType; items: InstructorQuizItem[] }[] = []

    for (const type of TYPE_ORDER) {
      const items = quizzes.filter((q) => q.quiz_type === type)
      if (items.length > 0) {
        groups.push({ type, items })
      }
    }

    return groups
  }, [quizzes])

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

  // 전체 문항 번호를 위한 카운터
  let globalIndex = 0

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-6 pb-24">
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
      {groupedQuizzes.map((group) => (
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
                <StudentQuizCard
                  key={quiz.quiz_id}
                  quiz={toStudentQuiz(quiz)}
                  index={idx}
                  isBookmarked={bookmarkSet.has(quiz.quiz_id)}
                  isCorrect={status?.correct ?? null}
                  selectedAnswer={status?.answer ?? null}
                  onBookmarkToggle={handleBookmarkToggle}
                  onCorrectUpdate={handleCorrectUpdate}
                  onResetAnswer={handleResetAnswer}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
