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
  type QuizStatus,
} from '../../services/quizStatusService'
import { StudentQuizCard, type StudentQuizItem } from '@/shared/components/quiz'

interface QuizTabContainerProps {
  lectureId: string
}

const TYPE_ORDER: InstructorQuizType[] = [
  'DEF_TO_TERM',
  'TERM_TO_DEF',
  'STRUCTURE_OBJ',
  'MISCONCEPTION',
  'RECALL',
  'STRUCTURE',
]

/** InstructorQuizItem → StudentQuizItem 변환 */
function toStudentQuiz(quiz: InstructorQuizItem): StudentQuizItem {
  return {
    quiz_id: quiz.quiz_id,
    quiz_type: quiz.quiz_type,
    question: quiz.question,
    answer: quiz.answer,
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

export function QuizTabContainer({ lectureId }: QuizTabContainerProps) {
  const [quizzes, setQuizzes] = useState<InstructorQuizItem[]>([])
  const [statusMap, setStatusMap] = useState<Map<string, QuizStatus>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const t = useTranslations('lectureStudy.quiz')
  const { locale } = useI18n()

  // 보상 판정이 중복 호출되지 않도록 ref로 관리
  const rewardCheckingRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function fetchData() {
      setIsLoading(true)
      setError(null)
      setQuizzes([])
      setStatusMap(new Map())

      // 퀴즈 + 상태를 병렬 조회
      const [quizResult, statusResult] = await Promise.all([
        getInstructorQuizzes(lectureId, locale),
        getQuizStatusByLecture(lectureId, 'instructor'),
      ])

      if (cancelled) return

      if (quizResult.error) {
        setError(quizResult.error.message)
        setIsLoading(false)
        return
      }

      setQuizzes(quizResult.data ?? [])

      if (statusResult.data) {
        const map = new Map<string, QuizStatus>()
        for (const s of statusResult.data) {
          map.set(s.quiz_id, s)
        }
        setStatusMap(map)
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
      const current = statusMap.get(quizId)
      const newBookmark = !(current?.bookmark ?? false)

      // 낙관적 업데이트
      setStatusMap((prev) => {
        const next = new Map(prev)
        next.set(quizId, {
          quiz_id: quizId,
          quiz_source: 'instructor',
          bookmark: newBookmark,
          correct: current?.correct ?? null,
        })
        return next
      })

      const result = await toggleBookmark('instructor', quizId, lectureId, newBookmark)
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
      }
    },
    [statusMap, lectureId],
  )

  // 풀이 결과 업데이트 + 보상 판정
  const handleCorrectUpdate = useCallback(
    async (quizId: string, isCorrect: boolean) => {
      const current = statusMap.get(quizId)

      // 낙관적 업데이트
      setStatusMap((prev) => {
        const next = new Map(prev)
        next.set(quizId, {
          quiz_id: quizId,
          quiz_source: 'instructor',
          bookmark: current?.bookmark ?? false,
          correct: isCorrect,
        })
        return next
      })

      const result = await updateCorrect('instructor', quizId, lectureId, isCorrect)
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

      // 보상 판정: 모든 instructor 퀴즈가 정답이면 reward 요청
      if (isCorrect && !rewardCheckingRef.current) {
        // 현재 업데이트 포함해서 전체 판정
        const updatedMap = new Map(statusMap)
        updatedMap.set(quizId, {
          quiz_id: quizId,
          quiz_source: 'instructor',
          bookmark: current?.bookmark ?? false,
          correct: isCorrect,
        })

        const allCorrect =
          quizzes.length > 0 &&
          quizzes.every((q) => updatedMap.get(q.quiz_id)?.correct === true)

        if (allCorrect) {
          rewardCheckingRef.current = true
          await grantReward(lectureId)
          rewardCheckingRef.current = false
        }
      }
    },
    [statusMap, lectureId, quizzes],
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
                  isBookmarked={status?.bookmark ?? false}
                  isCorrect={status?.correct ?? null}
                  onBookmarkToggle={handleBookmarkToggle}
                  onCorrectUpdate={handleCorrectUpdate}
                />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
