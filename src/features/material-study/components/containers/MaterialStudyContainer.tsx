/**
 * @file MaterialStudyContainer.tsx
 * @description 강의자료별 학습 컨테이너 — Breadcrumb + ExamPrepContainer 래핑
 * @module features/material-study
 * @dependencies features/exam_prep, features/lecture-study (Breadcrumb)
 */

'use client'

import { useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { ExamPrepContainer, useExamPrepCourses, useExamPrepMaterials } from '@/features/exam_prep'
import { trackPageEnter, trackPageLeave } from '@/shared/lib/analytics'
import { Breadcrumb } from '@/features/lecture-study'

interface MaterialStudyContainerProps {
  courseId?: string
  materialId?: string
}

export function MaterialStudyContainer({ courseId, materialId }: MaterialStudyContainerProps) {
  const t = useTranslations()
  const { courses } = useExamPrepCourses()
  const { materials } = useExamPrepMaterials(courseId ?? null)

  const courseTitle = useMemo(
    () => courses.find(c => c.id === courseId)?.title ?? null,
    [courses, courseId],
  )

  const materialTitle = useMemo(
    () => materials.find(m => m.id === materialId)?.title ?? null,
    [materials, materialId],
  )

  // Analytics: 자료 열람 페이지 체류시간 추적
  useEffect(() => {
    if (courseId && materialId) {
      trackPageEnter('material_study', { courseId })
      return () => { trackPageLeave('material_study', { courseId }) }
    }
  }, [courseId, materialId])

  // materialId가 있으면 상세 페이지 → breadcrumb 표시
  const showBreadcrumb = !!courseId && !!materialId

  const breadcrumbItems = showBreadcrumb
    ? [
        { label: t('lectureStudy.breadcrumbHome'), href: '/studyspace/home' },
        { label: courseTitle ?? t('lectureStudy.breadcrumb.courseLoading'), href: `/studyspace/course/${courseId}` },
        { label: materialTitle ?? t('lectureStudy.breadcrumb.courseLoading') },
      ]
    : []

  return (
    <div className="flex h-full flex-col">
      {showBreadcrumb && (
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
          <Breadcrumb items={breadcrumbItems} />
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ExamPrepContainer courseId={courseId} materialId={materialId} />
      </div>
    </div>
  )
}
