/**
 * @file LectureSelectorBar.tsx
 * @description 페이지 하단 고정 강좌/회차 선택 바 (드롭다운 2개)
 * @module features/my-quiz
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronDown, Check, Square, CheckSquare } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface BottomDropdownProps {
  value: string | null
  options: SelectOption[]
  placeholder: string
  onChange: (value: string) => void
  isLoading?: boolean
  loadingLabel?: string
  emptyLabel?: string
  disabled?: boolean
}

function BottomDropdown({
  value,
  options,
  placeholder,
  onChange,
  isLoading = false,
  loadingLabel,
  emptyLabel,
  disabled = false,
}: BottomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find(o => o.value === value)?.label

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(event.target as Node)) return
      setIsOpen(false)
    }
    window.addEventListener('pointerdown', handleClickOutside)
    return () => window.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false)
      return
    }
    const id = window.requestAnimationFrame(() => setIsVisible(true))
    return () => window.cancelAnimationFrame(id)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative w-48 min-w-0">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-900/10',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn('truncate', selectedLabel ? 'text-gray-900' : 'text-gray-400')}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn('ml-1 h-4 w-4 shrink-0 text-gray-400 transition-transform', isOpen ? 'rotate-180' : '')} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 z-[70] mt-2 min-w-[12rem] max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          onPointerDown={e => e.stopPropagation()}
        >
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">{loadingLabel}</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">{emptyLabel}</div>
          ) : (
            options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 transition-all duration-200',
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
                  'hover:bg-gray-50',
                  option.value === value
                    ? 'bg-indigo-50 border-l-2 border-indigo-500 font-semibold text-indigo-700'
                    : '',
                )}
                style={{ transitionDelay: `${index * 30}ms` }}
              >
                <span className="block truncate">{option.label}</span>
                {option.value === value && (
                  <Check className="ml-2 h-4 w-4 shrink-0 text-indigo-500" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/* ───────────── MultiSelect 드롭다운 ───────────── */

interface MultiSelectDropdownProps {
  options: SelectOption[]
  selectedIds: string[]
  placeholder: string
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  disabled?: boolean
  selectAllLabel?: string
  clearAllLabel?: string
  countLabel?: (count: number) => string
}

function MultiSelectDropdown({
  options,
  selectedIds,
  placeholder,
  onToggle,
  onSelectAll,
  onClearAll,
  disabled = false,
  selectAllLabel = '전체 선택',
  clearAllLabel = '전체 해제',
  countLabel,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const displayText = selectedIds.length > 0
    ? (countLabel ? countLabel(selectedIds.length) : `${selectedIds.length}개 회차 선택`)
    : placeholder

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(event.target as Node)) return
      setIsOpen(false)
    }
    window.addEventListener('pointerdown', handleClickOutside)
    return () => window.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false)
      return
    }
    const id = window.requestAnimationFrame(() => setIsVisible(true))
    return () => window.cancelAnimationFrame(id)
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative w-48 min-w-0">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => !disabled && setIsOpen(prev => !prev)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-900/10',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn('truncate', selectedIds.length > 0 ? 'text-gray-900' : 'text-gray-400')}>
          {displayText}
        </span>
        <ChevronDown className={cn('ml-1 h-4 w-4 shrink-0 text-gray-400 transition-transform', isOpen ? 'rotate-180' : '')} />
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 z-[70] mt-2 min-w-[14rem] max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
          onPointerDown={e => e.stopPropagation()}
        >
          {/* 전체 선택 / 전체 해제 버튼 */}
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
              {selectAllLabel}
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition"
            >
              {clearAllLabel}
            </button>
          </div>

          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">{placeholder}</div>
          ) : (
            options.map((option, index) => {
              const isSelected = selectedIds.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-all duration-200',
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
                    'hover:bg-gray-50',
                    isSelected
                      ? 'bg-indigo-50 border-l-2 border-indigo-500 font-semibold text-indigo-700'
                      : '',
                  )}
                  style={{ transitionDelay: `${index * 30}ms` }}
                >
                  {isSelected
                    ? <CheckSquare className="h-4 w-4 shrink-0 text-indigo-500" />
                    : <Square className="h-4 w-4 shrink-0 text-gray-400" />
                  }
                  <span className="block truncate">{option.label}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

/* ───────────── LectureSelectorBar ───────────── */

interface LectureSelectorBarProps {
  courseOptions: SelectOption[]
  lectureOptions: SelectOption[]
  selectedCourseId: string | null
  selectedLectureId: string | null
  onCourseChange: (courseId: string) => void
  onLectureChange: (lectureId: string) => void
  isLoading?: boolean
  hasCourses: boolean
  multiSelect?: boolean
  selectedLectureIds?: string[]
  onLectureToggle?: (lectureId: string) => void
  onSelectAllLectures?: () => void
  onClearLectureIds?: () => void
}

export default function LectureSelectorBar({
  courseOptions,
  lectureOptions,
  selectedCourseId,
  selectedLectureId,
  onCourseChange,
  onLectureChange,
  isLoading,
  hasCourses,
  multiSelect = false,
  selectedLectureIds = [],
  onLectureToggle,
  onSelectAllLectures,
  onClearLectureIds,
}: LectureSelectorBarProps) {
  const t = useTranslations('myQuiz')

  if (!hasCourses && !isLoading) {
    return (
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 px-4 py-3">
        <p className="text-center text-sm text-gray-400">{t('selector.noCourses')}</p>
      </div>
    )
  }

  return (
    <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 px-4 py-3">
      <div className="flex gap-3">
        <BottomDropdown
          value={selectedCourseId}
          options={courseOptions}
          placeholder={t('selector.selectCourse')}
          onChange={onCourseChange}
          isLoading={isLoading}
          loadingLabel={t('selector.loading')}
          emptyLabel={t('selector.noCourses')}
        />
        {multiSelect && onLectureToggle && onSelectAllLectures && onClearLectureIds ? (
          <MultiSelectDropdown
            options={lectureOptions}
            selectedIds={selectedLectureIds}
            placeholder={t('selector.selectLecture')}
            onToggle={onLectureToggle}
            onSelectAll={onSelectAllLectures}
            onClearAll={onClearLectureIds}
            disabled={!selectedCourseId}
            selectAllLabel={t('selector.selectAll')}
            clearAllLabel={t('selector.clearAll')}
            countLabel={(count) => t('selector.lectureCount', { count })}
          />
        ) : (
          <BottomDropdown
            value={selectedLectureId}
            options={lectureOptions}
            placeholder={t('selector.selectLecture')}
            onChange={onLectureChange}
            disabled={!selectedCourseId}
            loadingLabel={t('selector.loading')}
            emptyLabel={t('selector.selectCourse')}
          />
        )}
      </div>
    </div>
  )
}
