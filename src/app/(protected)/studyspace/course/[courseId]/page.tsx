/**
 * @file page.tsx
 * @description 과목 내부 페이지 — 회차별/강의자료별 탭
 * @module app/(protected)/studyspace/course/[courseId]
 * @dependencies features/lecture-study
 */

'use client'

import { use } from 'react'
import { LectureSelectContainer } from '@/features/lecture-study'

export default function CoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = use(params)

  return <LectureSelectContainer courseId={courseId} />
}
