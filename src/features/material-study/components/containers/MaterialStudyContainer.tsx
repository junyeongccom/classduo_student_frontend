/**
 * @file MaterialStudyContainer.tsx
 * @description 강의자료별 학습 컨테이너 — 기존 ExamPrepContainer 래핑
 * @module features/material-study
 * @dependencies features/exam_prep
 */

'use client'

import { ExamPrepContainer } from '@/features/exam_prep'

interface MaterialStudyContainerProps {
  courseId?: string
  materialId?: string
}

export function MaterialStudyContainer({ courseId, materialId }: MaterialStudyContainerProps) {
  return <ExamPrepContainer courseId={courseId} materialId={materialId} />
}
