/**
 * @file ExamPrepContainer.tsx
 * @description 기말 대비 학습 메인 컨테이너 — 탭 + 핵심테스트 그리드 + 중간/최종
 * @module features/exam-prep-final/components/containers
 * @dependencies useTranslations, mock data
 */

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import { TopHeaderCards } from '../ui/TopHeaderCards'
import { SelectedTestInfoCard } from '../ui/SelectedTestInfoCard'
import { TestSetTabs } from '../ui/TestSetTabs'
import { CoreTestButton } from '../ui/CoreTestButton'
import { MidTestBox } from '../ui/MidTestBox'
import { FinalTestPanel } from '../ui/FinalTestPanel'
import { getMockExamPrepData } from '../../mocks/mockExamPrepData'
import { getCoreTestsBySet, isCoreSetTab } from '../../domain/testSetGroups'
import type { CoreTest, TestSetTab } from '../../types'

/** 세트별 컨텐츠 박스 배경색 (Figma) */
const SET_PANEL_BG: Record<1 | 2 | 3, string> = {
  1: 'bg-white border border-gray-200',
  2: 'bg-[#EDECFD]',
  3: 'bg-[#A5A2F4]',
}

interface ExamPrepContainerProps {
  courseId: string
}

export function ExamPrepContainer({ courseId }: ExamPrepContainerProps) {
  const t = useTranslations()
  const { courseTitle } = useLectures(courseId)
  const data = useMemo(() => getMockExamPrepData(), [])

  const [activeTab, setActiveTab] = useState<TestSetTab>(1)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)

  const selectedTest: CoreTest | null = useMemo(
    () => data.coreTests.find((t) => t.id === selectedTestId) ?? null,
    [data.coreTests, selectedTestId],
  )

  // 탭 변경 시 선택 해제
  const handleTabChange = (tab: TestSetTab) => {
    setActiveTab(tab)
    setSelectedTestId(null)
  }

  const handleStartTest = (test: CoreTest) => {
    // TODO: 실제 핵심테스트 풀이 진입 라우트 연결
    console.log('Start core test:', test.id)
  }

  return (
    <>
      <StudyspaceTopbarSlot>
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Link
            href="/studyspace/home"
            className="transition-colors hover:text-[#6366F1]"
          >
            {t('courseNav.home')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/studyspace/course/${courseId}`}
            className="truncate transition-colors hover:text-[#6366F1]"
          >
            {courseTitle ?? '...'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {t('courseNav.examPrep')}
          </span>
        </nav>
      </StudyspaceTopbarSlot>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-10 py-10">
          {/* 상단 영역: 선택된 테스트 있으면 정보 카드, 없으면 3박스 헤더 */}
          {selectedTest ? (
            <SelectedTestInfoCard
              test={selectedTest}
              onStart={() => handleStartTest(selectedTest)}
            />
          ) : (
            <TopHeaderCards
              data={data}
              onRecommendedClick={() => {
                if (data.recommendedTest) {
                  handleStartTest(data.recommendedTest)
                }
              }}
            />
          )}

          {/* 테스트 세트 섹션 */}
          <div className="mt-10">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-50">
              {t('examPrepFinal.testSets')}
            </h3>

            <TestSetTabs active={activeTab} onChange={handleTabChange} />

            {/* 컨텐츠 박스 (탭과 이어짐 — 상단 좌측 모서리만 라운드 제거) */}
            <div
              className={cn(
                'rounded-3xl rounded-tl-none px-12 py-16',
                isCoreSetTab(activeTab)
                  ? SET_PANEL_BG[activeTab]
                  : 'bg-[#383698]',
              )}
            >
              {isCoreSetTab(activeTab) ? (
                <CoreSetContent
                  setNumber={activeTab}
                  data={data}
                  selectedTestId={selectedTestId}
                  onSelect={setSelectedTestId}
                />
              ) : (
                <FinalTestPanel finalTest={data.finalTest} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** 5개씩 row 단위로 분할 — 마지막 row가 자동으로 가운데 정렬됨 */
function chunkInto<T>(arr: T[], size: number): T[][] {
  const rows: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    rows.push(arr.slice(i, i + size))
  }
  return rows
}

/** 1/2/3 세트 컨텐츠 — 핵심테스트 그리드 + 중간 테스트 박스 */
function CoreSetContent({
  setNumber,
  data,
  selectedTestId,
  onSelect,
}: {
  setNumber: 1 | 2 | 3
  data: ReturnType<typeof getMockExamPrepData>
  selectedTestId: string | null
  onSelect: (id: string | null) => void
}) {
  const tests = getCoreTestsBySet(data.coreTests, setNumber)
  const midTest = data.midTests.find((m) => m.setNumber === setNumber)
  const rows = chunkInto(tests, 5)

  return (
    <div>
      {/* 핵심테스트 — 5개씩 한 줄, 마지막 줄 중앙정렬 */}
      <div className="flex flex-col gap-6">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-6">
            {row.map((test) => (
              <CoreTestButton
                key={test.id}
                test={test}
                setTone={setNumber}
                isSelected={selectedTestId === test.id}
                onClick={() =>
                  onSelect(selectedTestId === test.id ? null : test.id)
                }
              />
            ))}
          </div>
        ))}
      </div>

      {/* 중간 테스트 박스 */}
      {midTest && (
        <div className="mt-6">
          <MidTestBox midTest={midTest} />
        </div>
      )}
    </div>
  )
}
