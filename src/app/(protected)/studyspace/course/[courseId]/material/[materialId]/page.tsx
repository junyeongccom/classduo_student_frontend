/**
 * @file page.tsx
 * @description 강의자료별 학습 페이지
 * @module app/(protected)/studyspace/course/[courseId]/material/[materialId]
 * @dependencies features/material-study
 */

'use client'

import { use } from 'react'
import { MaterialStudyContainer } from '@/features/material-study'

export default function MaterialStudyPage({
  params,
}: {
  params: Promise<{ courseId: string; materialId: string }>
}) {
  const { courseId, materialId } = use(params)
  return <MaterialStudyContainer courseId={courseId} materialId={materialId} />
}
