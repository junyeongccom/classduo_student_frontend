/**
 * @file QuickActionLink.tsx
 * @description 문제 만들기 / 내 퀴즈 저장소 — 보라 아이콘 박스 + 라벨 (Figma 175:591)
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
      className="group flex w-full items-center gap-4 rounded-2xl transition-opacity hover:opacity-80"
    >
      {/* 아이콘 박스 — Figma: 정사각 #DBDAFB + 0.8px #D9D9D9 보더 */}
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#D9D9D9] bg-[#DBDAFB] dark:border-gray-700 dark:bg-violet-950/40">
        <Icon className="h-6 w-6 text-[#383698] dark:text-violet-300" strokeWidth={2.4} />
      </span>
      {/* 라벨 — Pretendard Bold */}
      <span
        className="text-lg font-bold text-black dark:text-gray-100"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {label}
      </span>
    </button>
  )
}
