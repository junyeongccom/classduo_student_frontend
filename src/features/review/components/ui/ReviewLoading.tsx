/**
 * 복습 도메인 특화 로딩 컴포넌트
 * - 복습 관련 메시지 우선 표시
 * - 카드뉴스, 강의 목록 등 복습 콘텐츠 로딩에 대응
 */
'use client'

import { LoadingScreen } from '@/shared/components/ui'
import type { LoadingMessageCategory } from '@/shared/constants/loadingMessages'

interface ReviewLoadingProps {
  /** 표시할 메시지 (지정하지 않으면 복습 관련 메시지 랜덤 선택) */
  message?: string
  /** 메시지 카테고리 (기본값: 'review') */
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

export function ReviewLoading({
  message,
  messageCategory = 'review',
  characterImageUrl,
  showProgress = false,
  size = 'inline',
  className = '',
}: ReviewLoadingProps) {
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

