/**
 * @file MyQuizContainer.tsx
 * @description 내 퀴즈 페이지 메인 컨테이너 (3탭 + 하단 선택 바)
 * @module features/my-quiz
 * @dependencies next-intl, @radix-ui/react-tabs
 */

'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { trackQuizSelfStart } from '@/shared/hooks/useAnalytics'
import { trackPageEnter, trackPageLeave, myQuizAnalytics } from '@/shared/lib/analytics'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import type { TabType } from '../../types'
import { useCourseAndLecture } from '../../hooks/useCourseAndLecture'
import QuizGenerationTab from './QuizGenerationTab'
import FavoritesTab from './FavoritesTab'
import WrongAnswersTab from './WrongAnswersTab'

const TAB_KEYS: TabType[] = ['generation', 'favorites', 'wrong']

export default function MyQuizContainer() {
  const t = useTranslations('myQuiz')
  const [activeTab, setActiveTab] = useState<TabType>('generation')

  const {
    isLoading,
    courseOptions,
    lectureOptions,
    selectedCourseId,
    selectedLectureId,
    selectedLectureIds,
    onCourseChange,
    onLectureChange,
    toggleLectureId,
    selectAllLectures,
    clearLectureIds,
    hasCourses,
    lectureInfoMap,
  } = useCourseAndLecture()

  useEffect(() => {
    trackPageEnter('my_quizzes')
    return () => { trackPageLeave('my_quizzes') }
  }, [])

  const effectiveLectureIds = selectedLectureIds.length > 0
    ? selectedLectureIds
    : lectureOptions.map(l => l.value)

  return (
    <Tabs
      value={activeTab}
      onValueChange={v => {
        setActiveTab(v as TabType)
        myQuizAnalytics.tabView(v)
        trackQuizSelfStart({
          lecture_id: selectedLectureId ?? '',
          course_id: selectedCourseId ?? '',
          entry_source: 'my_quiz',
          tab: v,
        })
      }}
      className="flex h-full flex-col"
    >
      {/* 상단 탭 바 */}
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 px-4">
        <TabsList className="inline-flex h-auto rounded-none bg-transparent p-0 gap-1">
          {TAB_KEYS.map(tab => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none bg-transparent px-3 py-2.5 text-xs font-medium text-gray-400 shadow-none transition-colors data-[state=active]:bg-transparent data-[state=active]:text-[#6366F1] data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#6366F1] hover:text-gray-600 dark:hover:text-gray-300"
            >
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* 탭별 콘텐츠 */}
      <TabsContent value="generation" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <QuizGenerationTab />
      </TabsContent>
      <TabsContent value="favorites" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <FavoritesTab
          selectedLectureIds={effectiveLectureIds}
          lectureInfoMap={lectureInfoMap}
          courseOptions={courseOptions}
          lectureOptions={lectureOptions}
          selectedCourseId={selectedCourseId}
          onCourseChange={onCourseChange}
          selectedLectureIds_multi={selectedLectureIds}
          onLectureToggle={toggleLectureId}
          onSelectAllLectures={selectAllLectures}
          onClearLectureIds={clearLectureIds}
          isLoading={isLoading}
          hasCourses={hasCourses}
        />
      </TabsContent>
      <TabsContent value="wrong" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <WrongAnswersTab
          selectedLectureIds={effectiveLectureIds}
          lectureInfoMap={lectureInfoMap}
          courseOptions={courseOptions}
          lectureOptions={lectureOptions}
          selectedCourseId={selectedCourseId}
          onCourseChange={onCourseChange}
          selectedLectureIds_multi={selectedLectureIds}
          onLectureToggle={toggleLectureId}
          onSelectAllLectures={selectAllLectures}
          onClearLectureIds={clearLectureIds}
          isLoading={isLoading}
          hasCourses={hasCourses}
        />
      </TabsContent>
    </Tabs>
  )
}
