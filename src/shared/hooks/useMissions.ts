/**
 * @file useMissions.ts
 * @description 주간 미션 조회·수령 훅 — 완료 미션은 사용자가 클릭해 수령(claim), 수령 시 XP 연출 발화
 * @module shared/hooks
 * @dependencies gamificationService(fetchMyMissions, claimMission)
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  claimMission,
  fetchMyMissions,
  type MissionItemDto,
  type MissionTargetLectureDto,
} from '@/shared/services/gamificationService'

const WEEKLY_TYPES = ['quiz', 'days', 'games'] as const

export function useMissions(courseId: string) {
  const [missions, setMissions] = useState<MissionItemDto[]>([])
  const [quizTargetLecture, setQuizTargetLecture] = useState<MissionTargetLectureDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [claimingType, setClaimingType] = useState<MissionItemDto['type'] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await fetchMyMissions(courseId)
      if (!data) return
      setMissions(data.missions)
      setQuizTargetLecture(data.quiz_target_lecture)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  // 진입 시 1회 조회 + XP 획득(활동 완료) 시 진행도 갱신
  useEffect(() => {
    void load()
    const handler = () => { void load() }
    window.addEventListener('exam-prep-rewards-refresh', handler)
    return () => window.removeEventListener('exam-prep-rewards-refresh', handler)
  }, [load])

  /** 완료된 미션 클릭 → 보너스 수령. 성공 시 지급 XP 반환(연출은 호출부+xp-gained). */
  const claim = useCallback(async (type: MissionItemDto['type']): Promise<number> => {
    if (claimingType) return 0
    setClaimingType(type)
    try {
      const { data } = await claimMission(courseId, type)
      const xp = data?.xp_granted ?? 0
      if (xp > 0) {
        window.dispatchEvent(new CustomEvent('xp-gained', { detail: { xp } }))
      }
      await load()
      return xp
    } finally {
      setClaimingType(null)
    }
  }, [courseId, claimingType, load])

  const weekly = missions.filter(m => (WEEKLY_TYPES as readonly string[]).includes(m.type))
  const allClear = missions.find(m => m.type === 'all_clear')
  const incorrect = missions.find(m => m.type === 'incorrect_review')
  // 헤더 뱃지: 아직 처리할 것(미완료 또는 수령 대기) 개수
  const remaining = weekly.filter(m => !m.claimed).length

  return { missions, weekly, allClear, incorrect, remaining, loading, claim, claimingType, quizTargetLecture, reload: load }
}

/** 미션 행 상태: 수령 가능(흔들림) / 수령 완료 / 진행 중 */
export function missionRowState(m: MissionItemDto): 'claimable' | 'claimed' | 'pending' {
  if (m.claimed) return 'claimed'
  if (m.completed) return 'claimable'
  return 'pending'
}
