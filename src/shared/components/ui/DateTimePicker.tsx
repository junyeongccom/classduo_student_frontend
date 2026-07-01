/**
 * @file DateTimePicker.tsx
 * @description 모바일 친화 datetime picker — native datetime-local 대체. popover 내부 calendar + 시간 spinner.
 * @module shared/components/ui
 * @dependencies lucide-react (icons), cn util
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface DateTimePickerProps {
  /** "YYYY-MM-DDTHH:mm" 형식 (datetime-local 호환) */
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  className?: string
  /** 입력 placeholder (값 없을 때) */
  placeholder?: string
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toIso(d: Date) {
  // local 기준 YYYY-MM-DDTHH:mm
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

function parseValue(value: string): Date {
  if (value) {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

const DOW_KO = ['일', '월', '화', '수', '목', '금', '토']
const DOW_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function DateTimePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder,
}: DateTimePickerProps) {
  const locale = useLocale()
  const isKo = locale === 'ko'
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const current = parseValue(value)
  const [viewYear, setViewYear] = useState(current.getFullYear())
  const [viewMonth, setViewMonth] = useState(current.getMonth())

  useEffect(() => {
    if (open) {
      const d = parseValue(value)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [open, value])

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', handle)
    return () => window.removeEventListener('mousedown', handle)
  }, [open])

  // ESC 닫기
  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open])

  const selectedDate = value ? parseValue(value) : null
  const displayText = selectedDate
    ? `${selectedDate.getFullYear()}-${pad2(selectedDate.getMonth() + 1)}-${pad2(selectedDate.getDate())} ${pad2(selectedDate.getHours())}:${pad2(selectedDate.getMinutes())}`
    : (placeholder ?? (isKo ? '날짜 · 시간 선택' : 'Select date & time'))

  const firstDow = startOfMonth(new Date(viewYear, viewMonth, 1)).getDay()
  const dim = daysInMonth(viewYear, viewMonth)
  const cells: Array<{ d: number | null; full?: Date }> = []
  for (let i = 0; i < firstDow; i++) cells.push({ d: null })
  for (let d = 1; d <= dim; d++) {
    cells.push({ d, full: new Date(viewYear, viewMonth, d) })
  }
  while (cells.length % 7 !== 0) cells.push({ d: null })

  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    : null

  const todayKey = (() => {
    const t = new Date()
    return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`
  })()

  const goPrevMonth = () => {
    const next = new Date(viewYear, viewMonth - 1, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }
  const goNextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1)
    setViewYear(next.getFullYear())
    setViewMonth(next.getMonth())
  }

  const updateDate = (d: Date) => {
    const base = selectedDate ?? new Date()
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), base.getHours(), base.getMinutes())
    onChange(toIso(next))
  }
  const updateHour = (h: number) => {
    const base = selectedDate ?? new Date()
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, base.getMinutes())
    onChange(toIso(next))
  }
  const updateMinute = (m: number) => {
    const base = selectedDate ?? new Date()
    const next = new Date(base.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), m)
    onChange(toIso(next))
  }

  const hour = selectedDate?.getHours() ?? 0
  const minute = selectedDate?.getMinutes() ?? 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'h-12 w-full cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 text-left text-sm text-gray-900 dark:text-gray-100 outline-none transition-all focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 disabled:cursor-not-allowed disabled:bg-gray-100',
          !selectedDate && 'text-gray-400',
        )}
      >
        {displayText}
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-w-[calc(100vw-1rem)] rounded-xl border border-gray-200 bg-white p-3 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between gap-2 pb-2">
            <button
              type="button"
              onClick={goPrevMonth}
              className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={isKo ? '이전 달' : 'Previous month'}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>{isKo ? `${y}년` : y}</option>
                ))}
              </select>
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm font-semibold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {Array.from({ length: 12 }, (_, i) => i).map((m) => (
                  <option key={m} value={m}>{isKo ? `${m + 1}월` : MONTHS_EN[m]}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={goNextMonth}
              className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={isKo ? '다음 달' : 'Next month'}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold text-gray-400">
            {(isKo ? DOW_KO : DOW_EN).map((d, i) => (
              <div key={d} className={cn(i === 0 && 'text-rose-500', i === 6 && 'text-sky-500')}>{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((c, i) => {
              if (c.d === null) return <div key={`empty-${i}`} className="h-9" />
              const key = `${viewYear}-${viewMonth}-${c.d}`
              const isSelected = selectedKey === key
              const isToday = todayKey === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => c.full && updateDate(c.full)}
                  className={cn(
                    'flex h-9 items-center justify-center rounded-md text-sm transition-colors',
                    isSelected
                      ? 'bg-[#6366F1] text-white font-bold'
                      : isToday
                      ? 'bg-gray-100 dark:bg-gray-800 font-semibold text-gray-900 dark:text-gray-100'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                  )}
                >
                  {c.d}
                </button>
              )
            })}
          </div>

          {/* 시간 spinner */}
          <div className="mt-3 flex items-center justify-center gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
            <select
              value={hour}
              onChange={(e) => updateHour(Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm tabular-nums text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              aria-label={isKo ? '시' : 'Hour'}
            >
              {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                <option key={h} value={h}>{pad2(h)}</option>
              ))}
            </select>
            <span className="font-bold text-gray-500">:</span>
            <select
              value={minute}
              onChange={(e) => updateMinute(Number(e.target.value))}
              className="rounded-md border border-gray-200 bg-white px-2 py-2 text-sm tabular-nums text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              aria-label={isKo ? '분' : 'Minute'}
            >
              {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                <option key={m} value={m}>{pad2(m)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const now = new Date()
                onChange(toIso(now))
                setViewYear(now.getFullYear())
                setViewMonth(now.getMonth())
              }}
              className="ml-2 rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {isKo ? '현재시간' : 'Now'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label={isKo ? '닫기' : 'Close'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
