/**
 * @file useQuizMissionLabel.ts
 * @description 퀴즈 미션 라벨 — 목표 회차를 "N주차 M차시"로 구체화 (매칭 실패 시 일반 문구 폴백)
 * @module shared/hooks
 * @dependencies features/lecture-study(useLectures), next-intl
 */
'use client'

import { useTranslations } from 'next-intl'
import { useLectures } from '@/features/lecture-study'
import type { MissionTargetLectureDto } from '@/shared/services/gamificationService'

export function useQuizMissionLabel(courseId: string, target: MissionTargetLectureDto | null): string {
  const t = useTranslations('missions')
  const { lectures } = useLectures(courseId)
  if (target) {
    const match = lectures.find(l => l.id === target.lecture_id)
    if (match?.week_number != null && match?.session_number != null) {
      return t('types.quizTarget', { week: match.week_number, session: match.session_number })
    }
  }
  return t('types.quiz')
}
