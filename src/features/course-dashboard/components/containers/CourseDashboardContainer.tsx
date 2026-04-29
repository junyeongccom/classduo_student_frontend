/**
 * @file CourseDashboardContainer.tsx
 * @description 과목 대시보드 메인 컨테이너 — Header + Continue + 4개 학습모드 카드
 * @module features/course-dashboard/components/containers
 * @dependencies useCourseDashboard, StudyspaceTopbarSlot, StudyModeCard, CourseHeader, ContinueLearningCard
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronRight, Loader2, Leaf, GraduationCap, MessageCircle, FolderOpen } from 'lucide-react'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { trackPageEnter, trackPageLeave } from '@/shared/lib/analytics'
import { useCourseDashboard } from '../../hooks/useCourseDashboard'
import { CourseHeader } from '../ui/CourseHeader'
import { ContinueLearningCard } from '../ui/ContinueLearningCard'
import { StudyModeCard, DdayBadge } from '../ui/StudyModeCard'

export function CourseDashboardContainer({ courseId }: { courseId: string }) {
  const t = useTranslations()
  const router = useRouter()
  const {
    isLoading,
    error,
    refresh,
    courseTitle,
    professorName,
    termLabel,
    currentWeek,
    examDday,
    continueLecture,
    uploadedWeek,
  } = useCourseDashboard(courseId)

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

  // D-14 임시값 (백엔드 컬럼 추가 전): 사이드바와 동일
  const examBadgeDays = examDday ?? 14

  // "회차별 학습" footer
  const weeklyFooter =
    uploadedWeek != null
      ? t('courseDashboard.modeWeekly.footer', { week: uploadedWeek })
      : ''

  return (
    <>
      {/* Breadcrumb topbar */}
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
        <div className="mx-auto max-w-6xl px-8 py-8">
          <CourseHeader
            professorName={professorName}
            termLabel={termLabel}
            courseTitle={courseTitle}
            currentWeek={currentWeek}
            examDday={examBadgeDays}
          />

          {continueLecture && (
            <ContinueLearningCard
              modeLabel={t('courseNav.lectureStudy')}
              lectureTitle={
                continueLecture.title ??
                continueLecture.essence_7words ??
                `${continueLecture.lecture_number ?? '?'}`
              }
              lectureDate={continueLecture.date}
              onContinue={() => {
                router.push(
                  `/studyspace/course/${courseId}/lecture/${continueLecture.id}`,
                )
              }}
            />
          )}

          {/* 학습 모드 헤더 */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
              {t('courseDashboard.studyModes')}
            </h2>
          </div>

          {/* 4 카드 그리드 (2x2) */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <StudyModeCard
              icon={Leaf}
              eyebrow={t('courseDashboard.modeWeekly.eyebrow')}
              title={t('courseDashboard.modeWeekly.title')}
              description={t('courseDashboard.modeWeekly.description')}
              footer={weeklyFooter}
              ctaLabel={t('courseDashboard.modeWeekly.cta')}
              variant="highlight"
              iconColor="#8B5CF6"
              onClick={() =>
                router.push(`/studyspace/course/${courseId}/lectures`)
              }
            />
            <StudyModeCard
              icon={GraduationCap}
              eyebrow={t('courseDashboard.modeExam.eyebrow')}
              title={t('courseDashboard.modeExam.title')}
              description={t('courseDashboard.modeExam.description')}
              footer={t('courseDashboard.modeExam.footer')}
              badge={<DdayBadge days={examBadgeDays} />}
              ctaLabel={t('courseDashboard.modeExam.cta')}
              iconColor="#F97316"
              onClick={() =>
                router.push(`/studyspace/course/${courseId}/exam-prep`)
              }
            />
            <StudyModeCard
              icon={MessageCircle}
              eyebrow={t('courseDashboard.modeDialogue.eyebrow')}
              title={t('courseDashboard.modeDialogue.title')}
              description={t('courseDashboard.modeDialogue.description')}
              ctaLabel={t('courseDashboard.modeDialogue.cta')}
              iconColor="#7C3AED"
              onClick={() =>
                router.push(`/studyspace/course/${courseId}/dialogue`)
              }
            />
            <StudyModeCard
              icon={FolderOpen}
              eyebrow={t('courseDashboard.modeResources.eyebrow')}
              title={t('courseDashboard.modeResources.title')}
              description={t('courseDashboard.modeResources.description')}
              ctaLabel={t('courseDashboard.modeResources.cta')}
              iconColor="#6B7280"
              onClick={() => router.push(`/studyspace/my-quizzes`)}
            />
          </div>
        </div>
      </div>
    </>
  )
}
