/**
 * @file QuizFilterBar.tsx
 * @description 회차 퀴즈 상단 바 — 문항 수 표시 + 전체 문제 초기화 (필터·풀이 범위 UI 비노출)
 * @module features/lecture-study/components/ui
 * @dependencies domain/filterQuizzes (타입만), lucide-react
 */

'use client'

import { RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { InstructorQuizType } from '../../services/instructorQuizService'
import type {
  QuizAnswerFormat,
  QuizFilterState,
  QuizScopeMode,
  QuizSourcePageGroup,
} from '../../domain/filterQuizzes'

export interface QuizFilterBarProps {
  /** 회차 전체 문항 수 */
  totalCount: number
  /** 필터를 통과한 문항 수 */
  filteredCount: number
  /** 실제 노출 중인 문항 수 (풀이 범위 적용 후) */
  visibleCount: number
  availableTypes: InstructorQuizType[]
  availableFormats: QuizAnswerFormat[]
  availablePages: number[]
  /** 자료별로 묶은 페이지 그룹. 비어 있으면(자료 메타 미확보) 평면 목록으로 폴백. */
  pageGroups: QuizSourcePageGroup[]
  filter: QuizFilterState
  activeFilterCount: number
  scope: QuizScopeMode
  onToggleType: (type: InstructorQuizType) => void
  onToggleFormat: (format: QuizAnswerFormat) => void
  onToggleBookmarkedOnly: () => void
  onTogglePage: (page: number) => void
  onResetFilter: () => void
  onScopeChange: (scope: QuizScopeMode) => void
  /** '전체 문제 초기화' — 회차 전 문항의 풀이 기록을 리셋(확인 모달은 상위에서 처리) */
  onRetryAll: () => void
}

/**
 * 퀴즈 필터·풀이 범위 UI 는 노출하지 않는다(회차 전 문항을 항상 그대로 보여주는 정책).
 * 상위 컨테이너의 필터 상태·핸들러는 그대로 두고 이 컴포넌트에서만 렌더를 생략하므로,
 * 필터를 되살릴 때는 이 파일만 원복하면 된다. props 계약은 유지한다.
 */
export function QuizFilterBar({ totalCount, onRetryAll }: QuizFilterBarProps) {
  const t = useTranslations('lectureStudy.quiz')

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {t('filter.totalCount', { total: totalCount })}
      </span>
      <button
        type="button"
        onClick={onRetryAll}
        className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
      >
        <RotateCcw className="h-3 w-3" />
        {t('filter.retryAll')}
      </button>
    </div>
  )
}
