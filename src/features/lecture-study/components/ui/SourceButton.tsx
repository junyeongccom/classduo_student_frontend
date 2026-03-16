/**
 * @file SourceButton.tsx
 * @description 출처 버튼 — 강의자료/녹음본 출처를 표시하고, 클릭 시 좌측 패널로 이동
 * @module features/lecture-study/components/ui
 * @dependencies 없음
 */

'use client'

export interface SourceButtonProps {
  label: string
  tooltipId: string
  tooltipContent: string
  disabled: boolean
  /** 모바일에서 클릭 비활성화 (툴팁만 제공) */
  disabledClick: boolean
  onClick: () => void
}

export function SourceButton({ label, tooltipId, tooltipContent, disabled, disabledClick, onClick }: SourceButtonProps) {
  return (
    <div className="group relative inline-flex items-center">
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : undefined}
        className={[
          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
          disabled
            ? 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-default'
            : disabledClick
              ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-default'
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer',
        ].join(' ')}
        onClick={() => {
          if (!disabled && !disabledClick) onClick()
        }}
      >
        {label}
      </button>
      {/* 툴팁 */}
      <div
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-0 z-20 w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+10px)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <div className="rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white shadow-sm">
          {tooltipContent}
        </div>
        <div className="mx-auto mt-1 h-2 w-2 rotate-45 bg-gray-900" />
      </div>
    </div>
  )
}
