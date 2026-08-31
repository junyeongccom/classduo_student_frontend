/**
 * @file useQuizMissionLabel.ts
 * @description 미션 목표 회차의 주차/차시 계산 + 라벨 헬퍼 (퀴즈·게임 미션 공용)
 * @module shared/hooks
 * @dependencies features/lecture-study(useLectures), next-intl
 */
'use client'

import { useTranslations } from 'next-intl'
import { useLectures } from '@/features/lecture-study'
import type { MissionTargetLectureDto } from '@/shared/services/gamificationService'

export interface MissionTargetWS {
  week: number
  session: number
  lectureId: string
}

/** 목표 회차의 주차/차시 (회차 날짜 기반 기존 계산 재사용). 매칭 실패 시 null. */
export function useMissionTargetWS(courseId: string, target: MissionTargetLectureDto | null): MissionTargetWS | null {
  const { lectures } = useLectures(courseId)
  if (!target) return null
  const match = lectures.find(l => l.id === target.lecture_id)
  if (match?.week_number != null && match?.session_number != null) {
    return { week: match.week_number, session: match.session_number, lectureId: target.lecture_id }
  }
  return null
}

/** 퀴즈/게임 미션 라벨 — "N주차 M차시 …" 구체화, 실패 시 일반 문구 폴백 */
export function useMissionLabels(courseId: string, target: MissionTargetLectureDto | null) {
  const t = useTranslations('missions')
  const ws = useMissionTargetWS(courseId, target)
  return {
    ws,
    quizLabel: ws ? t('types.quizTarget', { week: ws.week, session: ws.session }) : t('types.quiz'),
    gamesLabel: ws ? t('types.gamesTarget', { week: ws.week, session: ws.session }) : t('types.games'),
  }
}
