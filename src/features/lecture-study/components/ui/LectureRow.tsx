/**
 * @file LectureRow.tsx
 * @description 회차 행(row) UI — 상태 배지 + 주차/차시 + 제목 + 날짜 + 액션 버튼
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react, shared/lib/utils
 */

import { cn } from '@/shared/lib/utils'
import { Mic, FileText, Lock, Calendar, Flame } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import type { Lecture } from '../../types'
import type { LectureStatus } from '../containers/LectureSelectContainer'

interface LectureRowProps {
  lecture: Lecture
  status: LectureStatus
  hasReward?: boolean
  onClick: () => void
  onMicClick: () => void
  onPdfClick: () => void
}

const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    labelKo: '완료',
    // Figma: 옅은 민트 배경 + 진녹색 텍스트
    badgeClass: 'bg-[#D1FAE5] text-[#047857]',
  },
  'in-progress': {
    label: 'In Progress',
    labelKo: '학습중',
    // Figma: 옅은 라벤더 배경 + 진보라 텍스트
    badgeClass: 'bg-[#EDE9FE] text-[#6D28D9]',
  },
  upcoming: {
    label: 'Upcoming',
    labelKo: '예정',
    badgeClass: 'bg-gray-100 text-gray-500',
  },
} as const

export function LectureRow({ lecture, status, hasReward = false, onClick, onMicClick, onPdfClick }: LectureRowProps) {
  const locale = useLocale()
  const t = useTranslations()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isAvailable = status !== 'upcoming'
  const cfg = STATUS_CONFIG[status]
  // 모바일: 학습하기 버튼 대신 카드 전체 클릭으로 학습 페이지 진입 (Figma 788-9784)
  const cardClickable = isMobile && isAvailable

  // has_content → 녹음/자료 존재 프록시
  const hasRecording = lecture.has_content
  const hasMaterial = lecture.has_content

  const weekSessionLabel =
    lecture.week_number != null && lecture.session_number != null
      ? locale === 'ko'
        ? `${lecture.week_number}주차 ${String(lecture.session_number).padStart(2, '0')}차시`
        : `W${lecture.week_number} S${String(lecture.session_number).padStart(2, '0')}`
      : null

  const displayTitle =
    lecture.title ?? lecture.essence_7words ?? `${lecture.lecture_number ?? '?'}${locale === 'ko' ? '회차' : ''}`

  const dateLocale = locale === 'en' ? 'en-US' : 'ko-KR'
  const formattedDate = lecture.date
    ? new Date(lecture.date).toLocaleDateString(dateLocale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div
      onClick={cardClickable ? onClick : undefined}
      role={cardClickable ? 'button' : undefined}
      tabIndex={cardClickable ? 0 : undefined}
      onKeyDown={cardClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      className={cn(
        'flex flex-wrap items-center gap-[calc(12px*var(--u))] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-[calc(16px*var(--u))] py-[calc(10px*var(--u))] transition-all md:gap-6 md:p-5',
        status === 'in-progress' && 'border-l-4 border-l-[#6366F1] shadow-sm',
        status === 'upcoming' && 'opacity-70',
        isAvailable && 'hover:-translate-y-0.5 hover:shadow-md',
        cardClickable && 'cursor-pointer active:scale-[0.99]',
      )}
    >
      {/* Reward Icon (활성 시 녹색 톤 — Figma 카테고리 컬러) */}
      <div className={cn(
        'flex h-[calc(40px*var(--u))] w-[calc(40px*var(--u))] shrink-0 items-center justify-center rounded-[calc(12px*var(--u))] shadow-sm md:h-14 md:w-14 md:rounded-2xl',
        hasReward ? 'bg-[#D1FAE5]' : 'bg-gray-100 dark:bg-gray-800',
      )}>
        <Flame className={cn(
          'h-[calc(20px*var(--u))] w-[calc(20px*var(--u))] md:h-6 md:w-6',
          hasReward ? 'fill-[#047857] text-[#047857]' : 'fill-gray-300 text-gray-300',
        )} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1 md:min-w-[280px]">
        <div className="mb-0.5 flex items-center gap-[calc(6px*var(--u))] md:mb-1 md:gap-2">
          <span
            className={cn(
              'rounded px-[calc(6px*var(--u))] py-0.5 text-[calc(9px*var(--u))] font-bold uppercase tracking-tight md:px-2 md:text-[10px]',
              cfg.badgeClass,
            )}
          >
            {locale === 'ko' ? cfg.labelKo : cfg.label}
          </span>
          {weekSessionLabel && (
            <span className="text-[calc(10px*var(--u))] font-medium text-gray-400 md:text-xs">{weekSessionLabel}</span>
          )}
        </div>
        <h4 className="truncate text-[calc(12px*var(--u))] font-bold text-gray-900 dark:text-gray-50 md:whitespace-normal md:text-lg">{displayTitle}</h4>
        <div className="mt-[calc(4px*var(--u))] flex items-center gap-4 text-[calc(10px*var(--u))] text-gray-500 dark:text-gray-400 md:mt-2 md:text-sm">
          {isAvailable && formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-[calc(12px*var(--u))] w-[calc(12px*var(--u))] md:h-3.5 md:w-3.5" />
              {formattedDate}
            </span>
          )}
          {!isAvailable && (
            <span className="flex items-center gap-1">
              <Lock className="h-[calc(12px*var(--u))] w-[calc(12px*var(--u))] md:h-3.5 md:w-3.5" />
              {locale === 'ko' ? '아직 사용할 수 없습니다' : 'Not yet available'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-[calc(8px*var(--u))] md:gap-2">
        {isAvailable ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onMicClick() }}
              className={cn(
                'flex h-[calc(24px*var(--u))] w-[calc(24px*var(--u))] items-center justify-center rounded-[calc(7.5px*var(--u))] transition-all md:h-10 md:w-10 md:rounded-xl',
                hasRecording
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600',
              )}
              title={locale === 'ko' ? '녹음' : 'Recording'}
            >
              <Mic className="h-[calc(12px*var(--u))] w-[calc(12px*var(--u))] md:h-5 md:w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onPdfClick() }}
              className={cn(
                'flex h-[calc(24px*var(--u))] w-[calc(24px*var(--u))] items-center justify-center rounded-[calc(7.5px*var(--u))] transition-all md:h-10 md:w-10 md:rounded-xl',
                hasMaterial
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600',
              )}
              title={locale === 'ko' ? '강의자료' : 'PDF'}
            >
              <FileText className="h-[calc(12px*var(--u))] w-[calc(12px*var(--u))] md:h-5 md:w-5" />
            </button>
            {/* 학습하기 버튼 — 모바일에선 카드 전체 클릭으로 대체되어 숨김 */}
            <button
              onClick={(e) => { e.stopPropagation(); onClick() }}
              className="ml-4 hidden rounded-xl bg-[#6366F1] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#6366F1]/20 transition-all hover:scale-105 active:scale-95 md:block"
            >
              {locale === 'ko' ? '학습하기' : 'Study'}
            </button>
          </>
        ) : (
          <>
            <button
              disabled
              className="flex h-[calc(24px*var(--u))] w-[calc(24px*var(--u))] cursor-not-allowed items-center justify-center rounded-[calc(7.5px*var(--u))] bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 md:h-10 md:w-10 md:rounded-xl"
            >
              <Mic className="h-[calc(12px*var(--u))] w-[calc(12px*var(--u))] md:h-5 md:w-5" />
            </button>
            <button
              disabled
              className="flex h-[calc(24px*var(--u))] w-[calc(24px*var(--u))] cursor-not-allowed items-center justify-center rounded-[calc(7.5px*var(--u))] bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 md:h-10 md:w-10 md:rounded-xl"
            >
              <FileText className="h-[calc(12px*var(--u))] w-[calc(12px*var(--u))] md:h-5 md:w-5" />
            </button>
            <button
              disabled
              className="ml-4 hidden cursor-not-allowed rounded-xl bg-gray-200 dark:bg-gray-700 px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 md:block"
            >
              {locale === 'ko' ? '잠겨있음' : 'Locked'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
