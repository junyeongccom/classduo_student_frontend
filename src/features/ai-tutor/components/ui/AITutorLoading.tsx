/**
 * AI 튜터 도메인 특화 로딩 컴포넌트
 * - AI 튜터 관련 메시지 우선 표시
 * - 강의 목록, 채팅, 게임 등 다양한 상황에 대응
 */
'use client'

import { LoadingScreen } from '@/shared/components/ui'
import type { LoadingMessageCategory } from '@/shared/constants/loadingMessages'

interface AITutorLoadingProps {
  /** 표시할 메시지 (지정하지 않으면 AI 튜터 관련 메시지 랜덤 선택) */
  message?: string
  /** 메시지 카테고리 (기본값: 'ai-tutor') */
  messageCategory?: LoadingMessageCategory
  /** 캐릭터 이미지 URL */
  characterImageUrl?: string
  /** 프로그레스 바 표시 여부 */
  showProgress?: boolean
  /** 로딩 화면 크기 */
  size?: 'fullscreen' | 'inline' | 'compact'
  /** 추가 CSS 클래스 */
  className?: string
}

export function AITutorLoading({
  message,
  messageCategory = 'aiTutor',
  characterImageUrl,
  showProgress = false,
  size = 'inline',
  className = '',
}: AITutorLoadingProps) {
  return (
    <LoadingScreen
      message={message}
      messageCategory={messageCategory}
      characterImageUrl={characterImageUrl}
      showProgress={showProgress}
      size={size}
      className={className}
    />
  )
}

