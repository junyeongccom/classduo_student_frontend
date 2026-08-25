/**
 * @file SocraticOnboardingModal.tsx
 * @description 소크라 문답 첫 진입 온보딩 모달 — 4단계 진행·디딤돌/아하·점수 체계 안내
 * @module features/ai-tutor/components/ui
 * @dependencies next-intl (aiTutorChat 네임스페이스)
 *
 * 우측 점수 패널(SocraticScorePanel)의 구성 요소를 그대로 축약해 보여준다 —
 * 단계 칩 = 문답 단계 맵, 초록 계단 = 디딤돌, ✨ = 아하 배지, 점수 4칸 = 통과 방식별 배점.
 * 다크모드: 소크라 패널 계열이 dark: 변형을 쓰지 않으므로 동일하게 라이트 전용.
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

interface SocraticOnboardingModalProps {
  isOpen: boolean
  /** 닫기 — dontShowAgain 이 true 면 이후 세션에서 다시 표시하지 않는다. */
  onClose: (dontShowAgain: boolean) => void
}

// 우측 패널의 문답 단계 맵과 같은 순서·같은 i18n 키를 쓴다 (표기 불일치 방지)
const STAGE_KEYS = ['termMemory', 'concept', 'analysisApply', 'judgeDesign'] as const

// 통과 방식별 배점 — 백엔드 채점 규칙과 SocraticScorePanel 의 socraticMethod 라벨에 대응
const SCORE_CELLS = [
  { key: 'scoreSelf', value: '100%' },
  { key: 'scoreHint1', value: '80%' },
  { key: 'scoreHint2', value: '60%' },
  { key: 'scoreChoice', value: '40%' },
] as const

/** 디딤돌(더 쉬운 질문)을 나타내는 초록 계단 — 패널의 계단 표현 축소판 */
function StairBars() {
  return (
    <span className="flex shrink-0 items-end gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((s) => (
        <span
          key={s}
          className="w-1.5 rounded-sm bg-emerald-400"
          style={{ height: `${6 + s * 4}px` }}
        />
      ))}
    </span>
  )
}

export function SocraticOnboardingModal({ isOpen, onClose }: SocraticOnboardingModalProps) {
  const t = useTranslations('aiTutorChat')
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const startButtonRef = useRef<HTMLButtonElement>(null)
  // ESC 핸들러가 최신 체크 상태를 보도록 ref 로 보관 (리스너 재등록 없이)
  const dontShowAgainRef = useRef(dontShowAgain)
  dontShowAgainRef.current = dontShowAgain

  const handleClose = useCallback(() => {
    onClose(dontShowAgainRef.current)
  }, [onClose])

  // 열릴 때마다 체크 상태 초기화 + 시작 버튼으로 포커스 이동
  useEffect(() => {
    if (!isOpen) return
    setDontShowAgain(false)
    startButtonRef.current?.focus()
  }, [isOpen])

  // ESC 닫기
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, handleClose])

  // 배경 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  if (!isOpen) return null

  const bold = (chunks: React.ReactNode) => (
    <strong className="font-semibold text-gray-800">{chunks}</strong>
  )

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="socratic-onboarding-title"
    >
      <div className="flex max-h-full w-[min(92vw,440px)] flex-col overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* 제목 */}
        <h2 id="socratic-onboarding-title" className="text-base font-bold text-gray-900">
          {t('socraticOnboarding.title')}
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
          {t('socraticOnboarding.subtitle')}
        </p>

        {/* 1. 네 단계를 차례로 지나갑니다 */}
        <div className="mt-4 border-t border-gray-100 pt-4" style={{ borderTopWidth: '0.5px' }}>
          <div className="text-xs font-semibold text-gray-700">
            {t('socraticOnboarding.stagesHeading')}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            {STAGE_KEYS.map((key, i) => (
              <span key={key} className="flex items-center gap-1">
                {i > 0 && (
                  <span className="text-[10px] text-gray-300" aria-hidden="true">
                    →
                  </span>
                )}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    i === 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {t(`socraticStage.${key}`)}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            {t.rich('socraticOnboarding.stagesNote', { b: bold })}
          </p>
        </div>

        {/* 2. 막혀도 괜찮아요 */}
        <div className="mt-4 border-t border-gray-100 pt-4" style={{ borderTopWidth: '0.5px' }}>
          <div className="text-xs font-semibold text-gray-700">
            {t('socraticOnboarding.stuckHeading')}
          </div>
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2.5">
              <StairBars />
              <span className="text-[11px] leading-relaxed text-gray-500">
                {t.rich('socraticOnboarding.stuckScaffold', { b: bold })}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-[18px] shrink-0 text-center text-sm leading-none" aria-hidden="true">
                ✨
              </span>
              <span className="text-[11px] leading-relaxed text-gray-500">
                {t.rich('socraticOnboarding.stuckAha', { b: bold })}
              </span>
            </div>
          </div>
        </div>

        {/* 3. 점수는 스스로 맞힐수록 높아져요 */}
        <div className="mt-4 border-t border-gray-100 pt-4" style={{ borderTopWidth: '0.5px' }}>
          <div className="text-xs font-semibold text-gray-700">
            {t('socraticOnboarding.scoreHeading')}
          </div>
          {/* 375px 에서는 2×2 로 접힌다 */}
          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {SCORE_CELLS.map((cell, i) => (
              <div
                key={cell.key}
                className={`rounded-lg px-2 py-1.5 text-center ${
                  i === 0 ? 'bg-indigo-50' : 'bg-gray-50'
                }`}
              >
                <div
                  className={`text-[10px] leading-tight ${
                    i === 0 ? 'text-indigo-500' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t(`socraticOnboarding.${cell.key}`)}
                </div>
                <div
                  className={`text-sm font-bold tabular-nums ${
                    i === 0 ? 'text-indigo-600' : 'text-gray-500'
                  }`}
                >
                  {cell.value}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
            {t.rich('socraticOnboarding.scoreNote', { b: bold })}
          </p>
        </div>

        {/* 하단 — 다시 보지 않기 + 시작하기 */}
        <div
          className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4"
          style={{ borderTopWidth: '0.5px' }}
        >
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-gray-500 select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded border-gray-300 accent-indigo-600"
            />
            {t('socraticOnboarding.dontShowAgain')}
          </label>
          <button
            ref={startButtonRef}
            type="button"
            onClick={handleClose}
            className="h-9 shrink-0 cursor-pointer rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            {t('socraticOnboarding.start')}
          </button>
        </div>
      </div>
    </div>
  )
}
