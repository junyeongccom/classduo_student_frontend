/**
 * @file CourseCard.tsx
 * @description 과목 카드 UI — 상단 컬러 배너 + 과목명 + 메타정보 + 프로그레스바
 * @module features/home/components/ui
 * @dependencies shared/lib/utils, assignCourseVisual
 */

import { BookOpen, User, GraduationCap } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { CourseVisual } from '../../domain/assignCourseVisual'

interface CourseCardProps {
  name: string
  professorName: string | null
  section: string | null
  updatedAt: string | null
  totalLectures?: number
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
  totalLectures,
  visual,
  progress,
  locale = 'ko-KR',
  onClick,
}: CourseCardProps) {
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col overflow-hidden',
        'rounded-3xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm',
        'text-left transition-all duration-200',
        'hover:shadow-md hover:-translate-y-1',
      )}
    >
      {/* 상단 컬러 배너 */}
      <div
        className="relative h-48 w-full"
        style={{ backgroundColor: visual.accent }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        <div className="absolute bottom-4 left-4">
          <BookOpen className="h-8 w-8 text-white/60" />
        </div>
      </div>

      {/* 카드 내용 */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 line-clamp-2 leading-snug group-hover:text-[#6366F1] transition-colors">
            {name}
          </h3>
          {section && (
            <span className="shrink-0 text-xs text-gray-400">
              {locale === 'ko-KR' ? `${section}분반` : `Sec. ${section}`}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
          {professorName && (
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              {professorName}
            </span>
          )}
          {professorName && totalLectures != null && totalLectures > 0 && (
            <span>·</span>
          )}
          {totalLectures != null && totalLectures > 0 && (
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              {locale === 'ko-KR' ? `${totalLectures}회차` : `${totalLectures} Lectures`}
            </span>
          )}
        </div>

        {/* 프로그레스바 */}
        {progress && progress.total > 0 && (
          <div className="mt-4 flex items-center gap-3 border-t border-gray-50 dark:border-gray-800 pt-4">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  backgroundColor: visual.accent,
                }}
              />
            </div>
            <span className="shrink-0 text-xs font-bold" style={{ color: visual.accent }}>
              {progressPercent}%
            </span>
          </div>
        )}
      </div>
    </button>
  )
}
