/**
 * @file MaterialStudyContainer.tsx
 * @description 강의자료별 학습 컨테이너 — 기존 ExamPrepContainer 래핑
 * @module features/material-study
 * @dependencies features/exam_prep
 */

'use client'

import { ExamPrepContainer } from '@/features/exam_prep'

export function MaterialStudyContainer() {
  // TODO: Task 425에서 ExamPrepContainer에 courseId props 전달 및 과목 선택 드롭다운 제거 구현
  return <ExamPrepContainer />
}
