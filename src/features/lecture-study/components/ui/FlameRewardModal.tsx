/**
 * @file FlameRewardModal.tsx
 * @description 퀴즈 전부 풀이 완료 시 보상 축하 모달 — 확인 클릭 시 상단 불꽃 배지로 빨려들어가는 애니메이션
 * @module features/lecture-study/components/ui
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useCallback, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Flame } from 'lucide-react'

interface FlameRewardModalProps {
  courseName: string
  weekSession: string
  onClose: () => void
}

export function FlameRewardModal({ courseName, weekSession, onClose }: FlameRewardModalProps) {
  const t = useTranslations('lectureStudy.quiz.rewardModal')
  const modalRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  const handleConfirm = useCallback(() => {
    const badge = document.getElementById('flame-badge')
    const modal = modalRef.current
    if (!badge || !modal) {
      window.dispatchEvent(new CustomEvent('flame-increment'))
      onClose()
      return
    }

    const badgeRect = badge.getBoundingClientRect()
    const modalRect = modal.getBoundingClientRect()

    const targetX = badgeRect.left + badgeRect.width / 2 - (modalRect.left + modalRect.width / 2)
    const targetY = badgeRect.top + badgeRect.height / 2 - (modalRect.top + modalRect.height / 2)

    modal.style.setProperty('--fly-x', `${targetX}px`)
    modal.style.setProperty('--fly-y', `${targetY}px`)

    setIsAnimating(true)

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('flame-increment'))
      onClose()
    }, 500)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative z-10 flex flex-col items-center gap-5 rounded-3xl border border-[#6366F1]/20 bg-white px-10 py-8 shadow-2xl shadow-[#6366F1]/20 ${
          isAnimating ? 'animate-fly-to-badge' : 'animate-modal-enter'
        }`}
        style={
          { '--fly-x': '0px', '--fly-y': '0px' } as React.CSSProperties
        }
      >
        {/* Flame icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#6366F1]/10">
          <Flame className="h-10 w-10 fill-[#6366F1] text-[#6366F1]" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black text-gray-900">
          {t('title')}
        </h2>

        {/* Message */}
        <p className="text-center text-sm text-gray-600">
          {t('message', { courseName, weekSession })}
        </p>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={isAnimating}
          className="mt-2 rounded-2xl bg-[#6366F1] px-10 py-3 text-sm font-bold text-white shadow-lg shadow-[#6366F1]/30 transition-all hover:scale-105 hover:bg-[#5558E6] active:scale-95 disabled:opacity-70"
        >
          {t('confirm')}
        </button>
      </div>

      {/* Keyframe styles */}
      <style jsx>{`
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.8) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes fly-to-badge {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--fly-x), var(--fly-y)) scale(0.1);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.3s ease-out;
        }
        .animate-fly-to-badge {
          animation: fly-to-badge 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  )
}
