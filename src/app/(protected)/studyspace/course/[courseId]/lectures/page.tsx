/**
 * @file page.tsx
 * @description 회차별 학습 페이지 — 회차 리스트 + 게임 CTA (구 /course/[id] 화면)
 * @module app/(protected)/studyspace/course/[courseId]/lectures
 * @dependencies features/lecture-study
 */

'use client'

import { use } from 'react'
import { LectureSelectContainer } from '@/features/lecture-study'

export default function LectureListPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = use(params)

  return <LectureSelectContainer courseId={courseId} />
}
