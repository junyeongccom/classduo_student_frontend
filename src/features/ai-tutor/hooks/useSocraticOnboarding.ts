/**
 * @file useSocraticOnboarding.ts
 * @description 소크라 문답 첫 진입 온보딩 모달 표시 여부 판단 hook (주제 선택 직후 1회 / localStorage 영구 해제)
 * @module features/ai-tutor/hooks
 * @dependencies useSocraticStore(activeTopic), useDialogueFeedbackStore(중복 표시 방지), localStorage
 *
 * 표시 규칙:
 *   - activeTopic 이 새로 잡히는 순간(= 우측 점수 패널이 처음 나타나는 순간) 대기 상태로 전환
 *   - localStorage 에 "다시 보지 않기" 기록이 있으면 아예 대기하지 않음
 *   - 만족도 평가 모달(DialogueFeedbackModal)이 떠 있으면 그것이 닫힐 때까지 양보 —
 *     평가 모달은 "직전 세션"에 대한 것이고 이미 화면에 있으므로 우선순위가 높다
 *   - 체크 없이 닫으면 저장하지 않으므로 다음 세션에서 다시 표시된다
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSocraticStore } from '@/features/ai-tutor/store/useSocraticStore'
import { useDialogueFeedbackStore } from '@/features/ai-tutor/store/useDialogueFeedbackStore'

const STORAGE_KEY = 'classduo_socratic_onboarding_dismissed'

/** "다시 보지 않기" 가 눌린 적 있는지 (localStorage 접근 실패는 미표시가 아닌 표시로 폴백). */
export const isSocraticOnboardingDismissed = (): boolean => {
  try {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** 이후 모든 세션에서 온보딩 모달 미표시. */
export const dismissSocraticOnboarding = (): void => {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* noop */
  }
}

export interface SocraticOnboardingState {
  /** 모달 표시 여부. */
  isOpen: boolean
  /** 모달 닫기. dontShowAgain=true 면 localStorage 에 영구 기록. */
  close: (dontShowAgain: boolean) => void
}

export function useSocraticOnboarding(): SocraticOnboardingState {
  const activeTopicId = useSocraticStore((s) => s.activeTopic?.id ?? null)
  const feedbackSessionId = useDialogueFeedbackStore((s) => s.pendingFeedbackSessionId)
  const [pending, setPending] = useState(false)
  const prevTopicIdRef = useRef<string | null>(null)

  useEffect(() => {
    const prev = prevTopicIdRef.current
    prevTopicIdRef.current = activeTopicId

    // 주제 해제(문답 종료 / 새 채팅) — 대기 중이던 표시도 취소한다
    if (!activeTopicId) {
      setPending(false)
      return
    }
    // 같은 주제로의 리렌더는 무시. 다른 주제로 바로 갈아타는 경우는 새 세션으로 본다.
    if (activeTopicId === prev) return
    if (isSocraticOnboardingDismissed()) return
    setPending(true)
  }, [activeTopicId])

  const close = useCallback((dontShowAgain: boolean) => {
    if (dontShowAgain) dismissSocraticOnboarding()
    setPending(false)
  }, [])

  // 평가 모달과 겹치지 않도록 양보 — 평가 모달이 닫히면 그때 표시된다
  return { isOpen: pending && !feedbackSessionId, close }
}
