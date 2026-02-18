/**
 * @file QuizTabContainer.tsx
 * @description 회차별 학습 - 퀴즈 탭 컨테이너
 *   교수자가 생성한 AI 퀴즈를 유형별로 일렬 나열하여 표시한다.
 * @module features/lecture-study/components/containers
 * @dependencies instructorQuizService, InstructorQuizCard
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, HelpCircle } from 'lucide-react'
import {
  getInstructorQuizzes,
  type InstructorQuizItem,
  type InstructorQuizType,
} from '../../services/instructorQuizService'
import { InstructorQuizCard } from '../ui/InstructorQuizCard'

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

const TYPE_SECTION_LABELS: Record<InstructorQuizType, string> = {
  DEF_TO_TERM: '정의 → 용어 퀴즈',
  TERM_TO_DEF: '용어 → 정의 퀴즈',
  STRUCTURE_OBJ: '구조 이해 퀴즈 (객관식)',
  MISCONCEPTION: '오개념 탐지 퀴즈',
  RECALL: '내용 기억 퀴즈 (단답형)',
  STRUCTURE: '구조 이해 퀴즈 (서술형)',
}

export function QuizTabContainer({ lectureId }: QuizTabContainerProps) {
  const [quizzes, setQuizzes] = useState<InstructorQuizItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchQuizzes() {
      setIsLoading(true)
      setError(null)
      setQuizzes([])

      const result = await getInstructorQuizzes(lectureId)
      if (cancelled) return

      if (result.error) {
        setError(result.error.message)
        setIsLoading(false)
        return
      }

      setQuizzes(result.data ?? [])
      setIsLoading(false)
    }

    fetchQuizzes()
    return () => {
      cancelled = true
    }
  }, [lectureId])

  // 유형별로 그룹화 (정의된 순서대로)
  const groupedQuizzes = useMemo(() => {
    const groups: { type: InstructorQuizType; label: string; items: InstructorQuizItem[] }[] = []

    for (const type of TYPE_ORDER) {
      const items = quizzes.filter((q) => q.quiz_type === type)
      if (items.length > 0) {
        groups.push({ type, label: TYPE_SECTION_LABELS[type], items })
      }
    }

    return groups
  }, [quizzes])

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>퀴즈를 불러오는 중입니다...</p>
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
        <p className="text-sm">아직 생성된 퀴즈가 없습니다.</p>
      </div>
    )
  }

  // 전체 문항 번호를 위한 카운터
  let globalIndex = 0

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-6 pb-24">
      {groupedQuizzes.map((group) => (
        <section key={group.type}>
          {/* 유형 섹션 헤더 */}
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-50">
              {group.label}
            </h3>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {group.items.length}문항
            </span>
          </div>

          {/* 퀴즈 카드 목록 */}
          <div className="space-y-3">
            {group.items.map((quiz) => {
              const idx = globalIndex++
              return (
                <InstructorQuizCard key={quiz.quiz_id} quiz={quiz} index={idx} />
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

