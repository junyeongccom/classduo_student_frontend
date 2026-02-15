/**
 * @file EmptyState.tsx
 * @description 과목 없음 빈 상태 UI — Duolingo 스타일 긍정적 메시지
 * @module features/home/components/ui
 * @dependencies lucide-react
 */

import { GraduationCap } from 'lucide-react'

interface EmptyStateProps {
  message: string
  subtext?: string
}

export function EmptyState({ message, subtext }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
        <GraduationCap className="h-10 w-10 text-blue-400" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-base font-medium text-gray-700">{message}</p>
        {subtext && (
          <p className="text-sm text-gray-400">{subtext}</p>
        )}
      </div>
    </div>
  )
}
