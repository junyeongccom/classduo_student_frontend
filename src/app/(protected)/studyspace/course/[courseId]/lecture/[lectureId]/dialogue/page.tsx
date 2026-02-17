/**
 * @file page.tsx
 * @description 대화형 학습 페이지 — AI 튜터 채팅 + 회차 선택 사이드바
 * @module app/(protected)/studyspace/course/[courseId]/lecture/[lectureId]/dialogue
 * @dependencies features/lecture-study
 */

'use client'

import { use } from 'react'
import { DialogueLearningContainer } from '@/features/lecture-study/components/containers/DialogueLearningContainer'

export default function DialogueLearningPage({
  params,
}: {
  params: Promise<{ courseId: string; lectureId: string }>
}) {
  const { courseId, lectureId } = use(params)

  return <DialogueLearningContainer courseId={courseId} lectureId={lectureId} />
}
