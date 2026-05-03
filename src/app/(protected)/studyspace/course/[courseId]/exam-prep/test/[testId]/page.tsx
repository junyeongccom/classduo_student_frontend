/**
 * @file page.tsx
 * @description 핵심 테스트 풀이 페이지 — 15문항 단일 선택형
 * @module app/(protected)/studyspace/course/[courseId]/exam-prep/test/[testId]
 * @dependencies features/exam-prep-final
 */

'use client'

import { use } from 'react'
import { CoreTestSolveContainer } from '@/features/exam-prep-final'

export default function CoreTestSolvePage({
  params,
}: {
  params: Promise<{ courseId: string; testId: string }>
}) {
  const { courseId, testId } = use(params)
  return <CoreTestSolveContainer courseId={courseId} testId={testId} />
}
