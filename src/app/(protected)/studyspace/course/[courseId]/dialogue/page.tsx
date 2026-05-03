/**
 * @file page.tsx
 * @description 과목 단위 대화형 학습 — 첫 활성 회차의 dialogue 로 자동 진입
 * @module app/(protected)/studyspace/course/[courseId]/dialogue
 * @dependencies useLectures
 */

'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'

export default function CourseDialoguePage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = use(params)
  const router = useRouter()
  const { lectures, isLoading } = useLectures(courseId)

  useEffect(() => {
    if (isLoading || lectures.length === 0) return
    // 첫 번째 활성 회차 우선, 없으면 첫 회차로 fallback
    const target = lectures.find((l) => l.has_content) ?? lectures[0]
    router.replace(
      `/studyspace/course/${courseId}/lecture/${target.id}/dialogue`,
    )
  }, [isLoading, lectures, courseId, router])

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}
