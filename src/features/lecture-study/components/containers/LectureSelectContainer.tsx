/**
 * @file LectureSelectContainer.tsx
 * @description 과목 내부 탭 + 회차 선택 컨테이너
 * @module features/lecture-study/components/containers
 * @dependencies useLectures, Breadcrumb, LectureCard, Tabs, MaterialStudyContainer
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui'
import { MaterialStudyContainer } from '@/features/material-study'
import { useLectures } from '../../hooks/useLectures'
import { Breadcrumb } from '../ui/Breadcrumb'
import { LectureCard } from '../ui/LectureCard'

type CourseTab = 'lecture' | 'material'

export function LectureSelectContainer({ courseId }: { courseId: string }) {
  const t = useTranslations()
  const router = useRouter()
  const { lectures, courseTitle, isLoading, error, refresh } = useLectures(courseId)
  const [activeTab, setActiveTab] = useState<CourseTab>('lecture')

  const breadcrumbItems = [
    { label: t('lectureStudy.breadcrumbHome'), href: '/studyspace/home' },
    { label: courseTitle ?? '...' },
  ]

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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <Breadcrumb items={breadcrumbItems} />

        <Tabs
          value={activeTab}
          onValueChange={v => setActiveTab(v as CourseTab)}
          className="mt-4"
        >
          <TabsList>
            <TabsTrigger value="lecture">
              {t('lectureStudy.tabLecture')}
            </TabsTrigger>
            <TabsTrigger value="material">
              {t('lectureStudy.tabMaterial')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lecture" className="mt-6">
            {lectures.length === 0 ? (
              <div className="flex items-center justify-center py-20 text-sm text-gray-400">
                {t('lectureStudy.lectureSelect.allInactive')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lectures.map((lecture, index) => (
                  <LectureCard
                    key={lecture.id}
                    lecture={lecture}
                    isLatest={index === 0}
                    onClick={() =>
                      router.push(`/studyspace/course/${courseId}/lecture/${lecture.id}`)
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="material" className="mt-6">
            <MaterialStudyContainer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
