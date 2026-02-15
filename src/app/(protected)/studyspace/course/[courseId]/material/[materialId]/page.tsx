/**
 * @file page.tsx
 * @description 강의자료별 학습 페이지
 * @module app/(protected)/studyspace/course/[courseId]/material/[materialId]
 * @dependencies features/material-study
 */

'use client'

import { MaterialStudyContainer } from '@/features/material-study'

export default function MaterialStudyPage() {
  return <MaterialStudyContainer />
}
