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
  const [doors, setDoors] = useState<Array<{ id: number; top: number }>>([]) // 문 목록
  const doorIdRef = useRef(0) // 문 ID 생성용
  const frameSequence = [1, 2, 3, 2, 1, 2, 3, 2] // 1->2->3->2->1->2->3->2 반복
  const currentFrame = frameSequence[frameIndex]
  
  // 기준 해상도 (모든 크기는 이 해상도 기준으로 설계)
  const REFERENCE_WIDTH = 1200
  const REFERENCE_HEIGHT = 675
  
  // 스케일 팩터 계산 (화면 크기에 따라 모든 요소를 동일한 비율로 확대/축소)
  const scaleFactor = dimensions.width / REFERENCE_WIDTH

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

  // 배경 스크롤 애니메이션 (위에서 아래로 내려오는 느낌)
  useEffect(() => {
    if (!isOpen || animationState !== 'entered') return

    let animationFrameId: number
    let lastTime = 0
    const BASE_SPEED = 2 // 기준 스크롤 속도
    const speed = BASE_SPEED * scaleFactor // 스케일에 비례한 스크롤 속도

    function animate(currentTime: number) {
      if (lastTime === 0) {
        lastTime = currentTime
      }
      
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      setBackgroundOffset((prev) => {
        const newOffset = prev + speed
        // 배경이 반복되도록 오프셋 리셋 (배경 패턴 높이에 따라 조정)
        return newOffset >= 200 * scaleFactor ? 0 : newOffset
      })

      // 문들도 함께 아래로 이동
      setDoors((prevDoors) => {
        return prevDoors
          .map((door) => ({
            ...door,
            top: door.top + speed,
          }))
          .filter((door) => door.top < dimensions.height + 250 * scaleFactor) // 화면 밖으로 나간 문 제거 (스케일 적용)
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isOpen, animationState, dimensions.height, scaleFactor])

  // 10초마다 문 생성
  useEffect(() => {
    if (!isOpen || animationState !== 'entered') return

    const interval = setInterval(() => {
      const newDoorId = doorIdRef.current++
      setDoors((prevDoors) => [
        ...prevDoors,
        { id: newDoorId, top: -250 * scaleFactor }, // 화면 위에서 시작 (스케일 적용)
      ])
    }, 10000) // 10초마다

    return () => clearInterval(interval)
  }, [isOpen, animationState, scaleFactor])

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
        <div className="relative z-10 h-full overflow-hidden bg-gradient-to-b from-green-500 via-green-600 to-green-700">
          {/* 좌우 풀 배경 */}
          <div className="absolute inset-0 bg-gradient-to-b from-green-400 via-green-500 to-green-600">
            {/* 풀 텍스처 (위에서 아래로 스크롤) */}
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${30 * scaleFactor}px, rgba(34,197,94,0.4) ${30 * scaleFactor}px, rgba(34,197,94,0.4) ${32 * scaleFactor}px)`,
                backgroundPosition: `0 ${backgroundOffset}px`,
                backgroundSize: `100% ${200 * scaleFactor}px`,
              }}
            />
          </div>

          {/* 가운데 길 (위에서 아래로 스크롤) */}
          <div 
            className="absolute inset-0 z-5"
            style={{
              background: 'linear-gradient(to right, transparent 0%, transparent 30%, #8B7355 30%, #8B7355 70%, transparent 70%, transparent 100%)',
            }}
          >
            {/* 길 텍스처 (위에서 아래로 스크롤) */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${50 * scaleFactor}px, rgba(139,115,85,0.3) ${50 * scaleFactor}px, rgba(139,115,85,0.3) ${52 * scaleFactor}px)`,
                backgroundPosition: `0 ${backgroundOffset}px`,
                backgroundSize: `100% ${200 * scaleFactor}px`,
                clipPath: 'polygon(30% 0%, 70% 0%, 70% 100%, 30% 100%)',
              }}
            />
            {/* 길 중앙선 */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${20 * scaleFactor}px, rgba(255,255,255,0.3) ${20 * scaleFactor}px, rgba(255,255,255,0.3) ${22 * scaleFactor}px)`,
                backgroundPosition: `0 ${backgroundOffset}px`,
                backgroundSize: `100% ${200 * scaleFactor}px`,
                clipPath: 'polygon(49% 0%, 51% 0%, 51% 100%, 49% 100%)',
              }}
            />
            {/* 길 좌우 경계선 */}
            <div className="absolute top-0 bottom-0 left-[30%] w-[1px] bg-gradient-to-b from-green-600 via-green-700 to-green-600" />
            <div className="absolute top-0 bottom-0 right-[30%] w-[1px] bg-gradient-to-b from-green-600 via-green-700 to-green-600" />
          </div>

          {/* 문들 (길 위에 위치) */}
          {doors.map((door) => (
            <div key={door.id} className="absolute z-15" style={{ top: `${door.top}px`, left: '0', width: '100%', height: `${250 * scaleFactor}px` }}>
              {/* 좌측 O 문 - 길의 왼쪽 절반을 막음 (30% ~ 50%) */}
              <div className="absolute" style={{ left: '30%', width: '20%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <img
                  src="/o_door.png"
                  alt="O Door"
                  className="w-auto object-contain"
                  style={{
                    height: `${250 * scaleFactor}px`,
                    imageRendering: 'pixelated',
                    maxWidth: '100%',
                  }}
                />
              </div>
              {/* 우측 X 문 - 길의 오른쪽 절반을 막음 (50% ~ 70%) */}
              <div className="absolute" style={{ right: '30%', width: '20%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
                <img
                  src="/x_door.png"
                  alt="X Door"
                  className="w-auto object-contain"
                  style={{
                    height: `${250 * scaleFactor}px`,
                    imageRendering: 'pixelated',
                    maxWidth: '100%',
                  }}
                />
              </div>
            </div>
          ))}

          {/* 캐릭터 (길 위에 위치) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10" style={{ marginBottom: `${20 * scaleFactor}px` }}>
            <img
              src={`/run_${currentFrame}.png`}
              alt={`Run frame ${currentFrame}`}
              className="w-auto object-contain"
              style={{
                height: `${150 * scaleFactor}px`, // 기준 캐릭터 높이 150px
                imageRendering: 'pixelated', // 픽셀 아트 스타일 유지
              }}
            />
          </div>
        </div>
      </div>
    </>
  )
}

