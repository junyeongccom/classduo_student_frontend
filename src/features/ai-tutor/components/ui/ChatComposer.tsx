/**
 * Chat composer (Pure UI)
 * - Input
 * - Bottom row: HARD/SOFT toggle + Send button
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Send, Loader2, CircleHelp } from 'lucide-react'
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
  modeHelpText?: string
  modeHelpAriaLabel?: string
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
  modeHelpText,
  modeHelpAriaLabel,
}: ChatComposerProps) {
  const canSend = !disabled && !!value.trim()
  const formRef = useRef<HTMLFormElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const helpButtonRef = useRef<HTMLButtonElement | null>(null)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [helpPos, setHelpPos] = useState<{ left: number; top: number; placement: 'top' | 'bottom' } | null>(null)

  // Auto-resize textarea (top half grows with content)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  const updateHelpPosition = useCallback(() => {
    const el = helpButtonRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const tooltipWidth = 280
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
    if (!isHelpOpen) return
    updateHelpPosition()

    const onScrollOrResize = () => updateHelpPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [isHelpOpen, updateHelpPosition])

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
            rows={2}
            onKeyDown={(e) => {
              // Enter: send, Shift+Enter: newline
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                if (!canSend) return
                formRef.current?.requestSubmit()
              }
            }}
            className="w-full resize-none bg-white px-5 py-2 text-sm leading-relaxed outline-none placeholder:text-gray-400 disabled:bg-gray-50"
            style={{
              // Baseline: reduce to half of previous white input area height
              // Keep white/gray halves the same height (both slightly smaller)
              minHeight: '56px',
            }}
          />

          {/* Bottom half: controls */}
          <div
            className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-100 px-4 py-2"
            style={{ minHeight: '56px' }}
          >
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-full bg-white/70 p-1">
                <button
                  type="button"
                  onClick={() => onChatModeChange('hard')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                    chatMode === 'hard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-pressed={chatMode === 'hard'}
                >
                  HARD
                </button>
                <button
                  type="button"
                  onClick={() => onChatModeChange('soft')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                    chatMode === 'soft' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                  aria-pressed={chatMode === 'soft'}
                >
                  SOFT
                </button>
              </div>

              {modeHelpText && (
                <div className="relative flex items-center">
                  <button
                    type="button"
                    ref={helpButtonRef}
                    aria-label={modeHelpAriaLabel || 'Chat mode help'}
                    onMouseEnter={() => setIsHelpOpen(true)}
                    onMouseLeave={() => setIsHelpOpen(false)}
                    onFocus={() => setIsHelpOpen(true)}
                    onBlur={() => setIsHelpOpen(false)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-gray-600 hover:text-gray-800 hover:bg-white transition-colors"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
            >
              {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help tooltip rendered in a portal to avoid being clipped by overflow/containers */}
      {isHelpOpen && modeHelpText && helpPos && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              className="pointer-events-none fixed z-50 w-[280px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg"
              style={{
                left: helpPos.left,
                top: helpPos.top,
                transform: helpPos.placement === 'top' ? 'translateY(-100%)' : undefined,
              }}
            >
              <div className="whitespace-pre-line leading-relaxed">{modeHelpText}</div>
            </div>,
            document.body,
          )
        : null}
    </form>
  )
}


