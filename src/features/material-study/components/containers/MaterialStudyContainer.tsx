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
}

export function MaterialStudyContainer({ courseId }: MaterialStudyContainerProps) {
  // ExamPrepContainer는 내부에서 과목 선택을 URL 파라미터 기반으로 관리
  // courseId가 주어진 경우 URL의 courseId 파라미터로 전달하여 자동 선택
  // TODO: ExamPrepContainer에 courseId prop을 추가하여 과목 선택 드롭다운을 숨기는 기능 구현
  return <ExamPrepContainer />
}
