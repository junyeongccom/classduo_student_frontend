/**
 * @file QuickActionLink.tsx
 * @description 문제 만들기 / 내 퀴즈 저장소 — 가벼운 텍스트형 액션 링크
 * @module features/course-dashboard/components/ui
 * @dependencies lucide-react
 */

'use client'

import type { LucideIcon } from 'lucide-react'

interface QuickActionLinkProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

export function QuickActionLink({ icon: Icon, label, onClick }: QuickActionLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-transparent bg-gray-50 px-5 py-4 text-sm font-semibold text-gray-700 transition-colors hover:border-[#383698]/20 hover:bg-[#EEF0FF] hover:text-[#383698] dark:bg-gray-900 dark:text-gray-200"
    >
      <Icon className="h-4 w-4 text-gray-400 transition-colors group-hover:text-[#383698]" />
      <span>{label}</span>
    </button>
  )
}
