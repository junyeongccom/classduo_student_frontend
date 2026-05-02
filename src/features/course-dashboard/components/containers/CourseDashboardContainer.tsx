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
    uploadedWeek,
  } = useCourseDashboard(courseId)
  const { user, streak, monthGrid } = useDashboardMock(courseId)

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

  const weeklyFooter =
    uploadedWeek != null
      ? t('courseDashboard.modeWeekly.footer', { week: uploadedWeek })
      : ''

  return (
    <>
      {/* Breadcrumb topbar — 기존 유지 */}
      <StudyspaceTopbarSlot>
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Link
            href="/studyspace/home"
            className="transition-colors hover:text-[#6366F1]"
          >
            {t('courseNav.home')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {courseTitle ?? '...'}
          </span>
        </nav>
      </StudyspaceTopbarSlot>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
            {/* ───── 좌측 컬럼 ───── */}
            <div className="flex flex-col gap-5">
              <ExamPrepHeroCard
                title={t('courseDashboard.modeExam.title')}
                subtitle="10문제 · 30세트 · 일일 참여 시 보상 UP"
                onClick={() =>
                  router.push(`/studyspace/course/${courseId}/exam-prep`)
                }
              />

              <StudyModeMidCard
                eyebrow={t('courseDashboard.modeWeekly.eyebrow')}
                title={t('courseDashboard.modeWeekly.title')}
                description="매주 진도를 복습할 수 있어요."
                footer={weeklyFooter}
                onClick={() =>
                  router.push(`/studyspace/course/${courseId}/lectures`)
                }
              />

              <StudyModeMidCard
                eyebrow={t('courseDashboard.modeDialogue.eyebrow')}
                title={t('courseDashboard.modeDialogue.title')}
                description="AI에게 모르는 것을 질문하세요."
                onClick={() =>
                  router.push(`/studyspace/course/${courseId}/dialogue`)
                }
              />

              <div className="grid grid-cols-2 gap-4">
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
                  label="내 퀴즈 저장소"
                  onClick={() =>
                    router.push(`/studyspace/course/${courseId}/my-quizzes`)
                  }
                />
              </div>
            </div>

            {/* ───── 우측 컬럼 ───── */}
            <div className="flex flex-col gap-5">
              <AttendanceCalendarCard
                monthGrid={monthGrid}
                examDday={examDday}
                currentStreak={streak.currentStreak}
              />
              <GradeProgressCard
                displayName={user.displayName}
                xp={user.xp}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
