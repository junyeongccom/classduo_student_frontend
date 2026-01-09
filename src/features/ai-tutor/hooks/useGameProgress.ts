'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getLectureProgressStatusAll, type LectureProgressStatus } from '../services/progressService'
import {
  subscribeProgressEvents,
  subscribeRewardEvents,
  type ProgressEvent,
  type RewardEvent,
} from '../services/realtimeService'

// 기존 타입 유지 (하위 호환성)
export interface GameProgress {
  [lectureId: string]: number // 0~10 진행도
}

export interface FlameCount {
  [courseId: string]: number
}

export interface ClaimedRewards {
  [lectureId: string]: boolean
}

export function useGameProgress() {
  const [gameProgress, setGameProgress] = useState<GameProgress>({})
  const [claimedRewards, setClaimedRewards] = useState<ClaimedRewards>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // 안전장치: 30초마다 재조회
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // 탭 포커스 복귀 시 재조회
  const isFocusedRef = useRef(true)

  /**
   * Supabase에서 진척도 데이터 조회 및 상태 업데이트
   */
  const refreshData = useCallback(async () => {
    try {
      const result = await getLectureProgressStatusAll()
      
      if (result.error) {
        setError(result.error)
        return
      }

      if (result.data) {
        // GameProgress 형식으로 변환
        const progress: GameProgress = {}
        const rewards: ClaimedRewards = {}
        
        result.data.forEach((status) => {
          progress[status.lecture_id] = status.progress_count
          rewards[status.lecture_id] = status.is_claimed
        })
        
        setGameProgress(progress)
        setClaimedRewards(rewards)
        setError(null)
      }
    } catch (err) {
      console.error('[useGameProgress] 데이터 조회 실패:', err)
      setError(err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 초기 로드 및 Realtime 구독 설정
  useEffect(() => {
    // 초기 데이터 로드
    refreshData()

    // Realtime 구독: user_progress_events INSERT 이벤트
    const unsubscribeProgress = subscribeProgressEvents((event: ProgressEvent) => {
      // 해당 lecture_id의 progress_count를 +1
      setGameProgress((prev) => {
        const current = prev[event.lecture_id] || 0
        return {
          ...prev,
          [event.lecture_id]: Math.min(10, current + 1), // 최대 10
        }
      })
    })

    // Realtime 구독: user_lecture_rewards INSERT 이벤트
    const unsubscribeReward = subscribeRewardEvents((event: RewardEvent) => {
      // 해당 lecture_id의 is_claimed=true, is_claimable=false
      setClaimedRewards((prev) => ({
        ...prev,
        [event.lecture_id]: true,
      }))
    })

    // 안전장치: 30초마다 재조회
    refreshIntervalRef.current = setInterval(() => {
      if (isFocusedRef.current) {
        refreshData()
      }
    }, 30000) // 30초

    // 탭 포커스 복귀 시 재조회
    const handleFocus = () => {
      isFocusedRef.current = true
      refreshData()
    }
    const handleBlur = () => {
      isFocusedRef.current = false
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      unsubscribeProgress()
      unsubscribeReward()
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [refreshData])

  // 수동 재조회 함수 (외부에서 호출 가능)
  const refreshStatus = useCallback(() => {
    setIsLoading(true)
    refreshData()
  }, [refreshData])

  return {
    gameProgress,
    claimedRewards,
    isLoading,
    error,
    refreshStatus,
    // 하위 호환성을 위한 함수들 (deprecated)
    flameCount: {} as FlameCount, // 불꽃 개수는 더 이상 사용하지 않음
    setClaimedRewards, // optimistic update를 위한 setter
    setFlameCount: () => {}, // 더 이상 사용하지 않음
  }
}
