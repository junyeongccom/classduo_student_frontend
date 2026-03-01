'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getLectureProgressStatusAll, getCourseRewardCounts, claimReward as claimRewardAPI } from '@/shared/services/progressService'
import {
  subscribeProgressEvents,
  subscribeRewardEvents,
  type ProgressEvent,
  type RewardEvent,
} from '@/shared/services/realtimeService'
import { useAuthStore } from '@/features/auth/store/authStore'

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

export function useGameStatus() {
  const [gameProgress, setGameProgress] = useState<GameProgress>({})
  const [claimedRewards, setClaimedRewards] = useState<ClaimedRewards>({})
  const [flameCount, setFlameCount] = useState<FlameCount>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // 현재 사용자 정보 가져오기
  const user = useAuthStore(state => state.user)
  
  // throttle: 마지막 fetch 시점 추적 (5초 이내 중복 방지)
  const FETCH_THROTTLE_MS = 5000
  const lastFetchAtRef = useRef(0)

  /**
   * Supabase에서 진척도 데이터 조회 및 상태 업데이트
   */
  const refreshData = useCallback(async () => {
    lastFetchAtRef.current = Date.now()
    try {
      // 진척도 데이터와 보상 개수 데이터를 병렬로 조회
      const [progressResult, rewardCountResult] = await Promise.all([
        getLectureProgressStatusAll(),
        getCourseRewardCounts(),
      ])
      
      if (progressResult.error) {
        setError(progressResult.error)
        return
      }

      if (progressResult.data) {
        // GameProgress 형식으로 변환
        const progress: GameProgress = {}
        const rewards: ClaimedRewards = {}
        
        progressResult.data.forEach((status) => {
          progress[status.lecture_id] = status.progress_count
          rewards[status.lecture_id] = status.is_claimed
        })
        
        setGameProgress(progress)
        setClaimedRewards(rewards)
      }

      // 보상 개수 데이터 처리
      if (rewardCountResult.data) {
        const flameCountMap: FlameCount = {}
        rewardCountResult.data.forEach((reward) => {
          flameCountMap[reward.course_id] = reward.total_amount
        })
        setFlameCount(flameCountMap)
      } else if (rewardCountResult.error) {
        // 보상 개수 조회 실패는 경고만 표시 (진척도는 정상 동작)
        console.warn('[useGameStatus] 보상 개수 조회 실패:', rewardCountResult.error)
      }

      setError(null)
    } catch (err) {
      console.error('[useGameStatus] 데이터 조회 실패:', err)
      setError(err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 수동 재조회 함수 (외부에서 호출 가능)
  const refreshStatus = useCallback(() => {
    setIsLoading(true)
    refreshData()
  }, [refreshData])

  // 초기 로드 및 Realtime 구독 설정
  useEffect(() => {
    // 초기 데이터 로드
    refreshData()

    // Realtime 구독: user_progress_events INSERT 이벤트
    const unsubscribeProgress = subscribeProgressEvents((event: ProgressEvent) => {
      // 현재 사용자 ID 가져오기
      const currentUserId = user?.user_id
      
      // user_id 필터링: 자신과 관련된 이벤트만 처리
      if (!currentUserId || event.user_id !== currentUserId) {
        return // 다른 사용자의 이벤트는 무시
      }
      
      // 해당 lecture_id의 progress_count를 +1
      setGameProgress((prev) => {
        const current = prev[event.lecture_id] || 0
        return {
          ...prev,
          [event.lecture_id]: Math.min(10, current + 1), // 최대 10
        }
      })
    })

    // Realtime 구독: student_quiz_rewards INSERT 이벤트
    const unsubscribeReward = subscribeRewardEvents((event: RewardEvent) => {
      // RLS(student_id = auth.uid())가 서버에서 필터링하므로 클라이언트 필터 불필요

      console.log('[useGameStatus] Realtime 보상 이벤트 수신:', {
        lecture_id: event.lecture_id,
      })

      // 해당 lecture_id의 is_claimed=true
      setClaimedRewards((prev) => ({
        ...prev,
        [event.lecture_id]: true,
      }))

      // student_quiz_rewards에는 course_id가 없으므로 refreshData로 최신 보상 개수 조회
      setTimeout(() => {
        refreshData()
      }, 500)
    })

    // throttle된 재조회 (5초 이내 중복 방지)
    const throttledRefresh = () => {
      if (Date.now() - lastFetchAtRef.current > FETCH_THROTTLE_MS) {
        refreshData()
      }
    }

    // 탭 포커스 복귀 시 재조회
    const handleFocus = throttledRefresh
    // 네트워크 복구 시 재조회
    const handleOnline = throttledRefresh

    window.addEventListener('focus', handleFocus)
    window.addEventListener('online', handleOnline)

    return () => {
      unsubscribeProgress()
      unsubscribeReward()
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
    }
  }, [refreshData, refreshStatus, user])

  // 보상 클레임 함수 (하위 호환성을 위해 courseId 파라미터 유지하되 무시)
  const claimReward = useCallback(async (lectureId: string, courseId: string) => {
    // Optimistic update
    setClaimedRewards((prev) => ({
      ...prev,
      [lectureId]: true,
    }))

    // API 호출
    const result = await claimRewardAPI(lectureId)
    
    if (result.error) {
      // 실패 시 롤백
      setClaimedRewards((prev) => ({
        ...prev,
        [lectureId]: false,
      }))
      console.error('[useGameStatus] 보상 클레임 실패:', result.error)
    }
  }, [])

  return {
    gameProgress,
    flameCount,
    claimedRewards,
    claimReward,
    refreshStatus,
  }
}
