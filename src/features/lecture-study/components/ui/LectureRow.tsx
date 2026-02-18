/**
 * @file LectureRow.tsx
 * @description 회차 행(row) UI — 상태 배지 + 주차/차시 + 제목 + 날짜 + 액션 버튼
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react, shared/lib/utils
 */

import { cn } from '@/shared/lib/utils'
import { Mic, FileText, Lock, Calendar, Flame } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import type { Lecture } from '../../types'
import type { LectureStatus } from '../containers/LectureSelectContainer'

interface LectureRowProps {
  lecture: Lecture
  status: LectureStatus
  hasReward?: boolean
  onClick: () => void
  onDialogueClick: () => void
  onMicClick: () => void
  onPdfClick: () => void
}

const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    labelKo: '완료',
    badgeClass: 'bg-blue-50 text-blue-600',
  },
  'in-progress': {
    label: 'In Progress',
    labelKo: '학습 중',
    badgeClass: 'bg-[#6366F1] text-white',
  },
  upcoming: {
    label: 'Upcoming',
    labelKo: '예정',
    badgeClass: 'bg-gray-100 text-gray-500',
  },
} as const

export function LectureRow({ lecture, status, hasReward = false, onClick, onDialogueClick, onMicClick, onPdfClick }: LectureRowProps) {
  const locale = useLocale()
  const t = useTranslations()
  const isAvailable = status !== 'upcoming'
  const cfg = STATUS_CONFIG[status]

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
      className={cn(
        'flex flex-wrap items-center gap-6 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 p-5 transition-all',
        status === 'in-progress' && 'border-l-4 border-l-[#6366F1] shadow-sm',
        status === 'upcoming' && 'opacity-70',
        isAvailable && 'hover:-translate-y-0.5 hover:shadow-md',
      )}
    >
      {/* Flame Icon */}
      <div className={cn(
        'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm',
        hasReward ? 'bg-[#6366F1]/10' : 'bg-gray-100 dark:bg-gray-800',
      )}>
        <Flame className={cn(
          'h-6 w-6',
          hasReward ? 'fill-[#6366F1] text-[#6366F1]' : 'fill-gray-300 text-gray-300',
        )} />
      </div>

      {/* Info */}
      <div className="min-w-[280px] flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={cn(
              'rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight',
              cfg.badgeClass,
            )}
          >
            {locale === 'ko' ? cfg.labelKo : cfg.label}
          </span>
          {weekSessionLabel && (
            <span className="text-xs font-medium text-gray-400">{weekSessionLabel}</span>
          )}
        </div>
        <h4 className="text-lg font-bold text-gray-900 dark:text-gray-50">{displayTitle}</h4>
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          {isAvailable && formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formattedDate}
            </span>
          )}
          {!isAvailable && (
            <span className="flex items-center gap-1">
              <Lock className="h-3.5 w-3.5" />
              {locale === 'ko' ? '아직 사용할 수 없습니다' : 'Not yet available'}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isAvailable ? (
          <>
            <button
              onClick={onMicClick}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                hasRecording
                  ? 'bg-[#6366F1]/10 text-[#6366F1] hover:bg-[#6366F1]/20'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600',
              )}
              title={locale === 'ko' ? '녹음' : 'Recording'}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              onClick={onPdfClick}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                hasMaterial
                  ? 'bg-rose-50 text-rose-500 hover:bg-rose-100'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600',
              )}
              title={locale === 'ko' ? '강의자료' : 'PDF'}
            >
              <FileText className="h-5 w-5" />
            </button>
            <div className="ml-4 flex flex-col gap-2">
              <button
                onClick={onClick}
                className="rounded-xl bg-[#6366F1] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#6366F1]/20 transition-all hover:scale-105 active:scale-95"
              >
                {locale === 'ko' ? '콘텐츠형 학습' : 'Content'}
              </button>
              <button
                onClick={onDialogueClick}
                className="rounded-xl bg-[#D1FAE5] px-6 py-2.5 text-sm font-bold text-[#065F46] shadow-lg shadow-[#D1FAE5]/40 transition-all hover:scale-105 active:scale-95"
              >
                {locale === 'ko' ? '대화형 학습' : 'Dialogue'}
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              disabled
              className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600"
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              disabled
              className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600"
            >
              <FileText className="h-5 w-5" />
            </button>
            <button
              disabled
              className="ml-4 cursor-not-allowed rounded-xl bg-gray-200 dark:bg-gray-700 px-6 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400"
            >
              {locale === 'ko' ? '잠겨있음' : 'Locked'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
