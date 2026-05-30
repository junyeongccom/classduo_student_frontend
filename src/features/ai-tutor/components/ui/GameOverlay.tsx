/**
 * 게임 UI 오버레이 컴포넌트 (Phaser 점프 액션 게임)
 */
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Loader2 } from 'lucide-react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { useMobilePortrait } from '@/shared/hooks/useMediaQuery'

interface GameOverlayProps {
  isOpen: boolean
  onClose: (score?: number, rankSubmitted?: boolean) => void
  triggerPosition: { top: number; left: number; width: number; height: number } | null
  lectureId?: string
  courseId?: string
  lectureNo?: number
  courseName?: string
  gameMode?: 'rank' | 'normal'
  words?: { keyword: string; description: string }[]
  nickname?: string
}

export function GameOverlay({ isOpen, onClose, triggerPosition, lectureId, courseId, gameMode, words, nickname }: GameOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import('phaser').Game | null>(null)
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting'>('entering')
  const [isGameReady, setIsGameReady] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 675 })
  const keywordsRef = useRef<{ keyword: string; description: string }[]>([])
  const { locale } = useI18n()
  // 모바일 세로: 게임을 가로 모드로 강제(90° 회전)
  const landscape = useMobilePortrait()

  // 2:1 비율 계산 (모바일 세로면 화면 긴 변 기준으로 가로 채움 후 회전)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (landscape) {
      const long = Math.max(window.innerWidth, window.innerHeight)
      const short = Math.min(window.innerWidth, window.innerHeight)
      let width = long // 게임 가로폭(2) → 회전 후 화면 세로를 채움
      let height = width / 2
      if (height > short) {
        height = short
        width = height * 2
      }
      setDimensions({ width, height })
      return
    }
    const maxWidth = window.innerWidth * 0.9
    const maxHeight = window.innerHeight * 0.9
    let width = Math.min(maxWidth, 1600)
    let height = width / 2 // game is 2:1 ratio (1600x800)
    if (height > maxHeight) {
      height = maxHeight
      width = height * 2
    }
    setDimensions({ width, height })
  }, [landscape])

  // 애니메이션 상태 관리
  useEffect(() => {
    if (isOpen) {
      setAnimationState('entering')
      setTimeout(() => {
        setAnimationState('entered')
      }, 100)
    } else {
      setAnimationState('exiting')
    }
  }, [isOpen])

  // 키워드 fetch (애니메이션과 병렬) — normal 모드에서는 props로 전달받은 words 사용
  useEffect(() => {
    if (!isOpen || !lectureId) {
      keywordsRef.current = []
      return
    }
    // Use custom words passed from parent (both normal and rank mode)
    if (words && words.length > 0) {
      keywordsRef.current = words
      return
    }
    let cancelled = false
    ;(async () => {
      const { chatService } = await import('../../services/chatService')
      const { data } = await chatService.getLectureKeywords(lectureId, locale)
      if (!cancelled && data?.keywords) {
        const isEn = locale === 'en'
        keywordsRef.current = data.keywords.map((k) => ({
          keyword: (isEn && k.keyword_eng) || k.keyword,
          description: (isEn && k.description_eng) || k.description,
        }))
      }
    })()
    return () => { cancelled = true }
  }, [isOpen, lectureId, locale, gameMode, words])

  // Phaser 인스턴스 생성/소멸
  useEffect(() => {
    if (!isOpen || animationState !== 'entered' || typeof window === 'undefined') return
    if (!containerRef.current || gameRef.current) return

    let game: import('phaser').Game | null = null

    setIsGameReady(false)

    const initGame = async () => {
      const Phaser = (await import('phaser')).default
      const { createGameConfig } = await import('../../game/config')

      if (!containerRef.current) return

      const config = createGameConfig(containerRef.current, landscape ? dimensions.width / 1600 : undefined)
      game = new Phaser.Game(config)
      game.registry.set('keywords', keywordsRef.current)
      game.registry.set('locale', locale)
      if (lectureId) game.registry.set('lectureId', lectureId)
      if (courseId) game.registry.set('courseId', courseId)
      game.registry.set('gameMode', gameMode ?? 'rank')
      if (nickname) game.registry.set('nickname', nickname)
      gameRef.current = game
      setIsGameReady(true)

      // 모바일 세로에서 캔버스를 90° CSS 회전하면 Phaser의 기본 포인터 변환이
      // 회전된 getBoundingClientRect를 그대로 써서 좌표가 어긋난다(터치가 안 먹힘).
      // 회전을 역보정하는 transformPointer로 교체한다.
      if (landscape) {
        const canvas = game.canvas
        game.input.transformPointer = function (pointer, pageX, pageY, wasMove) {
          const p0 = pointer.position
          const p1 = pointer.prevPosition
          p1.x = p0.x
          p1.y = p0.y
          const rect = canvas.getBoundingClientRect()
          const cx = rect.left + rect.width / 2
          const cy = rect.top + rect.height / 2
          const cssW = rect.height // 회전 전 논리 가로 = 화면상 세로
          const z = cssW / canvas.width
          const halfW = cssW / 2
          const halfH = rect.width / 2
          const sx = pageX - window.scrollX - cx
          const sy = pageY - window.scrollY - cy
          const x = (sy + halfW) / z
          const y = (halfH - sx) / z
          const a = pointer.smoothFactor
          if (!wasMove || a === 0) {
            p0.x = x
            p0.y = y
          } else {
            p0.x = x * a + p1.x * (1 - a)
            p0.y = y * a + p1.y * (1 - a)
          }
        }
      }

      // 게임 컨테이너로 포커스 이동 → 사이드바 버튼의 onKeyDown이 SPACE를 가로채지 않도록
      containerRef.current?.focus()
    }

    initGame()

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true)
        gameRef.current = null
      }
      game = null
    }
  }, [isOpen, animationState])

  // isOpen이 false로 바뀌면 Phaser 인스턴스 소멸
  useEffect(() => {
    if (!isOpen && gameRef.current) {
      gameRef.current.destroy(true)
      gameRef.current = null
      setIsGameReady(false)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    const finalScore = gameRef.current?.registry?.get('finalScore') as number | undefined
    const rankSubmitted = gameRef.current?.registry?.get('rankSubmitted') as boolean | undefined
    onClose(finalScore ?? 0, rankSubmitted ?? false)
  }, [onClose])

  if (!isOpen && animationState === 'exiting') {
    return null
  }

  const rotate = landscape ? ' rotate(90deg)' : ''

  const getInitialTransform = () => {
    if (!triggerPosition || typeof window === 'undefined') {
      return `translate(-50%, -50%)${rotate} scale(0)`
    }
    const scale = triggerPosition.width / dimensions.width
    const x = triggerPosition.left + triggerPosition.width / 2 - window.innerWidth / 2
    const y = triggerPosition.top + triggerPosition.height / 2 - window.innerHeight / 2
    return `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))${rotate} scale(${scale})`
  }

  const getFinalTransform = () => {
    return `translate(-50%, -50%)${rotate} scale(1)`
  }

  return (
    <>
      {/* 배경 오버레이 */}
      {/* 배경 클릭으로 닫히지 않음 — 게임 활성 중에는 X 버튼만 닫기 허용 */}
      <div
        className={`fixed inset-0 bg-black/50 z-[80] transition-opacity duration-500 ${
          animationState === 'entered' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* 게임 컨테이너 */}
      <div
        className="fixed z-[80] rounded-2xl shadow-2xl overflow-hidden"
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
        {/* 닫기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
          }}
          className="absolute top-3 right-3 z-20 p-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-lg"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* 로딩 표시 */}
        {!isGameReady && animationState === 'entered' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-950">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
            <p className="mt-3 text-sm text-gray-400">Loading game...</p>
          </div>
        )}

        {/* Phaser 렌더 영역 */}
        <div
          ref={containerRef}
          tabIndex={-1}
          className="w-full h-full bg-[#e8f4f8] outline-none"
        />
      </div>
    </>
  )
}
