/**
 * @file HomeContainer.tsx
 * @description 홈 화면 컨테이너 — 인사 헤더 + 학기별 그룹핑 과목 카드 그리드
 * @module features/home
 * @dependencies useCourses, groupCoursesByTerm, assignCourseVisuals, CourseCard, EmptyState, useAuthStore
 */

'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { useCourses } from '../../hooks/useCourses'
import { groupCoursesByTerm } from '../../domain/groupCoursesByTerm'
import { formatTermLabel } from '../../domain/formatTermLabel'
import { assignCourseVisuals } from '../../domain/assignCourseVisual'
import { CourseCard } from '../ui/CourseCard'
import { EmptyState } from '../ui/EmptyState'
import { useAuthStore } from '@/features/auth/store/authStore'

export function HomeContainer() {
  const t = useTranslations()
  const router = useRouter()
  const locale = useLocale()
  const dateLocale = locale === 'en' ? 'en-US' : 'ko-KR'
  const { courses, isLoading, error, refresh } = useCourses()
  const user = useAuthStore((s) => s.user)

  const groups = useMemo(() => groupCoursesByTerm(courses), [courses])
  const visuals = useMemo(
    () => assignCourseVisuals(courses.map((c) => c.id)),
    [courses],
  )

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
        <p className="text-sm text-gray-500">{t('home.loadError')}</p>
        <button
          onClick={refresh}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t('home.retry')}
        </button>
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <GreetingHeader name={user?.full_name} t={t} locale={locale} />
          <EmptyState
            message={t('home.empty')}
            subtext={t('home.emptySubtext')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <GreetingHeader name={user?.full_name} t={t} locale={locale} />

        <div className="flex flex-col gap-12">
          {groups.map((group, gi) => (
            <section key={group.term?.key ?? `etc-${gi}`}>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {group.term
                    ? formatTermLabel(group.term, locale)
                    : t('home.etcGroup')}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {group.courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    name={course.name}
                    professorName={course.professor_name}
                    section={course.section}
                    updatedAt={course.updated_at}
                    totalLectures={course.totalLectures}
                    visual={
                      visuals.get(course.id) ?? {
                        bg: 'bg-gray-100',
                        text: 'text-gray-700',
                        border: 'border-gray-200',
                        accent: '#6B7280',
                      }
                    }
                    progress={course.totalLectures > 0
                      ? { completed: course.activeLectures, total: course.totalLectures }
                      : null
                    }
                    locale={dateLocale}
                    onClick={() =>
                      router.push(`/studyspace/course/${course.id}`)
                    }
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function GreetingHeader({
  name,
  t,
  locale,
}: {
  name?: string | null
  t: ReturnType<typeof useTranslations>
  locale: string
}) {
  return (
    <div className="mb-10">
      <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-gray-50">
        {name
          ? (locale === 'ko'
              ? `안녕하세요, ${name}님! 👋`
              : `Hello, ${name}! 👋`)
          : t('home.title')}
      </h1>
      <p className="mt-2 text-lg text-gray-500 dark:text-gray-400">
        {t('home.greetingSubtitle')}
      </p>
    </div>
  )
}
