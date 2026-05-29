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
      className="group flex w-full items-center gap-[calc(14px*var(--u))] rounded-2xl transition-opacity hover:opacity-80 md:gap-4"
    >
      {/* 아이콘 박스 — Figma: 정사각 #DBDAFB + 0.8px #D9D9D9 보더 */}
      <span className="flex h-[calc(48px*var(--u))] w-[calc(48px*var(--u))] shrink-0 items-center justify-center rounded-[calc(14px*var(--u))] border border-[#D9D9D9] bg-[#DBDAFB] md:h-14 md:w-14 md:rounded-xl dark:border-gray-700 dark:bg-violet-950/40">
        <Icon className="h-[calc(26px*var(--u))] w-[calc(26px*var(--u))] text-[#383698] md:h-6 md:w-6 dark:text-violet-300" strokeWidth={2.4} />
      </span>
      {/* 라벨 — Pretendard Bold */}
      <span
        className="whitespace-nowrap text-[calc(17px*var(--u))] font-bold text-black md:text-lg dark:text-gray-100"
        style={{ fontFamily: 'Pretendard, sans-serif' }}
      >
        {label}
      </span>
    </button>
  )
}
