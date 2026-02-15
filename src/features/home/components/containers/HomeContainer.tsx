/**
 * @file HomeContainer.tsx
 * @description 홈 화면 컨테이너 — 인사 헤더 + 학기별 그룹핑 과목 목록
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

  const today = useMemo(() => {
    return new Date().toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }, [dateLocale])

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
        <div className="mx-auto max-w-5xl px-6 py-8">
          <GreetingHeader name={user?.full_name} date={today} t={t} />
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
      <div className="mx-auto max-w-5xl px-6 py-8">
        <GreetingHeader name={user?.full_name} date={today} t={t} />

        <div className="flex flex-col gap-10">
          {groups.map((group, gi) => (
            <section key={group.term?.id ?? `etc-${gi}`}>
              <div className="mb-4 border-b border-gray-200 pb-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  {group.term?.name ?? t('home.etcGroup')}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.courses.map((course) => (
                  <CourseCard
                    key={course.id}
                    name={course.name}
                    professorName={course.professor_name}
                    updatedAt={course.updated_at}
                    visual={
                      visuals.get(course.id) ?? {
                        bg: 'bg-gray-100',
                        text: 'text-gray-700',
                        border: 'border-gray-200',
                        accent: '#6B7280',
                      }
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
  date,
  t,
}: {
  name?: string | null
  date: string
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-gray-900">
        {name ? t('home.greeting', { name }) : t('home.title')}
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        {t('home.greetingDate', { date })}
      </p>
    </div>
  )
}
