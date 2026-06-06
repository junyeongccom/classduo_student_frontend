/**
 * @file CourseDashboardContainer.tsx
 * @description 과목 대시보드 — Figma(991:3348) content 좌표(2103×1477) 그대로 ScaledCanvas contain.
 *   사이드바/상단바는 고정, 본문만 한 화면에 contain-스케일(절대 스크롤 없음 + 시안 비율 유지).
 * @module features/course-dashboard/components/containers
 * @dependencies useCourseDashboard, useDashboardMock, ScaledCanvas, DashboardScaledContent
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronRight, Loader2 } from 'lucide-react'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { trackPageEnter, trackPageLeave } from '@/shared/lib/analytics'
import { useCourseDashboard } from '../../hooks/useCourseDashboard'
import { useDashboardMock } from '../../hooks/useDashboardMock'
import { isExamPrepLockedNow } from '../../domain/examPrepUnlock'
import { ScaledCanvas } from '../ui/ScaledCanvas'
import {
  DashboardScaledContent,
  DASH_DESIGN_W,
  DASH_DESIGN_H,
} from '../ui/DashboardScaledContent'

export function CourseDashboardContainer({ courseId }: { courseId: string }) {
  const t = useTranslations()
  const router = useRouter()
  const {
    isLoading,
    error,
    refresh,
    courseTitle,
    examDday,
  } = useCourseDashboard(courseId)
  const { user, streak, monthGrid, rankCode } = useDashboardMock(courseId)

  // 기말대비학습 카드 잠금 — 자정 경계 hydration 안전을 위해 client mount 시 1회 계산.
  const [isExamPrepLocked, setIsExamPrepLocked] = useState(false)
  useEffect(() => {
    setIsExamPrepLocked(isExamPrepLockedNow())
  }, [])

  useEffect(() => {
    trackPageEnter('course_dashboard', { courseId })
    return () => {
      trackPageLeave('course_dashboard', { courseId })
    }
  }, [courseId])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={refresh}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t('home.retry')}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Breadcrumb topbar — 기존 유지 */}
      <StudyspaceTopbarSlot>
        <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm font-medium text-gray-400 md:gap-2">
          <Link
            href="/studyspace/home"
            className="shrink-0 transition-colors hover:text-[#6366F1]"
          >
            {t('courseNav.home')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0 truncate font-semibold text-gray-900 dark:text-gray-100">
            {courseTitle ?? '...'}
          </span>
        </nav>
      </StudyspaceTopbarSlot>

      {/* 본문 — Figma content(2103×1477) 좌표 그대로 contain-스케일 (항상 한 화면 fit) */}
      <div className="h-full w-full overflow-hidden p-3 md:p-5">
        <ScaledCanvas designWidth={DASH_DESIGN_W} designHeight={DASH_DESIGN_H}>
          <DashboardScaledContent
            monthGrid={monthGrid}
            examDday={examDday}
            currentStreak={streak.currentStreak}
            displayName={user.displayName}
            xp={user.xp}
            rankCode={rankCode}
            courseTitle={courseTitle ?? undefined}
            isExamPrepLocked={isExamPrepLocked}
            examPrepLockedTooltip={t('courseDashboard.examPrepLockedTooltip')}
            onHero={() => router.push(`/studyspace/course/${courseId}/exam-prep`)}
            onWeekly={() => router.push(`/studyspace/course/${courseId}/lectures`)}
            onDialogue={() => router.push(`/studyspace/course/${courseId}/dialogue`)}
            onCreate={() =>
              router.push(`/studyspace/course/${courseId}/my-quizzes?tab=create`)
            }
            onMyQuiz={() => router.push(`/studyspace/course/${courseId}/my-quizzes`)}
          />
        </ScaledCanvas>
      </div>
    </>
  )
}
