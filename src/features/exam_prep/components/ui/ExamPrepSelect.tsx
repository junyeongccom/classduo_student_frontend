'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type ExamPrepSelectOption = {
  value: string
  label: string
}

type ExamPrepSelectProps = {
  value: string | null
  options: ExamPrepSelectOption[]
  placeholder: string
  onChange: (value: string) => void
  isLoading?: boolean
  emptyLabel?: string
  errorLabel?: string
  className?: string
  buttonClassName?: string
  listClassName?: string
}

export function ExamPrepSelect({
  value,
  options,
  placeholder,
  onChange,
  isLoading = false,
  emptyLabel = '목록이 없습니다',
  errorLabel,
  className,
  buttonClassName,
  listClassName,
}: ExamPrepSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedLabel = options.find(option => option.value === value)?.label

  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (!containerRef.current) return
      if (containerRef.current.contains(event.target as Node)) return
      setIsOpen(false)
    }
    window.addEventListener('pointerdown', handleClickOutside)
    return () => window.removeEventListener('pointerdown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false)
      return
    }
    const id = window.requestAnimationFrame(() => setIsVisible(true))
    return () => window.cancelAnimationFrame(id)
  }, [isOpen])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
        onClick={() => setIsOpen(prev => !prev)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-gray-900/10',
          buttonClassName
        )}
      >
        <span className={cn('truncate', selectedLabel ? 'text-gray-900' : 'text-gray-400')}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen ? 'rotate-180' : '')} />
      </button>
      {isOpen && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-[70] mt-2 max-h-64 overflow-y-auto overflow-x-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg',
            listClassName
          )}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
        >
          {errorLabel ? (
            <div className="px-3 py-2 text-sm text-rose-500">{errorLabel}</div>
          ) : isLoading ? (
            <div className="px-3 py-2 text-sm text-gray-500">불러오는 중...</div>
          ) : options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">{emptyLabel}</div>
          ) : (
            options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center px-3 py-2 text-left text-sm text-gray-700 transition-all duration-200',
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1',
                  'hover:bg-gray-50',
                  option.value === value ? 'bg-gray-100 font-semibold text-gray-900' : ''
                )}
                style={{ transitionDelay: `${index * 30}ms` }}
              >
                <span className="block whitespace-nowrap">
                  {option.label}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

