/**
 * @file CourseCard.tsx
 * @description 과목 카드 UI — 컬러바 + 프로그레스바 + Duolingo 스타일
 * @module features/home/components/ui
 * @dependencies shared/lib/utils
 */

import { cn } from '@/shared/lib/utils'
import type { CourseVisual } from '../../domain/assignCourseVisual'

interface CourseCardProps {
  name: string
  professorName: string | null
  section: string | null
  updatedAt: string | null
  visual: CourseVisual
  progress?: { completed: number; total: number } | null
  progressLabel?: string
  locale?: string
  onClick: () => void
}

export function CourseCard({
  name,
  professorName,
  section,
  updatedAt,
  visual,
  progress,
  progressLabel,
  locale = 'ko-KR',
  onClick,
}: CourseCardProps) {
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full min-h-[120px] overflow-hidden',
        'rounded-2xl border border-gray-200 bg-white shadow-sm',
        'text-left transition-all duration-200',
        'hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5',
      )}
    >
      {/* 좌측 컬러 바 */}
      <div
        className="w-1 shrink-0 rounded-l-2xl"
        style={{ backgroundColor: visual.accent }}
      />

      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug">
            {name}
          </h3>
          {(professorName || section) && (
            <p className="text-sm text-gray-500">
              {[professorName, section ? `${section}분반` : null].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {formattedDate && (
            <p className="text-xs text-gray-400">{formattedDate}</p>
          )}

          {progress && progress.total > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: visual.accent,
                  }}
                />
              </div>
              <span className="shrink-0 text-[11px] text-gray-400">
                {progressLabel
                  ? `${progressPercent}%`
                  : `${progress.completed}/${progress.total}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
