/**
 * 공통 로딩 화면 컴포넌트
 * - 캐릭터 일러스트 또는 플레이스홀더 표시
 * - 재미있는 메시지 표시
 * - 다양한 애니메이션 효과
 * - 크기와 스타일 커스터마이징 가능
 */
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getRandomMessage, type LoadingMessageCategory } from '@/shared/constants/loadingMessages'

interface LoadingScreenProps {
  /** 표시할 메시지 (지정하지 않으면 랜덤 선택) */
  message?: string
  /** 메시지 카테고리 (message가 없을 때 이 카테고리에서 랜덤 선택) */
  messageCategory?: LoadingMessageCategory
  /** 캐릭터 이미지 URL (없으면 플레이스홀더 표시) */
  characterImageUrl?: string
  /** 프로그레스 바 표시 여부 */
  showProgress?: boolean
  /** 로딩 화면 크기 */
  size?: 'fullscreen' | 'inline' | 'compact'
  /** 추가 CSS 클래스 */
  className?: string
  /** 최소 표시 시간 (ms) */
  minDisplayTime?: number
}

export function LoadingScreen({
  message,
  messageCategory = 'general',
  characterImageUrl,
  showProgress = false,
  size = 'fullscreen',
  className = '',
  minDisplayTime,
}: LoadingScreenProps) {
  const t = useTranslations('loadingMessages')
  const [displayMessage, setDisplayMessage] = useState<string>('')
  const [isVisible, setIsVisible] = useState(false)

  // 메시지 설정
  useEffect(() => {
    const msg = message || getRandomMessage(t, messageCategory)
    setDisplayMessage(msg)
  }, [message, messageCategory, t])

  // 최소 표시 시간 처리
  useEffect(() => {
    setIsVisible(true)
    if (minDisplayTime) {
      const timer = setTimeout(() => {
        // 최소 표시 시간 경과 후에도 계속 표시
        // 실제 언마운트는 부모 컴포넌트의 isLoading이 false가 될 때
      }, minDisplayTime)
      return () => clearTimeout(timer)
    }
  }, [minDisplayTime])

  // 크기별 스타일
  const sizeStyles = {
    fullscreen: 'fixed inset-0 z-50 bg-white',
    inline: 'w-full h-full min-h-[400px]',
    compact: 'w-full h-auto py-8',
  }

  // 캐릭터 크기
  const characterSize = {
    fullscreen: 'w-48 h-48',
    inline: 'w-32 h-32',
    compact: 'w-20 h-20',
  }

  // 텍스트 크기
  const textSize = {
    fullscreen: 'text-lg',
    inline: 'text-base',
    compact: 'text-sm',
  }

  return (
    <div
      className={`flex flex-col items-center justify-center ${sizeStyles[size]} ${className}`}
    >
      {/* 캐릭터 영역 */}
      <div className="relative mb-6">
        <div className={`${characterSize[size]} animate-float`}>
          <img
            src={characterImageUrl ?? '/KUI.png'}
            alt="Loading character"
            className="w-full h-full object-contain"
            decoding="async"
          />
        </div>
      </div>

      {/* 메시지 */}
      {displayMessage && (
        <div
          className={`${textSize[size]} font-medium text-gray-700 text-center px-4 animate-fade-in-up`}
        >
          {displayMessage}
        </div>
      )}

      {/* 프로그레스 바 (선택적) */}
      {showProgress && (
        <div className="mt-6 w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 animate-shimmer" />
        </div>
      )}

      {/* 로딩 도트 */}
      <div className="mt-4 flex gap-2">
        <LoadingDot delay="0ms" />
        <LoadingDot delay="150ms" />
        <LoadingDot delay="300ms" />
      </div>
    </div>
  )
}

/**
 * 로딩 도트 (애니메이션)
 */
function LoadingDot({ delay }: { delay: string }) {
  return (
    <div
      className="w-2 h-2 bg-primary-500 rounded-full animate-bounce-slow"
      style={{ animationDelay: delay }}
    />
  )
}

