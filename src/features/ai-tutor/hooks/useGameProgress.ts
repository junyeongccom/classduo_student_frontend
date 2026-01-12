'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  getLectureProgressStatusAll, 
  getCourseRewardCounts,
  type LectureProgressStatus 
} from '@/shared/services/progressService'
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

export function useGameProgress() {
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
      // 진척도 데이터와 보상 개수 데이터를 병렬로 조회
      const [progressResult, rewardCountResult] = await Promise.all([
        getLectureProgressStatusAll(),
        getCourseRewardCounts(),
      ])
      
      // 진척도 데이터 처리 (보상 개수와 독립적으로 처리)
      if (progressResult.error) {
        console.error('[useGameProgress] 진척도 조회 실패:', progressResult.error)
        setError(progressResult.error)
      } else if (progressResult.data) {
        // GameProgress 형식으로 변환
        const progress: GameProgress = {}
        const rewards: ClaimedRewards = {}
        
        progressResult.data.forEach((status) => {
          progress[status.lecture_id] = status.progress_count
          rewards[status.lecture_id] = status.is_claimed
        })
        
        setGameProgress(progress)
        setClaimedRewards(rewards)
        // 진척도가 성공하면 에러 초기화 (보상 개수 에러와 별개)
        if (!rewardCountResult.error) {
          setError(null)
        }
      }

      // 보상 개수 데이터 처리 (진척도 에러와 독립적으로 처리)
      if (rewardCountResult.error) {
        // 보상 개수 조회 실패는 경고만 표시 (진척도는 정상 동작)
        console.warn('[useGameProgress] 보상 개수 조회 실패:', {
          error: rewardCountResult.error,
          message: rewardCountResult.error.message,
          stack: rewardCountResult.error.stack,
        })
        // 진척도 에러가 없을 때만 보상 개수 에러를 설정
        if (!progressResult.error) {
          setError(rewardCountResult.error)
        }
      } else if (rewardCountResult.data) {
        console.log('[useGameProgress] 보상 개수 데이터 수신:', rewardCountResult.data)
        const flameCountMap: FlameCount = {}
        rewardCountResult.data.forEach((reward) => {
          flameCountMap[reward.course_id] = reward.total_amount
        })
        console.log('[useGameProgress] flameCountMap 업데이트:', flameCountMap)
        setFlameCount(flameCountMap)
        // 보상 개수가 성공하면 에러 초기화 (진척도 에러와 별개)
        if (!progressResult.error) {
          setError(null)
        }
      } else {
        console.warn('[useGameProgress] 보상 개수 데이터가 null입니다')
      }

      // 둘 다 성공했을 때만 에러 완전 초기화
      if (!progressResult.error && !rewardCountResult.error) {
        setError(null)
      }

      // 불꽃 개수 업데이트
      if (flameResult.data) {
        setFlameCount(flameResult.data)
      } else if (flameResult.error) {
        console.error('[useGameProgress] 불꽃 개수 조회 실패:', flameResult.error)
      }

      setError(null)
    } catch (err) {
      console.error('[useGameProgress] 데이터 조회 실패:', err)
      setError(err instanceof Error ? err : new Error('알 수 없는 오류가 발생했습니다'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 현재 사용자 ID를 ref로 저장 (의존성 변경 방지)
  const userIdRef = useRef<string | undefined>(user?.user_id)
  useEffect(() => {
    userIdRef.current = user?.user_id
  }, [user?.user_id])

  // 초기 로드 및 Realtime 구독 설정
  useEffect(() => {
    // 사용자가 없으면 구독하지 않음
    if (!user?.user_id) {
      return
    }

    // 초기 데이터 로드
    refreshData()

    // Realtime 구독: user_progress_events INSERT 이벤트
    const unsubscribeProgress = subscribeProgressEvents((event: ProgressEvent) => {
      // 현재 사용자 ID 가져오기 (ref 사용)
      const currentUserId = userIdRef.current
      
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
      // 현재 사용자 ID 가져오기 (ref 사용)
      const currentUserId = userIdRef.current
      
      // user_id 필터링: 자신과 관련된 이벤트만 처리
      if (!currentUserId || event.user_id !== currentUserId) {
        return // 다른 사용자의 이벤트는 무시
      }
      
      console.log('[useGameProgress] Realtime 보상 이벤트 수신:', {
        lecture_id: event.lecture_id,
        course_id: event.course_id,
        amount: event.amount,
      })
      
      // 해당 lecture_id의 is_claimed=true
      setClaimedRewards((prev) => ({
        ...prev,
        [event.lecture_id]: true,
      }))

      // course_id가 있으면 즉시 flameCount 업데이트
      if (event.course_id) {
        const courseId = event.course_id // 타입 가드를 위한 변수 추출
        setFlameCount((prev) => {
          const current = prev[courseId] || 0
          const amount = event.amount || 1
          console.log(`[useGameProgress] flameCount 업데이트: ${courseId} = ${current} + ${amount}`)
          return {
            ...prev,
            [courseId]: current + amount,
          }
        })
      } else {
        // course_id가 없으면 refreshData 호출하여 최신 데이터 조회
        // (트리거로 course_id가 채워졌을 수 있음)
        console.log('[useGameProgress] course_id가 없어 refreshData 호출')
        setTimeout(() => {
          refreshData()
        }, 500) // 트리거 실행 시간 고려
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
  }, [refreshData, user?.user_id]) // user 객체 대신 user_id만 의존성으로 사용

  return {
    gameProgress,
    claimedRewards,
    flameCount,
    isLoading,
    error,
    // 하위 호환성을 위한 함수들
    setClaimedRewards, // optimistic update를 위한 setter
    setFlameCount, // flameCount 업데이트를 위한 setter
  }
}
