/**
 * @file page.tsx
 * @description 회차별 학습 페이지 — 좌우 패널 학습 화면
 * @module app/(protected)/studyspace/course/[courseId]/lecture/[lectureId]
 * @dependencies features/lecture-study
 */

'use client'

import { use } from 'react'
import { LectureStudyContainer } from '@/features/lecture-study'

export default function LectureStudyPage({
  params,
}: {
  params: Promise<{ courseId: string; lectureId: string }>
}) {
  const { lectureId } = use(params)

  return <LectureStudyContainer lectureId={lectureId} />
}
