/**
 * Chat composer (Pure UI)
 * - Input
 * - Bottom row: HARD/SOFT toggle + Send button
 */
'use client'

import { Send, Loader2 } from 'lucide-react'
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
}: ChatComposerProps) {
  const canSend = !disabled && !!value.trim()

  return (
    <form onSubmit={onSubmit}>
      <div className="relative">
        {topOverlay}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-full border border-gray-300 bg-gray-50 px-5 py-3 text-sm focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-full bg-gray-100 p-1">
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

        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
        >
          {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span>Send</span>
        </button>
      </div>
    </form>
  )
}


