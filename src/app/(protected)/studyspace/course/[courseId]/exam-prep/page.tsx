/**
 * @file page.tsx
 * @description 기말 대비 학습 페이지 — 26개 핵심 테스트 + 3개 중간 + 1개 최종
 * @module app/(protected)/studyspace/course/[courseId]/exam-prep
 * @dependencies features/exam-prep-final
 */

'use client'

import { use } from 'react'
import { ExamPrepContainer } from '@/features/exam-prep-final'

export default function ExamPrepPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = use(params)

  return <ExamPrepContainer courseId={courseId} />
}
