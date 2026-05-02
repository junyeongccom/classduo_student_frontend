/**
 * @file ExamPrepContainer.tsx
 * @description 기말 대비 학습 메인 컨테이너 — 탭 + 핵심테스트 그리드 + 중간/최종
 * @module features/exam-prep-final/components/containers
 * @dependencies useTranslations, mock data
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight, Loader2 as LoaderIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import { TopHeaderCards } from '../ui/TopHeaderCards'
import { SelectedTestInfoCard } from '../ui/SelectedTestInfoCard'
import { TestSetTabs } from '../ui/TestSetTabs'
import { CoreTestButton } from '../ui/CoreTestButton'
import { MidTestBox } from '../ui/MidTestBox'
import { FinalTestPanel } from '../ui/FinalTestPanel'
import { useExamPrepData } from '../../hooks/useExamPrepData'
import { getCoreTestsBySet, isCoreSetTab } from '../../domain/testSetGroups'
import type { CoreTest, ExamPrepData, TestSetTab } from '../../types'

/** 세트별 컨텐츠 박스 배경색 (Figma) — 탭 배경과 동일하게 통일 */
const SET_PANEL_BG: Record<1 | 2 | 3, string> = {
  1: 'bg-white border border-gray-200',
  2: 'bg-[#DEDEF8]',
  3: 'bg-[#8F8DF0]',
}

interface ExamPrepContainerProps {
  courseId: string
}

/** 핵심테스트 PNG 자산 — 페이지 진입 즉시 브라우저 캐시에 prefetch */
const PRELOAD_ASSETS = [
  '/마스터 불꽃 보라.png',
  '/마스터 불꽃 비활성.png',
  '/자물쇠.png',
]

export function ExamPrepContainer({ courseId }: ExamPrepContainerProps) {
  const t = useTranslations()
  const router = useRouter()
  const { courseTitle } = useLectures(courseId)
  const { data, isLoading, error, refresh } = useExamPrepData(courseId)
  // 페이지 마운트 시 PNG 자산 prefetch — 첫 클릭 딜레이 방지
  useEffect(() => {
    PRELOAD_ASSETS.forEach((src) => {
      const img = new window.Image()
      img.src = src
    })
  }, [])

  const [activeTab, setActiveTab] = useState<TestSetTab>(1)
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)

  const selectedTest: CoreTest | null = useMemo(() => {
    if (!data) return null
    return data.coreTests.find((t) => t.id === selectedTestId) ?? null
  }, [data, selectedTestId])

  // 탭 변경 시 선택 해제
  const handleTabChange = (tab: TestSetTab) => {
    setActiveTab(tab)
    setSelectedTestId(null)
    setStartError(null)
  }

  /** 핵심테스트 풀이 페이지 라우팅
   *
   * useExamPrepData 가 lecture_session_id 기준으로 백엔드 test_id 를 미리 매핑한다:
   *   - 매칭 성공: test.id = exam_prep_test.id (uuid)
   *   - 매칭 실패: test.id = "lecture-{lectureId}" (placeholder fallback)
   *   - lecture 자체 없음: test.id = "placeholder-{N}"
   *
   * uuid 일 때만 풀이 라우트로 진입, 그 외에는 안내 메시지.
   */
  const handleStartTest = (test: CoreTest) => {
    if (
      test.id.startsWith('lecture-') ||
      test.id.startsWith('placeholder-')
    ) {
      setStartError(
        `${test.number}회차의 핵심 테스트가 아직 생성되지 않았어요. 컨텐츠 생성 파이프라인을 완료해주세요.`,
      )
      return
    }
    setStartError(null)
    router.push(
      `/studyspace/course/${courseId}/exam-prep/test/${test.id}`,
    )
  }

  /** 중간 테스트 박스 클릭 — testId 가 있을 때만 풀이 페이지로 라우팅 */
  const handleStartMid = (testId: string | null) => {
    if (!testId) return
    setStartError(null)
    router.push(`/studyspace/course/${courseId}/exam-prep/test/${testId}`)
  }

  /** 최종 테스트 클릭 — testId 가 있을 때만 풀이 페이지로 라우팅 */
  const handleStartFinal = () => {
    const tid = data?.finalTest.testId
    if (!tid) return
    setStartError(null)
    router.push(`/studyspace/course/${courseId}/exam-prep/test/${tid}`)
  }

  // 데이터 로딩 / 에러 처리
  if (isLoading || !data) {
    return (
      <>
        <StudyspaceTopbarSlot>
          <ExamPrepBreadcrumb t={t} courseId={courseId} courseTitle={courseTitle} />
        </StudyspaceTopbarSlot>
        <div className="flex h-full items-center justify-center">
          <LoaderIcon className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <StudyspaceTopbarSlot>
          <ExamPrepBreadcrumb t={t} courseId={courseId} courseTitle={courseTitle} />
        </StudyspaceTopbarSlot>
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <StudyspaceTopbarSlot>
        <ExamPrepBreadcrumb t={t} courseId={courseId} courseTitle={courseTitle} />
      </StudyspaceTopbarSlot>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-10 py-10">
          {startError && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {startError}
            </div>
          )}
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
                'relative rounded-3xl rounded-tl-none px-12 py-16',
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
                  courseId={courseId}
                  onSelect={setSelectedTestId}
                  onStartMid={handleStartMid}
                />
              ) : (
                <FinalTestPanel
                  finalTest={data.finalTest}
                  onStart={handleStartFinal}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

/** Breadcrumb 컴포넌트 — 로딩/에러/정상 상태 모두에서 재사용 */
function ExamPrepBreadcrumb({
  t,
  courseId,
  courseTitle,
}: {
  t: ReturnType<typeof useTranslations>
  courseId: string
  courseTitle: string | null
}) {
  return (
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

/** 1/2/3 세트 컨텐츠 — 핵심테스트 + 중간 테스트 책 (그리드 마지막 셀)
 *
 * MidTestBox(책 일러스트)는 핵심테스트 그리드의 마지막 셀로 자연스럽게 들어감.
 * unlocked / testId / status 는 useExamPrepData 에서 백엔드 mid status 와 coreTests 의
 * isTestMastered 로 산출됨. 잠금해제 시만 클릭 가능 → onStartMid(testId).
 */
function CoreSetContent({
  setNumber,
  data,
  selectedTestId,
  courseId,
  onSelect,
  onStartMid,
}: {
  setNumber: 1 | 2 | 3
  data: ExamPrepData
  selectedTestId: string | null
  courseId: string
  onSelect: (id: string | null) => void
  onStartMid: (testId: string | null) => void
}) {
  const tests = getCoreTestsBySet(data.coreTests, setNumber)
  const midTest = data.midTests.find((m) => m.setNumber === setNumber)

  // 핵심테스트 + 중간테스트(있으면)를 하나의 시퀀스로 합쳐 그리드에 흘림
  type GridItem =
    | { kind: 'core'; test: (typeof tests)[number] }
    | { kind: 'mid'; mid: NonNullable<typeof midTest> }
  const items: GridItem[] = [
    ...tests.map((t) => ({ kind: 'core' as const, test: t })),
    ...(midTest ? [{ kind: 'mid' as const, mid: midTest }] : []),
  ]
  const rows = chunkInto(items, 5)

  return (
    <div className="flex flex-col gap-6">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center justify-center gap-6">
          {row.map((item) =>
            item.kind === 'core' ? (
              <CoreTestButton
                key={item.test.id}
                test={item.test}
                setTone={setNumber}
                isSelected={selectedTestId === item.test.id}
                onClick={() =>
                  onSelect(selectedTestId === item.test.id ? null : item.test.id)
                }
              />
            ) : (
              <MidTestBox
                key={`mid-${item.mid.setNumber}`}
                midTest={item.mid}
                courseId={courseId}
                onClick={() => onStartMid(item.mid.testId)}
              />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
