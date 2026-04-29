/**
 * @file StudyModeCard.tsx
 * @description 과목 대시보드의 학습 모드 카드 (회차/기말/대화/자료 4종 공용)
 * @module features/course-dashboard/components/ui
 * @dependencies lucide-react
 */

'use client'

import type { ComponentType, SVGProps, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface StudyModeCardProps {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** 카테고리 라벨 (예: "WEEKLY · 노트 · 퀴즈 · 게임") */
  eyebrow: string
  title: string
  description: string
  /** 좌하단 메타 텍스트 (예: "7주차 수업 업로드 완료") */
  footer?: ReactNode
  /** 우상단 배지 (예: "D-14") */
  badge?: ReactNode
  /** CTA 라벨 (기본: "입장") */
  ctaLabel: string
  /** 강조 변형 — Figma의 "회차별 학습"처럼 라벤더 배경 */
  variant?: 'default' | 'highlight'
  /** 아이콘 색상 */
  iconColor?: string
  /** 카드 클릭 시 */
  onClick: () => void
  /** 비활성 (준비 중 등) — 클릭은 동작하되 시각적으로만 dim */
  disabled?: boolean
}

export function StudyModeCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  footer,
  badge,
  ctaLabel,
  variant = 'default',
  iconColor = '#6366F1',
  onClick,
  disabled = false,
}: StudyModeCardProps) {
  const isHighlight = variant === 'highlight'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border p-6 text-left transition-all duration-200',
        'min-h-[210px]',
        isHighlight
          ? 'border-[#6366F1]/40 bg-gradient-to-br from-[#F5F3FF] via-[#EEF2FF] to-[#E0E7FF] hover:border-[#6366F1] hover:shadow-[0_8px_24px_rgba(99,102,241,0.18)]'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900',
        disabled && 'opacity-70',
      )}
    >
      {/* Top: icon + badge */}
      <div className="mb-4 flex items-start justify-between">
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl',
            isHighlight ? 'bg-white' : 'bg-gray-50 dark:bg-gray-800',
          )}
        >
          <Icon className="h-5 w-5" style={{ color: iconColor }} />
        </div>
        {badge && <div>{badge}</div>}
      </div>

      {/* Body */}
      <div className="flex-1">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {eyebrow}
        </p>
        <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-50">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>

      {/* Footer */}
      <div
        className={cn(
          'mt-6 flex items-center justify-between border-t pt-4',
          isHighlight
            ? 'border-[#6366F1]/15'
            : 'border-gray-100 dark:border-gray-800',
        )}
      >
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {footer ?? <>&nbsp;</>}
        </span>
        <span
          className={cn(
            'flex items-center gap-1 text-sm font-semibold transition-colors',
            isHighlight
              ? 'text-[#6366F1]'
              : 'text-gray-700 dark:text-gray-300 group-hover:text-[#6366F1]',
          )}
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  )
}

/** 우상단 D-Day 배지 — StudyModeCard.badge prop 으로 전달 */
export function DdayBadge({ days }: { days: number }) {
  return (
    <span className="rounded-full bg-[#F97316] px-2.5 py-1 text-[11px] font-bold leading-none text-white">
      D-{days}
    </span>
  )
}
