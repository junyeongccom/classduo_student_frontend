/**
 * @file CoursePanel.tsx
 * @description 퀴즈 생성 탭 좌측 강좌 카드 리스트 패널
 * @module features/my-quiz
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useTranslations } from 'next-intl'
import { BookOpen, Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export interface CourseCardData {
  course_id: string
  title: string
  section: string | null
  lecture_count: number
}

interface CoursePanelProps {
  courses: CourseCardData[]
  selectedCourseId: string | null
  onSelectCourse: (courseId: string) => void
  isLoading: boolean
}

export default function CoursePanel({
  courses,
  selectedCourseId,
  onSelectCourse,
  isLoading,
}: CoursePanelProps) {
  const t = useTranslations('myQuiz')

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-4">
        <p className="text-sm text-gray-400 text-center">{t('selector.noCourses')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 px-1">
        <BookOpen className="h-4 w-4" />
        {t('generation.courseSelect')}
      </h3>
      {courses.map(course => {
        const isSelected = course.course_id === selectedCourseId
        const displayName = course.section ? `${course.title} (${course.section})` : course.title
        return (
          <button
            key={course.course_id}
            type="button"
            onClick={() => onSelectCourse(course.course_id)}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3 text-left transition',
              isSelected
                ? 'border-blue-400 bg-blue-50 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
            )}
          >
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
              isSelected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500',
            )}>
              {course.title.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-sm font-medium truncate',
                isSelected ? 'text-blue-900' : 'text-gray-800',
              )}>
                {displayName}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t('generation.lectureCount', { count: course.lecture_count })}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
