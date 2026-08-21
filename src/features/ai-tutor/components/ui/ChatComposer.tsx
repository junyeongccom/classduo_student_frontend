/**
 * Chat composer (Pure UI)
 * - Input
 * - Bottom row: simple/detailed/socratic 3-세그먼트 토글 + Send button
 *   (compactModeToggle=앱 WebView: 3개를 늘어놓는 대신 현재 모드 칩 1개 + 위로 뜨는 선택 시트)
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { Send, Loader2, Sparkles, Brain, ChevronUp, Camera, X } from 'lucide-react'
import type { ChatMode } from '@/features/ai-tutor/types'

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  disabled?: boolean
  placeholder?: string
  chatMode: ChatMode
  onChatModeChange: (mode: ChatMode) => void
  socraticDisabled?: boolean
  // v2.0: 소크라 세션 진행 중(chatMode==='socratic' 또는 활성 주제 존재) — simple/detailed 로도 못 벗어나게 잠금
  simpleDetailedDisabled?: boolean
  onFocus?: () => void
  onBlur?: () => void
  topOverlay?: React.ReactNode
  simpleHelpText?: string
  deepHelpText?: string
  sendLabel?: string
  simpleLabel?: string
  deepLabel?: string
  /** 앱 WebView 처럼 폭이 좁을 때 — 3-세그먼트 대신 현재 모드 칩 1개 + 선택 시트로 접는다 */
  compactModeToggle?: boolean
  /** 사진 첨부 (수학 문제 촬영 질문). 미전달이면 첨부 버튼을 렌더하지 않는다 */
  onAttachFile?: (file: File) => void
  /** 첨부된 사진 미리보기 (data URL). 있으면 입력창 위에 썸네일 칩을 띄운다 */
  attachedImagePreview?: string | null
  onRemoveAttachedImage?: () => void
  attachImageLabel?: string
  attachedImageAlt?: string
  removeAttachedImageLabel?: string
}

/** 모드 → 라벨 i18n 키. 칩(현재 모드)과 선택 시트가 같은 표기를 쓰게 하는 단일 출처 */
const MODE_LABEL_KEY: Record<ChatMode, string> = {
  simple: 'simpleLabel',
  detailed: 'detailedLabel',
  socratic: 'socraticLabel',
}

const CHAT_MODES: readonly ChatMode[] = ['simple', 'detailed', 'socratic']

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  chatMode,
  onChatModeChange,
  socraticDisabled,
  simpleDetailedDisabled,
  onFocus,
  onBlur,
  topOverlay,
  sendLabel = 'Send',
  simpleLabel = 'SIMPLE',
  deepLabel = 'DEEP',
  simpleHelpText,
  deepHelpText,
  compactModeToggle = false,
  onAttachFile,
  attachedImagePreview,
  onRemoveAttachedImage,
  attachImageLabel = 'Attach photo',
  attachedImageAlt = 'Attached photo',
  removeAttachedImageLabel = 'Remove photo',
}: ChatComposerProps) {
  const t = useTranslations('aiTutorChat')
  // 사진이 첨부돼 있으면 텍스트 없이도 전송 가능 (문제 사진만 찍어 질문하는 경로)
  const canSend = !disabled && (!!value.trim() || !!attachedImagePreview)
  // 컴팩트 모드 선택 시트 열림 여부 (UI 순간 상태)
  const [isModeSheetOpen, setIsModeSheetOpen] = useState(false)
  const formRef = useRef<HTMLFormElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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

  /** 모드별 잠금 — 소크라 세션 중에는 simple/detailed 로 못 벗어나고, 소크라는 단일 회차에서만 */
  const isModeDisabled = (mode: ChatMode): boolean =>
    mode === 'socratic' ? socraticDisabled === true : simpleDetailedDisabled === true

  const handleCompactModeSelect = (mode: ChatMode) => {
    if (isModeDisabled(mode)) return
    setIsModeSheetOpen(false)
    if (mode !== chatMode) onChatModeChange(mode)
  }

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <div className="relative">
        {topOverlay}

        {/* 컴팩트 모드 선택 시트 — 입력창 위로 뜬다. 입력창 컨테이너는 overflow-hidden 이라
            그 바깥(relative 래퍼)에 둬야 잘리지 않는다. */}
        {compactModeToggle && isModeSheetOpen && (
          <>
            {/* 바깥 탭으로 닫기 — 시트보다 아래 레이어에 깐다 */}
            <div
              className="fixed inset-0 z-20"
              onClick={() => setIsModeSheetOpen(false)}
              aria-hidden="true"
            />
            <div
              role="listbox"
              aria-label={t('modeToggleLabel')}
              className="absolute bottom-full left-0 z-30 mb-2 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
            >
              {CHAT_MODES.map((mode) => {
                const modeDisabled = isModeDisabled(mode)
                return (
                  <button
                    key={mode}
                    type="button"
                    role="option"
                    aria-selected={chatMode === mode}
                    disabled={modeDisabled}
                    onClick={() => handleCompactModeSelect(mode)}
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs transition-colors ${
                      chatMode === mode ? 'bg-gray-50 font-semibold text-gray-900' : 'text-gray-600'
                    } ${modeDisabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-gray-50'}`}
                  >
                    {t(MODE_LABEL_KEY[mode])}
                    {chatMode === mode && <span aria-hidden="true">•</span>}
                  </button>
                )
              })}
            </div>
          </>
        )}
        <div className="w-full overflow-hidden rounded-xl border border-gray-300 bg-white">
          {/* 첨부한 문제 사진 미리보기 — 전송 전 확인/제거 */}
          {attachedImagePreview && (
            <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL 미리보기라 next/image 불필요 */}
              <img
                src={attachedImagePreview}
                alt={attachedImageAlt}
                className="h-12 w-12 rounded-lg border border-gray-200 object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-gray-500">{attachedImageAlt}</span>
              <button
                type="button"
                onClick={onRemoveAttachedImage}
                aria-label={removeAttachedImageLabel}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
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

          {/* Bottom half: controls (v2.0: simple/detailed/socratic 3-세그먼트 토글) */}
          <div className="flex items-center justify-end gap-3 px-4 py-1" style={{ minHeight: '34px' }}>
            {/* 모드 토글(컴팩트) — 현재 모드만 칩으로 보이고, 탭하면 위 시트에서 고른다.
                순환 탭이 아니라 시트인 이유: 소크라 세션 중/다중 회차 선택처럼 특정 모드가
                잠기는 규칙이 있어, 순환이면 탭해도 안 바뀌는 이유를 화면이 설명하지 못한다. */}
            {compactModeToggle ? (
              <button
                type="button"
                onClick={() => setIsModeSheetOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={isModeSheetOpen}
                aria-label={`${t('modeToggleLabel')}: ${t(MODE_LABEL_KEY[chatMode])}`}
                className="mr-auto inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
              >
                {t(MODE_LABEL_KEY[chatMode])}
                <ChevronUp
                  className={`h-3 w-3 text-gray-400 transition-transform ${isModeSheetOpen ? 'rotate-180' : ''}`}
                />
              </button>
            ) : (
            /* 모드 토글 — simple ↔ detailed ↔ socratic */
            <div className="mr-auto flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
              <button
                type="button"
                disabled={simpleDetailedDisabled}
                onClick={() => {
                  if (simpleDetailedDisabled) return
                  onChatModeChange('simple')
                }}
                className={`rounded-full px-3 py-1 ${chatMode === 'simple' ? 'bg-white font-semibold shadow-sm' : 'text-gray-500'} ${simpleDetailedDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t('simpleLabel')}
              </button>
              <button
                type="button"
                disabled={simpleDetailedDisabled}
                onClick={() => {
                  if (simpleDetailedDisabled) return
                  onChatModeChange('detailed')
                }}
                className={`rounded-full px-3 py-1 ${chatMode === 'detailed' ? 'bg-white font-semibold shadow-sm' : 'text-gray-500'} ${simpleDetailedDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t('detailedLabel')}
              </button>
              <button
                type="button"
                disabled={socraticDisabled}
                onClick={() => {
                  if (socraticDisabled) return
                  onChatModeChange('socratic')
                }}
                className={`rounded-full px-3 py-1 ${chatMode === 'socratic' ? 'bg-white font-semibold shadow-sm' : 'text-gray-500'} ${socraticDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {t('socraticLabel')}
              </button>
            </div>
            )}
            {onAttachFile && chatMode !== 'socratic' && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onAttachFile(file)
                    // 같은 파일 재선택도 change 로 잡히게 초기화
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={attachImageLabel}
                  title={attachImageLabel}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </>
            )}
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


