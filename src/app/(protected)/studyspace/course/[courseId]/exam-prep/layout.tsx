/**
 * @file layout.tsx
 * @description 기말 대비 학습 라우트 가드 — 잠금 해제 시점 이전 URL 직접 접근 차단
 * @module app/(protected)/studyspace/course/[courseId]/exam-prep
 * @dependencies features/course-dashboard (isExamPrepLockedNow)
 */

'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { isExamPrepLockedNow } from '@/features/course-dashboard'

export default function ExamPrepLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const params = useParams<{ courseId: string }>()
  // null=판정 전(hydration), true=잠금→redirect 중, false=오픈
  const [locked, setLocked] = useState<boolean | null>(null)

  useEffect(() => {
    if (isExamPrepLockedNow()) {
      setLocked(true)
      if (params?.courseId) {
        router.replace(`/studyspace/course/${params.courseId}`)
      }
    } else {
      setLocked(false)
    }
  }, [params?.courseId, router])

  if (locked !== false) return null
  return <>{children}</>
}
