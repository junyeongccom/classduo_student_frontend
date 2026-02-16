/**
 * @file MaterialCard.tsx
 * @description 강의자료 카드 UI — LectureCard와 동일한 디자인 패턴
 * @module features/material-study/components/ui
 * @dependencies lucide-react, shared/lib/utils, home/assignCourseVisual
 */

import { cn } from '@/shared/lib/utils'
import { FileText } from 'lucide-react'
import { useMemo } from 'react'
import { assignCourseVisual } from '@/features/home'

interface MaterialCardProps {
  material: {
    id: string
    title: string
    fileType?: string
  }
  courseId: string
  onClick: () => void
}

export function MaterialCard({ material, courseId, onClick }: MaterialCardProps) {
  const courseVisual = useMemo(() => assignCourseVisual(courseId), [courseId])

  // 파일 확장자 추출 (title에서)
  const ext = material.title.includes('.')
    ? material.title.split('.').pop()?.toUpperCase() ?? ''
    : material.fileType?.toUpperCase() ?? ''

  // 파일명 (확장자 제외)
  const displayName = material.title.includes('.')
    ? material.title.slice(0, material.title.lastIndexOf('.'))
    : material.title

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex h-[220px] w-full flex-col overflow-hidden',
        'rounded-2xl border border-gray-200 bg-white shadow-sm',
        'text-left transition-all duration-200',
        'cursor-pointer hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5',
      )}
    >
      {/* 상단 60%: 그라데이션 + 아이콘 */}
      <div
        className="relative flex h-[60%] items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${courseVisual.accent}22, ${courseVisual.accent}44)`,
        }}
      >
        <FileText
          className="h-12 w-12 opacity-30"
          style={{ color: courseVisual.accent }}
        />

        {/* 파일 타입 배지 */}
        {ext && (
          <span
            className="absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: courseVisual.accent }}
          >
            {ext}
          </span>
        )}
      </div>

      {/* 하단 40%: 파일명 */}
      <div className="flex flex-1 flex-col justify-between p-3">
        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
          {displayName}
        </h3>
      </div>
    </button>
  )
}
