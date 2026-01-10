'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getLectureProgressStatusAll, getFlameCountByCourse, type LectureProgressStatus, claimReward as claimRewardAPI } from '@/shared/services/progressService'
import {
  subscribeProgressEvents,
  subscribeRewardEvents,
  type ProgressEvent,
  type RewardEvent,
} from '@/shared/services/realtimeService'
import { useAuthStore } from '@/features/auth/store/authStore'
import { incrementFlameCount } from '@/shared/lib/gameLogic'

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
  
  // 안전장치: 5초마다 재조회
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // 탭 포커스 복귀 시 재조회
  const isFocusedRef = useRef(true)

  /**
   * Supabase에서 진척도 데이터 조회 및 상태 업데이트
   */
  const refreshData = useCallback(async () => {
    try {
      // 진척도 데이터와 불꽃 개수를 병렬로 조회
      const [progressResult, flameResult] = await Promise.all([
        getLectureProgressStatusAll(),
        getFlameCountByCourse(),
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

      // 불꽃 개수 업데이트
      if (flameResult.data) {
        setFlameCount(flameResult.data)
      } else if (flameResult.error) {
        console.error('[useGameStatus] 불꽃 개수 조회 실패:', flameResult.error)
      }

      setError(null)
    } catch (err) {
      console.error('[useGameStatus] 데이터 조회 실패:', err)
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

    // Realtime 구독: user_lecture_rewards INSERT 이벤트
    const unsubscribeReward = subscribeRewardEvents((event: RewardEvent) => {
      // 현재 사용자 ID 가져오기
      const currentUserId = user?.user_id
      
      // user_id 필터링: 자신과 관련된 이벤트만 처리
      if (!currentUserId || event.user_id !== currentUserId) {
        return // 다른 사용자의 이벤트는 무시
      }
      
      // 해당 lecture_id의 is_claimed=true
      setClaimedRewards((prev) => ({
        ...prev,
        [event.lecture_id]: true,
      }))

      // 해당 course_id의 불꽃 개수 +1
      if (event.course_id) {
        setFlameCount((prev) => ({
          ...prev,
          [event.course_id]: (prev[event.course_id] || 0) + 1,
        }))
      }
    })

    // 안전장치: 5초마다 재조회
    refreshIntervalRef.current = setInterval(() => {
      if (isFocusedRef.current) {
        refreshData()
      }
    }, 5000) // 5초

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
  }, [refreshData, user])

  // 수동 재조회 함수 (외부에서 호출 가능)
  const refreshStatus = useCallback(() => {
    setIsLoading(true)
    refreshData()
  }, [refreshData])

  // 보상 클레임 함수
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
      return
    }

    // API 성공 시 불꽃 개수 +1
    if (result.data && courseId) {
      incrementFlameCount(courseId)
      // 상태도 즉시 업데이트
      setFlameCount((prev) => ({
        ...prev,
        [courseId]: (prev[courseId] || 0) + 1,
      }))
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
