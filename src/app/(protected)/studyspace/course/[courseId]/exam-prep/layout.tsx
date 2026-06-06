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
import { useAuthStore } from '@/features/auth/store/authStore'

export default function ExamPrepLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const params = useParams<{ courseId: string }>()
  // allowlist 판정용 — 인증 정보 로딩이 끝난 뒤에만 잠금 여부를 확정한다.
  const fullName = useAuthStore((s) => s.user?.full_name)
  const isAuthLoading = useAuthStore((s) => s.isLoading)
  // null=판정 전(hydration/auth 로딩), true=잠금→redirect 중, false=오픈
  const [locked, setLocked] = useState<boolean | null>(null)

  useEffect(() => {
    if (isAuthLoading) return // 인증 정보 로딩 중에는 판정 보류 (allowlist 사용자 조기 redirect 방지)
    if (isExamPrepLockedNow(fullName)) {
      setLocked(true)
      if (params?.courseId) {
        router.replace(`/studyspace/course/${params.courseId}`)
      }
    } else {
      setLocked(false)
    }
  }, [params?.courseId, router, fullName, isAuthLoading])

  if (locked !== false) return null
  return <>{children}</>
}
