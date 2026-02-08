/**
 * Realtime 구독 서비스
 * user_progress_events와 user_lecture_rewards 테이블의 INSERT 이벤트를 구독합니다.
 */
'use client'

import { getSupabaseClient, onTokenRefresh, ensureValidToken } from '@/shared/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ProgressEvent {
  event_type: 'ox_quiz' | 'review_blank' | 'card_match'
  user_id: string
  lecture_id: string
  ox_quiz_question_id?: string
  review_answer_id?: string
  submitted_answer?: boolean
}

export interface RewardEvent {
  user_id: string
  lecture_id: string
  course_id: string | null
  reward_type: string
  amount: number
}

export type ProgressEventHandler = (event: ProgressEvent) => void
export type RewardEventHandler = (event: RewardEvent) => void

/**
 * Realtime 구독 채널 관리
 */
class RealtimeSubscriptionManager {
  private static MAX_RETRIES = 5

  private progressChannel: RealtimeChannel | null = null
  private rewardChannel: RealtimeChannel | null = null
  private progressHandlers: Set<ProgressEventHandler> = new Set()
  private rewardHandlers: Set<RewardEventHandler> = new Set()
  private tokenRefreshUnsubscribe: (() => void) | null = null
  private progressRetryCount = 0
  private rewardRetryCount = 0
  private progressRetryTimer: ReturnType<typeof setTimeout> | null = null
  private rewardRetryTimer: ReturnType<typeof setTimeout> | null = null
  private isReconnecting = false

  constructor() {
    // 토큰 갱신 이벤트 리스너 등록
    this.tokenRefreshUnsubscribe = onTokenRefresh(() => {
      this.reconnectChannels()
    })
  }

  /**
   * 토큰 갱신 시 모든 채널 재구독
   */
  private async reconnectChannels(): Promise<void> {
    if (this.isReconnecting) return
    this.isReconnecting = true

    try {
      console.log('[realtimeService] 토큰 갱신 감지, 채널 재구독 시작...')

      // 기존 채널 해제
      if (this.progressChannel) {
        const supabase = getSupabaseClient()
        supabase.removeChannel(this.progressChannel)
        this.progressChannel = null
      }

      if (this.rewardChannel) {
        const supabase = getSupabaseClient()
        supabase.removeChannel(this.rewardChannel)
        this.rewardChannel = null
      }

      // 재시도 카운터 리셋 (토큰 갱신으로 인한 재구독은 새 시작)
      this.progressRetryCount = 0
      this.rewardRetryCount = 0

      // 핸들러가 있으면 재구독
      if (this.progressHandlers.size > 0) {
        try {
          await this.initializeProgressSubscription()
          console.log('[realtimeService] user_progress_events 재구독 완료')
        } catch (error) {
          console.error('[realtimeService] user_progress_events 재구독 실패:', error)
        }
      }

      if (this.rewardHandlers.size > 0) {
        try {
          await this.initializeRewardSubscription()
          console.log('[realtimeService] user_lecture_rewards 재구독 완료')
        } catch (error) {
          console.error('[realtimeService] user_lecture_rewards 재구독 실패:', error)
        }
      }
    } finally {
      this.isReconnecting = false
    }
  }

  /**
   * 정리 작업
   */
  cleanup(): void {
    if (this.progressRetryTimer) {
      clearTimeout(this.progressRetryTimer)
      this.progressRetryTimer = null
    }
    if (this.rewardRetryTimer) {
      clearTimeout(this.rewardRetryTimer)
      this.rewardRetryTimer = null
    }
    if (this.tokenRefreshUnsubscribe) {
      this.tokenRefreshUnsubscribe()
      this.tokenRefreshUnsubscribe = null
    }
    this.unsubscribeAll()
  }

  /**
   * user_progress_events INSERT 이벤트 구독 시작
   */
  subscribeProgressEvents(handler: ProgressEventHandler): () => void {
    this.progressHandlers.add(handler)

    // 이미 구독 중이면 새 핸들러만 추가
    if (this.progressChannel) {
      return () => {
        this.progressHandlers.delete(handler)
        if (this.progressHandlers.size === 0) {
          this.unsubscribeProgressEvents()
        }
      }
    }

    // 새 구독 시작 (비동기로 처리하되 반환은 동기적으로)
    this.initializeProgressSubscription().catch((error) => {
      console.error('[realtimeService] user_progress_events 구독 초기화 실패:', error)
    })

    return () => {
      this.progressHandlers.delete(handler)
      if (this.progressHandlers.size === 0) {
        this.unsubscribeProgressEvents()
      }
    }
  }

  /**
   * user_progress_events 구독 초기화 (내부 비동기 메서드)
   */
  private async initializeProgressSubscription(): Promise<void> {
    const supabase = getSupabaseClient()
    this.progressChannel = supabase
      .channel('user_progress_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_progress_events',
        },
        (payload) => {
          const event = payload.new as ProgressEvent
          this.progressHandlers.forEach((h) => h(event))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtimeService] user_progress_events 구독 성공')
          this.progressRetryCount = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[realtimeService] user_progress_events 구독 실패')
          if (this.progressRetryCount < RealtimeSubscriptionManager.MAX_RETRIES) {
            this.progressRetryCount++
            const delay = Math.min(1000 * 2 ** this.progressRetryCount, 30000)
            console.log(`[realtimeService] user_progress_events 재시도 ${this.progressRetryCount}/${RealtimeSubscriptionManager.MAX_RETRIES} (${delay}ms 후)`)
            if (this.progressChannel) {
              getSupabaseClient().removeChannel(this.progressChannel)
              this.progressChannel = null
            }
            this.progressRetryTimer = setTimeout(async () => {
              await ensureValidToken()
              this.initializeProgressSubscription()
            }, delay)
          } else {
            console.warn('[realtimeService] user_progress_events 최대 재시도 초과')
          }
        }
      })
  }

  /**
   * user_lecture_rewards INSERT 이벤트 구독 시작
   */
  subscribeRewardEvents(handler: RewardEventHandler): () => void {
    this.rewardHandlers.add(handler)

    // 이미 구독 중이면 새 핸들러만 추가
    if (this.rewardChannel) {
      return () => {
        this.rewardHandlers.delete(handler)
        if (this.rewardHandlers.size === 0) {
          this.unsubscribeRewardEvents()
        }
      }
    }

    // 새 구독 시작 (비동기로 처리하되 반환은 동기적으로)
    this.initializeRewardSubscription().catch((error) => {
      console.error('[realtimeService] user_lecture_rewards 구독 초기화 실패:', error)
    })

    return () => {
      this.rewardHandlers.delete(handler)
      if (this.rewardHandlers.size === 0) {
        this.unsubscribeRewardEvents()
      }
    }
  }

  /**
   * user_lecture_rewards 구독 초기화 (내부 비동기 메서드)
   */
  private async initializeRewardSubscription(): Promise<void> {
    const supabase = getSupabaseClient()
    this.rewardChannel = supabase
      .channel('user_lecture_rewards')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_lecture_rewards',
        },
        (payload) => {
          const event = payload.new as RewardEvent
          this.rewardHandlers.forEach((h) => h(event))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtimeService] user_lecture_rewards 구독 성공')
          this.rewardRetryCount = 0
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[realtimeService] user_lecture_rewards 구독 실패')
          if (this.rewardRetryCount < RealtimeSubscriptionManager.MAX_RETRIES) {
            this.rewardRetryCount++
            const delay = Math.min(1000 * 2 ** this.rewardRetryCount, 30000)
            console.log(`[realtimeService] user_lecture_rewards 재시도 ${this.rewardRetryCount}/${RealtimeSubscriptionManager.MAX_RETRIES} (${delay}ms 후)`)
            if (this.rewardChannel) {
              getSupabaseClient().removeChannel(this.rewardChannel)
              this.rewardChannel = null
            }
            this.rewardRetryTimer = setTimeout(async () => {
              await ensureValidToken()
              this.initializeRewardSubscription()
            }, delay)
          } else {
            console.warn('[realtimeService] user_lecture_rewards 최대 재시도 초과')
          }
        }
      })
  }

  /**
   * user_progress_events 구독 해제
   */
  private unsubscribeProgressEvents(): void {
    if (this.progressChannel) {
      const supabase = getSupabaseClient()
      supabase.removeChannel(this.progressChannel)
      this.progressChannel = null
      console.log('[realtimeService] user_progress_events 구독 해제')
    }
  }

  /**
   * user_lecture_rewards 구독 해제
   */
  private unsubscribeRewardEvents(): void {
    if (this.rewardChannel) {
      const supabase = getSupabaseClient()
      supabase.removeChannel(this.rewardChannel)
      this.rewardChannel = null
      console.log('[realtimeService] user_lecture_rewards 구독 해제')
    }
  }

  /**
   * 모든 구독 해제
   */
  unsubscribeAll(): void {
    this.unsubscribeProgressEvents()
    this.unsubscribeRewardEvents()
    this.progressHandlers.clear()
    this.rewardHandlers.clear()
  }
}

// 싱글톤 인스턴스
const realtimeManager = new RealtimeSubscriptionManager()

/**
 * user_progress_events INSERT 이벤트 구독
 * @returns 구독 해제 함수
 */
export function subscribeProgressEvents(handler: ProgressEventHandler): () => void {
  return realtimeManager.subscribeProgressEvents(handler)
}

/**
 * user_lecture_rewards INSERT 이벤트 구독
 * @returns 구독 해제 함수
 */
export function subscribeRewardEvents(handler: RewardEventHandler): () => void {
  return realtimeManager.subscribeRewardEvents(handler)
}

/**
 * 모든 Realtime 구독 해제
 */
export function unsubscribeAllRealtime(): void {
  realtimeManager.cleanup()
}
