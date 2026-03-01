/**
 * @file MyQuizContainer.tsx
 * @description 내 퀴즈 페이지 메인 컨테이너 (3탭 + 하단 선택 바)
 * @module features/my-quiz
 * @dependencies next-intl, @radix-ui/react-tabs
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { trackQuizSelfStart } from '@/shared/hooks/useAnalytics'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/Tabs'
import type { TabType } from '../../types'
import { useCourseAndLecture } from '../../hooks/useCourseAndLecture'
import LectureSelectorBar from '../ui/LectureSelectorBar'
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
  } = useCourseAndLecture()

  const isMultiSelect = activeTab !== 'generation'

  return (
    <Tabs
      value={activeTab}
      onValueChange={v => {
        setActiveTab(v as TabType)
        trackQuizSelfStart({
          lecture_id: selectedLectureId ?? '',
          source: 'my_quiz',
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

      {/* 강좌/회차 선택 바 (상단) */}
      <LectureSelectorBar
        courseOptions={courseOptions}
        lectureOptions={lectureOptions}
        selectedCourseId={selectedCourseId}
        selectedLectureId={selectedLectureId}
        onCourseChange={onCourseChange}
        onLectureChange={onLectureChange}
        isLoading={isLoading}
        hasCourses={hasCourses}
        multiSelect={isMultiSelect}
        selectedLectureIds={selectedLectureIds}
        onLectureToggle={toggleLectureId}
        onSelectAllLectures={selectAllLectures}
        onClearLectureIds={clearLectureIds}
      />

      {/* 탭별 콘텐츠 */}
      <TabsContent value="generation" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <QuizGenerationTab
          selectedLectureId={selectedLectureId}
        />
      </TabsContent>
      <TabsContent value="favorites" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <FavoritesTab selectedLectureIds={selectedLectureIds} />
      </TabsContent>
      <TabsContent value="wrong" className="flex-1 min-h-0 mt-0 overflow-y-auto">
        <WrongAnswersTab selectedLectureIds={selectedLectureIds} />
      </TabsContent>
    </Tabs>
  )
}
