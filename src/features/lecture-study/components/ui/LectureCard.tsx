/**
 * @file LectureCard.tsx
 * @description 회차 선택 카드 UI — props 기반 순수 렌더링
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react
 */

import { cn } from '@/shared/lib/utils'
import { Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { Lecture } from '../../types'

interface LectureCardProps {
  lecture: Lecture
  isLatest: boolean
  onClick: () => void
}

export function LectureCard({ lecture, isLatest, onClick }: LectureCardProps) {
  const t = useTranslations()
  const hasAnyContent = lecture.has_content
  const displayTitle = lecture.title ?? `${lecture.lecture_number}회차`

  const formattedDate = lecture.date
    ? new Date(lecture.date).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <button
      onClick={onClick}
      disabled={!hasAnyContent}
      className={cn(
        'group flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition-all',
        hasAnyContent
          ? 'hover:shadow-md hover:-translate-y-0.5 bg-white cursor-pointer'
          : 'bg-gray-50 opacity-60 cursor-not-allowed',
        isLatest && hasAnyContent && 'ring-2 ring-blue-400 border-blue-200',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
          {displayTitle}
        </h3>
        {isLatest && hasAnyContent && (
          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            NEW
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-gray-500">
        {formattedDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
        )}
        {/* TODO: 백엔드 API에 recordings_count/materials_count 필드 추가 후 배지 활성화 */}
      </div>

      {!hasAnyContent && (
        <p className="text-[11px] text-gray-400">
          {t('lectureStudy.lectureSelect.noContent')}
        </p>
      )}
    </button>
  )
}
