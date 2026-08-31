/**
 * @file useMissions.ts
 * @description 주간 미션 조회 훅 — 조회 시 서버가 달성 보너스 lazy 지급, 새 지급분은 'xp-gained' 연출로 전달
 * @module shared/hooks
 * @dependencies gamificationService.fetchMyMissions
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchMyMissions, type MissionItemDto } from '@/shared/services/gamificationService'

const WEEKLY_TYPES = ['quiz', 'days', 'games'] as const

export function useMissions(courseId: string) {
  const [missions, setMissions] = useState<MissionItemDto[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await fetchMyMissions(courseId)
      if (!data) return
      setMissions(data.missions)
      // 이번 조회에서 새로 지급된 보너스 → XP 연출
      const granted = data.missions.reduce((sum, m) => sum + (m.just_granted_xp ?? 0), 0)
      if (granted > 0) {
        window.dispatchEvent(new CustomEvent('xp-gained', { detail: { xp: granted } }))
      }
    } finally {
      setLoading(false)
    }
  }, [courseId])

  // 진입 시 1회 조회(달성 보너스 자동 지급) + XP 획득 시 갱신
  useEffect(() => {
    void load()
    const handler = () => { void load() }
    window.addEventListener('exam-prep-rewards-refresh', handler)
    return () => window.removeEventListener('exam-prep-rewards-refresh', handler)
  }, [load])

  const weekly = missions.filter(m => (WEEKLY_TYPES as readonly string[]).includes(m.type))
  const allClear = missions.find(m => m.type === 'all_clear')
  const incorrect = missions.find(m => m.type === 'incorrect_review')
  const remaining = weekly.filter(m => !m.completed).length

  return { missions, weekly, allClear, incorrect, remaining, loading }
}
