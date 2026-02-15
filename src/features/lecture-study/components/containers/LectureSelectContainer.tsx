/**
 * @file LectureSelectContainer.tsx
 * @description 과목 내부 탭 + 회차 선택 컨테이너 — 리디자인된 탭바 + 배경 구분
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
        <p className="text-sm text-gray-500">
          {error === 'LOAD_LECTURES_FAILED' ? t('lectureStudy.error.loadLectures') : error}
        </p>
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
      <div className="mx-auto max-w-6xl px-6 py-6">
        <Breadcrumb items={breadcrumbItems} />

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as CourseTab)}
          className="mt-4"
        >
          <div className="sticky top-0 z-10 bg-gray-50 pb-2">
            <TabsList className="inline-flex h-11 items-center gap-1 rounded-xl bg-gray-100/80 p-1">
              <TabsTrigger
                value="lecture"
                className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                {t('lectureStudy.tabLecture')}
              </TabsTrigger>
              <TabsTrigger
                value="material"
                className="rounded-lg px-5 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm"
              >
                {t('lectureStudy.tabMaterial')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="lecture" className="mt-4">
            <div className="rounded-2xl bg-gray-50/80 p-6">
              {lectures.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-sm text-gray-400">
                  {t('lectureStudy.lectureSelect.empty')}
                </div>
              ) : (
                <>
                  {lectures.every((l) => !l.has_content) && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      {t('lectureStudy.lectureSelect.allInactive')}
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {lectures.map((lecture, index) => (
                      <LectureCard
                        key={lecture.id}
                        lecture={lecture}
                        isLatest={index === 0}
                        courseId={courseId}
                        onClick={() =>
                          router.push(
                            `/studyspace/course/${courseId}/lecture/${lecture.id}`,
                          )
                        }
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="material" className="mt-4">
            <div className="rounded-2xl bg-gray-50/80 p-6">
              <MaterialStudyContainer courseId={courseId} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
