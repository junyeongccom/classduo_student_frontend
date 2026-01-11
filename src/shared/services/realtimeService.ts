/**
 * Realtime 구독 서비스
 * user_progress_events와 user_lecture_rewards 테이블의 INSERT 이벤트를 구독합니다.
 */
'use client'

import { getSupabaseClient, resetSupabaseClient } from '@/shared/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ProgressEvent {
  event_type: 'ox_quiz' | 'review_blank'
  user_id: string
  lecture_id: string
  ox_quiz_question_id?: string
  review_answer_id?: string
  submitted_answer?: boolean
}

export interface RewardEvent {
  user_id: string
  lecture_id: string
  course_id: string
  reward_type: string
  amount: number
}

export type ProgressEventHandler = (event: ProgressEvent) => void
export type RewardEventHandler = (event: RewardEvent) => void

/**
 * Realtime 구독 채널 관리
 */
class RealtimeSubscriptionManager {
  private progressChannel: RealtimeChannel | null = null
  private rewardChannel: RealtimeChannel | null = null
  private progressHandlers: Set<ProgressEventHandler> = new Set()
  private rewardHandlers: Set<RewardEventHandler> = new Set()

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
    // 토큰이 변경되었을 수 있으므로 클라이언트 재생성 -> 제거 (getSupabaseClient가 최신 토큰 사용)
    const supabase = getSupabaseClient()

    this.progressChannel = supabase
      .channel('user_progress_events')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_progress_events',
          filter: 'user_id=eq.auth.uid()',
        },
        (payload) => {
          const event = payload.new as ProgressEvent
          // 모든 핸들러에 이벤트 전달
          this.progressHandlers.forEach((h) => h(event))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtimeService] user_progress_events 구독 성공')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[realtimeService] user_progress_events 구독 실패')
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
    // 토큰이 변경되었을 수 있으므로 클라이언트 재생성 -> 제거
    const supabase = getSupabaseClient()

    this.rewardChannel = supabase
      .channel('user_lecture_rewards')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_lecture_rewards',
          filter: 'user_id=eq.auth.uid()',
        },
        (payload) => {
          const event = payload.new as RewardEvent
          // 모든 핸들러에 이벤트 전달
          this.rewardHandlers.forEach((h) => h(event))
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtimeService] user_lecture_rewards 구독 성공')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[realtimeService] user_lecture_rewards 구독 실패')
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
  realtimeManager.unsubscribeAll()
}
