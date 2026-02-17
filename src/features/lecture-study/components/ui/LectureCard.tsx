/**
 * @file LectureCard.tsx
 * @description 회차 카드 UI — 균일 크기 + 그라데이션 썸네일 + NEW 배지
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react, shared/lib/utils
 */

import { cn } from '@/shared/lib/utils'
import { Calendar, Mic, FileText } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { useMemo } from 'react'
import type { Lecture } from '../../types'
import { assignCourseVisual } from '@/features/home'

interface LectureCardProps {
  lecture: Lecture
  isLatest: boolean
  courseId: string
  onClick: () => void
}

export function LectureCard({ lecture, isLatest, courseId, onClick }: LectureCardProps) {
  const t = useTranslations()
  const locale = useLocale()
  const hasAnyContent = lecture.has_content

  // 주차/차시 라벨: "1주차 2차시" or "W1 S2"
  const weekSessionLabel = lecture.week_number != null && lecture.session_number != null
    ? locale === 'ko'
      ? `${lecture.week_number}주차 ${lecture.session_number}차시`
      : `W${lecture.week_number} S${lecture.session_number}`
    : null

  // 제목: 회차제목 → 강의본질7단어 → N회차 폴백
  const subtitle = lecture.title
    ?? lecture.essence_7words
    ?? null

  // 카드 표시: 제목 있으면 제목만, 없으면 "N회차"
  const displayTitle = subtitle
    ?? `${lecture.lecture_number ?? '?'}${locale === 'ko' ? '회차' : ''}`

  const dateLocale = locale === 'en' ? 'en-US' : 'ko-KR'
  const formattedDate = lecture.date
    ? new Date(lecture.date).toLocaleDateString(dateLocale, {
        month: 'short',
        day: 'numeric',
      })
    : null

  const courseVisual = useMemo(() => assignCourseVisual(courseId), [courseId])

  return (
    <button
      onClick={onClick}
      disabled={!hasAnyContent}
      className={cn(
        'group relative flex h-[220px] w-full flex-col overflow-hidden',
        'rounded-2xl border border-gray-200 bg-white shadow-sm',
        'text-left transition-all duration-200',
        hasAnyContent
          ? 'cursor-pointer hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5'
          : 'cursor-not-allowed opacity-60',
      )}
    >
      {/* 상단 60%: 그라데이션 썸네일 영역 */}
      <div
        className="relative flex h-[60%] items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${courseVisual.accent}22, ${courseVisual.accent}44)`,
        }}
      >
        <span
          className="text-4xl font-bold opacity-30"
          style={{ color: courseVisual.accent }}
        >
          {lecture.lecture_number ?? '?'}
        </span>

        {/* NEW 배지 */}
        {isLatest && hasAnyContent && (
          <span className="absolute right-2 top-2 rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
            {t('lectureStudy.lectureSelect.newBadge')}
          </span>
        )}
      </div>

      {/* 하단 40%: 텍스트 정보 */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <div>
          {weekSessionLabel && (
            <p className="text-[11px] font-medium text-gray-400 mb-0.5">
              {weekSessionLabel}
            </p>
          )}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {displayTitle}
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formattedDate}
            </span>
          )}
          {lecture.has_recordings && (
            <span className="flex items-center gap-0.5" title={t('lectureStudy.lectureSelect.hasRecording')}>
              <Mic className="h-3 w-3" />
            </span>
          )}
          {lecture.has_materials && (
            <span className="flex items-center gap-0.5" title={t('lectureStudy.lectureSelect.hasMaterial')}>
              <FileText className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
