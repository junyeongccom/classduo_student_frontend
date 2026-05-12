/**
 * Chat composer (Pure UI)
 * - Input
 * - Bottom row: SIMPLE/DEEP icon toggle + Send button
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Send, Loader2, Sparkles, Brain } from 'lucide-react'
import type { ChatMode } from '@/features/ai-tutor/types'

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  disabled?: boolean
  placeholder?: string
  chatMode: ChatMode
  onChatModeChange: (mode: ChatMode) => void
  onFocus?: () => void
  onBlur?: () => void
  topOverlay?: React.ReactNode
  simpleHelpText?: string
  deepHelpText?: string
  sendLabel?: string
  simpleLabel?: string
  deepLabel?: string
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  chatMode,
  onChatModeChange,
  onFocus,
  onBlur,
  topOverlay,
  sendLabel = 'Send',
  simpleLabel = 'SIMPLE',
  deepLabel = 'DEEP',
  simpleHelpText,
  deepHelpText,
}: ChatComposerProps) {
  const canSend = !disabled && !!value.trim()
  const formRef = useRef<HTMLFormElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const simpleButtonRef = useRef<HTMLButtonElement | null>(null)
  const deepButtonRef = useRef<HTMLButtonElement | null>(null)
  const [activeTooltip, setActiveTooltip] = useState<'simple' | 'deep' | null>(null)
  const [helpPos, setHelpPos] = useState<{ left: number; top: number; placement: 'top' | 'bottom' } | null>(null)

  // Auto-resize textarea (top half grows with content)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const updateHelpPosition = useCallback(() => {
    const el = activeTooltip === 'simple' ? simpleButtonRef.current : deepButtonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const tooltipWidth = 260
    const margin = 8
    const left = Math.min(
      Math.max(margin, rect.left + rect.width / 2 - tooltipWidth / 2),
      window.innerWidth - tooltipWidth - margin,
    )

    const preferTop = rect.top > 120
    const placement: 'top' | 'bottom' = preferTop ? 'top' : 'bottom'
    const top = placement === 'top' ? rect.top - margin : rect.bottom + margin
    setHelpPos({ left, top, placement })
  }, [])

  useEffect(() => {
    if (!activeTooltip) return
    updateHelpPosition()

    const onScrollOrResize = () => updateHelpPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [activeTooltip, updateHelpPosition])

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <div className="relative">
        {topOverlay}
        <div className="w-full overflow-hidden rounded-xl border border-gray-300 bg-white">
          {/* Top half: input only (grows with content) */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            onKeyDown={(e) => {
              // Enter: send, Shift+Enter: newline
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!canSend) return
                formRef.current?.requestSubmit()
              }
            }}
            className="w-full resize-none bg-white px-5 pt-[3px] pb-0 text-sm leading-[31px] outline-none placeholder:text-gray-400 disabled:bg-gray-50"
            style={{
              // Baseline: reduce to half of previous white input area height
              // Keep white/gray halves the same height (both slightly smaller)
              minHeight: '34px',
            }}
          />

          {/* Bottom half: controls (v1.0: SIMPLE/DEEP 토글 제거. SIMPLE 전용) */}
          <div className="flex items-center justify-end gap-3 px-4 py-1" style={{ minHeight: '34px' }}>
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-semibold text-white transition-colors hover:bg-gray-900 disabled:bg-gray-300 disabled:text-gray-500"
            >
              {disabled ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
              ) : (
                <Send className="h-3.5 w-3.5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Help tooltip rendered in a portal to avoid being clipped by overflow/containers */}
      {activeTooltip && helpPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-50 inline-flex max-w-[calc(100vw-2rem)] sm:max-w-[420px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg"
              style={{
                left: helpPos.left,
                top: helpPos.top,
                transform: helpPos.placement === 'top' ? 'translateY(-100%)' : undefined,
              }}
            >
              <div className="whitespace-pre-line leading-relaxed">
                {activeTooltip === 'simple' ? simpleHelpText : deepHelpText}
              </div>
            </div>,
            document.body,
          )
        : null}
    </form>
  )
}


