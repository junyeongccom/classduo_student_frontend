/**
 * @file page.tsx
 * @description 과목 대시보드 — 학습 모드 4종 + 이어서 학습하기
 * @module app/(protected)/studyspace/course/[courseId]
 * @dependencies features/course-dashboard
 */

'use client'

import { use } from 'react'
import { CourseDashboardContainer } from '@/features/course-dashboard'

export default function CourseDashboardPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = use(params)

  return <CourseDashboardContainer courseId={courseId} />
}
