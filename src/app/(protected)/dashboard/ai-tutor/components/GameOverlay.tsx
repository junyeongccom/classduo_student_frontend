/**
 * 게임 UI 오버레이 컴포넌트 (gooey 효과)
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface GameOverlayProps {
  isOpen: boolean
  onClose: () => void
  triggerPosition: { top: number; left: number; width: number; height: number } | null
}

export function GameOverlay({ isOpen, onClose, triggerPosition }: GameOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting'>('entering')
  const [dimensions, setDimensions] = useState({ width: 1200, height: 675 })
  const [frameIndex, setFrameIndex] = useState(0) // 프레임 시퀀스 인덱스
  const [backgroundOffset, setBackgroundOffset] = useState(0) // 배경 스크롤 오프셋
  const frameSequence = [1, 2, 3, 2, 1, 2, 3, 2] // 1->2->3->2->1->2->3->2 반복
  const currentFrame = frameSequence[frameIndex]

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 16:9 비율 계산 (최대 너비 80vw, 높이는 자동 계산)
      const maxWidth = window.innerWidth * 0.8
      const width = Math.min(maxWidth, 1200)
      const height = (width * 9) / 16
      setDimensions({ width, height })
    }
  }, [])

  // 스프라이트 애니메이션 (1->2->3->2->1->2->3->2 반복)
  useEffect(() => {
    if (!isOpen || animationState !== 'entered') return

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frameSequence.length)
    }, 150) // 150ms마다 프레임 변경 (빠른 애니메이션)

    return () => clearInterval(interval)
  }, [isOpen, animationState])

  // 배경 스크롤 애니메이션 (앞으로 나아가는 느낌)
  useEffect(() => {
    if (!isOpen || animationState !== 'entered') return

    let animationFrameId: number
    let lastTime = 0
    const speed = 2 // 배경 스크롤 속도

    function animate(currentTime: number) {
      if (lastTime === 0) {
        lastTime = currentTime
      }
      
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      setBackgroundOffset((prev) => {
        const newOffset = prev + speed
        // 배경이 반복되도록 오프셋 리셋 (배경 패턴 너비에 따라 조정)
        return newOffset >= 200 ? 0 : newOffset
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isOpen, animationState])

  useEffect(() => {
    if (isOpen) {
      setAnimationState('entering')
      // gooey 효과를 위한 애니메이션 시작
      setTimeout(() => {
        setAnimationState('entered')
      }, 100)
    } else {
      setAnimationState('exiting')
    }
  }, [isOpen])

  if (!isOpen && animationState === 'exiting') {
    return null
  }

  // 초기 위치 계산 (트리거 위치에서 시작)
  const getInitialTransform = () => {
    if (!triggerPosition || typeof window === 'undefined') {
      return 'translate(-50%, -50%) scale(0)'
    }
    const scale = triggerPosition.width / dimensions.width
    const x = triggerPosition.left + triggerPosition.width / 2 - window.innerWidth / 2
    const y = triggerPosition.top + triggerPosition.height / 2 - window.innerHeight / 2
    return `translate(${x}px, ${y}px) scale(${scale})`
  }

  const getFinalTransform = () => {
    return 'translate(-50%, -50%) scale(1)'
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-500 ${
          animationState === 'entered' ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* 게임 UI 컨테이너 */}
      <div
        ref={overlayRef}
        className="fixed z-50 rounded-2xl bg-white shadow-2xl overflow-hidden game-overlay-container"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          left: '50%',
          top: '50%',
          transform: animationState === 'entered' ? getFinalTransform() : getInitialTransform(),
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease-out',
          opacity: animationState === 'entered' ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gooey 효과 배경 */}
        <div className="absolute inset-0 game-gooey-bg" />

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-lg"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* 게임 화면 */}
        <div className="relative z-10 h-full overflow-hidden bg-gradient-to-b from-sky-400 via-sky-300 to-sky-200">
          {/* 스크롤되는 배경 (앞으로 나아가는 느낌) */}
          <div 
            className="absolute inset-0 game-background-scroll"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 100px, rgba(255,255,255,0.1) 100px, rgba(255,255,255,0.1) 102px)',
              backgroundPosition: `${backgroundOffset}px 0`,
              backgroundSize: '200px 100%',
            }}
          />

          {/* 캐릭터 (하단 중앙에 위치) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10">
            <img
              src={`/run_${currentFrame}.png`}
              alt={`Run frame ${currentFrame}`}
              className="h-auto max-h-[60%] object-contain"
              style={{
                imageRendering: 'pixelated', // 픽셀 아트 스타일 유지
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

