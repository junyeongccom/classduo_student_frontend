/**
 * @file CourseDashboardContainer.tsx
 * @description 과목 대시보드 — 기말대비 hero + 회차별/대화형 + 캘린더 + 학점/XP
 * @module features/course-dashboard/components/containers
 * @dependencies useCourseDashboard, useDashboardMock, hero/mid/quick 카드, 캘린더, 학점 카드
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronRight, Loader2, PencilLine, Bookmark } from 'lucide-react'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { trackPageEnter, trackPageLeave } from '@/shared/lib/analytics'
import { useCourseDashboard } from '../../hooks/useCourseDashboard'
import { useDashboardMock } from '../../hooks/useDashboardMock'
import { ExamPrepHeroCard } from '../ui/ExamPrepHeroCard'
import { StudyModeMidCard } from '../ui/StudyModeMidCard'
import { QuickActionLink } from '../ui/QuickActionLink'
import { AttendanceCalendarCard } from '../ui/AttendanceCalendarCard'
import { GradeProgressCard } from '../ui/GradeProgressCard'

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

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-5 lg:px-10">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[5fr_6fr]">
            {/* ───── 좌측 컬럼 ───── */}
            <div className="flex flex-col gap-3">
              <ExamPrepHeroCard
                title={t('courseDashboard.modeExam.title')}
                subtitle={t('courseDashboard.examSubtitle')}
                onClick={() =>
                  router.push(`/studyspace/course/${courseId}/exam-prep`)
                }
              />

              <StudyModeMidCard
                eyebrow={t('courseDashboard.modeWeekly.eyebrow')}
                title={t('courseDashboard.modeWeekly.title')}
                description={t('courseDashboard.weeklyShortDescription')}
                onClick={() =>
                  router.push(`/studyspace/course/${courseId}/lectures`)
                }
              />

              <StudyModeMidCard
                eyebrow={t('courseDashboard.modeDialogue.eyebrow')}
                title={t('courseDashboard.modeDialogue.title')}
                description={t('courseDashboard.dialogueShortDescription')}
                onClick={() =>
                  router.push(`/studyspace/course/${courseId}/dialogue`)
                }
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <QuickActionLink
                  icon={PencilLine}
                  label={t('courseNav.createQuestion')}
                  onClick={() =>
                    router.push(
                      `/studyspace/course/${courseId}/my-quizzes?tab=create`,
                    )
                  }
                />
                <QuickActionLink
                  icon={Bookmark}
                  label={t('courseDashboard.myQuizSaved')}
                  onClick={() =>
                    router.push(`/studyspace/course/${courseId}/my-quizzes`)
                  }
                />
              </div>
            </div>

            {/* ───── 우측 컬럼 ───── */}
            <div className="flex flex-col gap-3">
              <AttendanceCalendarCard
                monthGrid={monthGrid}
                examDday={examDday}
                currentStreak={streak.currentStreak}
              />
              <GradeProgressCard
                displayName={user.displayName}
                xp={user.xp}
                rankCode={rankCode}
                courseTitle={courseTitle ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
