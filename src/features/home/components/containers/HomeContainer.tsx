/**
 * @file HomeContainer.tsx
 * @description 홈 화면 컨테이너 — 학기별 그룹핑된 과목 목록
 * @module features/home
 * @dependencies useCourses, groupCoursesByTerm, assignCourseVisuals, CourseCard, EmptyState
 */

'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { useCourses } from '../../hooks/useCourses'
import { groupCoursesByTerm } from '../../domain/groupCoursesByTerm'
import { assignCourseVisuals } from '../../domain/assignCourseVisual'
import { CourseCard } from '../ui/CourseCard'
import { EmptyState } from '../ui/EmptyState'

export function HomeContainer() {
  const t = useTranslations()
  const router = useRouter()
  const { courses, isLoading, error, refresh } = useCourses()

  const groups = useMemo(() => groupCoursesByTerm(courses), [courses])
  const visuals = useMemo(
    () => assignCourseVisuals(courses.map(c => c.id)),
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
    return <EmptyState message={t('home.empty')} />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">
          {t('home.title')}
        </h1>

        <div className="flex flex-col gap-10">
          {groups.map((group, gi) => (
            <section key={group.term?.id ?? `etc-${gi}`}>
              <h2 className="mb-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                {group.term?.name ?? t('home.etcGroup')}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {group.courses.map(course => (
                  <CourseCard
                    key={course.id}
                    name={course.name}
                    professorName={course.professor_name}
                    updatedAt={course.updated_at}
                    visual={visuals.get(course.id) ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', accent: '#6B7280', emoji: '📚' }}
                    onClick={() => router.push(`/studyspace/course/${course.id}`)}
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
