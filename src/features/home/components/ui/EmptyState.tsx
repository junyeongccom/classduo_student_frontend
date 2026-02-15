/**
 * @file EmptyState.tsx
 * @description 과목 없음 빈 상태 UI
 * @module features/home/components/ui
 * @dependencies lucide-react
 */

import { BookOpen } from 'lucide-react'

interface EmptyStateProps {
  message: string
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
        <BookOpen className="h-8 w-8 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}
