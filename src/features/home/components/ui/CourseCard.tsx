/**
 * @file CourseCard.tsx
 * @description 과목 카드 UI — props 기반 순수 렌더링
 * @module features/home/components/ui
 * @dependencies shared/components/ui, lucide-react
 */

import { cn } from '@/shared/lib/utils'
import type { CourseVisual } from '../../domain/assignCourseVisual'

interface CourseCardProps {
  name: string
  professorName: string | null
  updatedAt: string | null
  visual: CourseVisual
  onClick: () => void
}

export function CourseCard({ name, professorName, updatedAt, visual, onClick }: CourseCardProps) {
  const formattedDate = updatedAt
    ? new Date(updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
    : null

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        visual.border,
        'bg-white',
      )}
    >
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg text-2xl', visual.bg)}>
        {visual.emoji}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{name}</h3>
        {professorName && (
          <p className="text-xs text-gray-500">{professorName}</p>
        )}
      </div>
      {formattedDate && (
        <p className="mt-auto text-[11px] text-gray-400">{formattedDate}</p>
      )}
    </button>
  )
}
