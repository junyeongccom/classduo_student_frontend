/**
 * @file QuizFilterBar.tsx
 * @description 회차 퀴즈 필터(인지유형·문제유형·즐겨찾기·슬라이드 페이지) + 풀이 범위 선택 UI (props 렌더 전용)
 * @module features/lecture-study/components/ui
 * @dependencies domain/filterQuizzes (타입만), lucide-react
 */

'use client'

import { useId, useState, type ReactNode } from 'react'
import { Filter, Star, RotateCcw, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { InstructorQuizType } from '../../services/instructorQuizService'
import type {
  QuizAnswerFormat,
  QuizFilterState,
  QuizScopeMode,
  QuizSourcePageGroup,
} from '../../domain/filterQuizzes'
import { getSelectedScopeCount } from '../../domain/filterQuizzes'

const FORMAT_LABEL_KEY: Record<QuizAnswerFormat, string> = {
  multiple_choice: 'format.multipleChoice',
  essay: 'format.essay',
}

const CHIP_BASE =
  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap'
const CHIP_ON =
  'border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600'
const CHIP_OFF =
  'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'

function Chip({
  label,
  active,
  onClick,
  icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[CHIP_BASE, active ? CHIP_ON : CHIP_OFF, icon ? 'inline-flex items-center gap-1' : ''].join(' ')}
    >
      {icon}
      {label}
    </button>
  )
}

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

export function QuizFilterBar({
  totalCount,
  filteredCount,
  visibleCount,
  availableTypes,
  availableFormats,
  availablePages,
  pageGroups,
  filter,
  activeFilterCount,
  scope,
  onToggleType,
  onToggleFormat,
  onToggleBookmarkedOnly,
  onTogglePage,
  onResetFilter,
  onScopeChange,
  onRetryAll,
}: QuizFilterBarProps) {
  const t = useTranslations('lectureStudy.quiz')
  const [isExpanded, setIsExpanded] = useState(false)
  const panelId = useId()

  const hasActiveFilter = activeFilterCount > 0

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* 헤더: 필터 토글 + 결과 개수 + 초기화 */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={() => setIsExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
        >
          <Filter className="h-3.5 w-3.5" />
          {t('filter.toggle')}
          {hasActiveFilter && (
            <span className="rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {hasActiveFilter
            ? t('filter.resultCount', { filtered: filteredCount, total: totalCount })
            : t('filter.totalCount', { total: totalCount })}
        </span>

        {/* 우측 액션 — 필터 초기화(조건부) + 전체 문제 초기화(풀이 기록 리셋) */}
        <div className="ml-auto inline-flex items-center gap-1">
          {hasActiveFilter && (
            <button
              type="button"
              onClick={onResetFilter}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              {t('filter.reset')}
            </button>
          )}
          <button
            type="button"
            onClick={onRetryAll}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <RotateCcw className="h-3 w-3" />
            {t('filter.retryAll')}
          </button>
        </div>
      </div>

      {/* 필터 패널 */}
      {isExpanded && (
        <div id={panelId} className="flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800 px-3 py-3">
          {availableTypes.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-500">
                {t('filter.groupType')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map((type) => (
                  <Chip
                    key={type}
                    label={t(`typeLabel.${type}`)}
                    active={filter.types.includes(type)}
                    onClick={() => onToggleType(type)}
                  />
                ))}
              </div>
            </div>
          )}

          {availableFormats.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-500">
                {t('filter.groupFormat')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {availableFormats.map((format) => (
                  <Chip
                    key={format}
                    label={t(FORMAT_LABEL_KEY[format])}
                    active={filter.formats.includes(format)}
                    onClick={() => onToggleFormat(format)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-500">
              {t('filter.groupBookmark')}
            </p>
            <Chip
              label={t('filter.bookmarkedOnly')}
              active={filter.bookmarkedOnly}
              onClick={onToggleBookmarkedOnly}
              icon={<Star className={`h-3 w-3 ${filter.bookmarkedOnly ? 'fill-current' : ''}`} />}
            />
          </div>

          <div>
            <p className="mb-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-500">
              {t('filter.groupPage')}
            </p>
            {availablePages.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-500">{t('filter.pageEmpty')}</p>
            ) : pageGroups.length > 0 ? (
              // 자료가 여러 개면 페이지 번호만으론 어느 자료인지 알 수 없어 자료명으로 묶는다.
              // 칩 숫자는 뷰어 표기(전역 번호)와 맞추고, 자료 내 쪽번호를 괄호로 곁들인다.
              <div className="flex max-h-56 flex-col gap-2.5 overflow-y-auto">
                {pageGroups.map((group) => (
                  <div key={group.materialId || 'unmapped'}>
                    <p className="mb-1 truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
                      {group.name ?? t('filter.pageUnknownMaterial')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.pages.map((page) => (
                        <Chip
                          key={page}
                          label={
                            group.materialId
                              ? t('filter.pageLabelInMaterial', {
                                  page,
                                  local: page - group.offset,
                                })
                              : t('filter.pageLabel', { page })
                          }
                          active={filter.pages.includes(page)}
                          onClick={() => onTogglePage(page)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {availablePages.map((page) => (
                  <Chip
                    key={page}
                    label={t('filter.pageLabel', { page })}
                    active={filter.pages.includes(page)}
                    onClick={() => onTogglePage(page)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 풀이 범위 선택 */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 dark:border-gray-800 px-3 py-2.5">
        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-500">
          {t('scope.label')}
        </span>
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
          <button
            type="button"
            aria-pressed={scope === 'selected'}
            onClick={() => onScopeChange('selected')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              scope === 'selected'
                ? 'bg-indigo-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('scope.selected', { count: getSelectedScopeCount(availableTypes.length) })}
          </button>
          <button
            type="button"
            aria-pressed={scope === 'all'}
            onClick={() => onScopeChange('all')}
            className={`border-l border-gray-200 dark:border-gray-600 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              scope === 'all'
                ? 'bg-indigo-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {t('scope.all')}
          </button>
        </div>
        {scope === 'selected' && visibleCount < filteredCount && (
          <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-300">
            {t('scope.selectedNotice', { count: visibleCount })}
          </span>
        )}
      </div>
    </div>
  )
}
