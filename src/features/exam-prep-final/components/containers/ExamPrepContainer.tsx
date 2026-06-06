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
import { SelectedMidTestInfoCard } from '../ui/SelectedMidTestInfoCard'
import { TestSetTabs } from '../ui/TestSetTabs'
import { CoreTestButton } from '../ui/CoreTestButton'
import { MidTestBox } from '../ui/MidTestBox'
import { FinalTestPanel } from '../ui/FinalTestPanel'
import { useExamPrepData } from '../../hooks/useExamPrepData'
import { getCoreTestsBySet, isCoreSetTab } from '../../domain/testSetGroups'
import type { CoreTest, ExamPrepData, MidTest, TestSetTab } from '../../types'

/** 선택 상태 — 핵심테스트(core) 또는 중간테스트(mid) 중 하나만 동시에 활성. */
type Selection =
  | { kind: 'core'; id: string }
  | { kind: 'mid'; setNumber: 1 | 2 | 3 }
  | null

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
  const [selection, setSelection] = useState<Selection>(null)
  const [startError, setStartError] = useState<string | null>(null)

  const selectedCoreTest: CoreTest | null = useMemo(() => {
    if (!data || selection?.kind !== 'core') return null
    return data.coreTests.find((t) => t.id === selection.id) ?? null
  }, [data, selection])

  const selectedMidTest: MidTest | null = useMemo(() => {
    if (!data || selection?.kind !== 'mid') return null
    return data.midTests.find((m) => m.setNumber === selection.setNumber) ?? null
  }, [data, selection])

  // 탭 변경 시 선택 해제
  const handleTabChange = (tab: TestSetTab) => {
    setActiveTab(tab)
    setSelection(null)
    setStartError(null)
  }

  /** 핵심테스트 토글 — 같은 ID 재클릭 시 deselect, 그 외엔 core 로 교체 (mid 도 자동 해제). */
  const handleSelectCore = (id: string) => {
    setSelection((prev) =>
      prev?.kind === 'core' && prev.id === id ? null : { kind: 'core', id },
    )
  }

  /** 중간테스트 토글 — 같은 setNumber 재클릭 시 deselect, 그 외엔 mid 로 교체. */
  const handleSelectMid = (setNumber: 1 | 2 | 3) => {
    setSelection((prev) =>
      prev?.kind === 'mid' && prev.setNumber === setNumber
        ? null
        : { kind: 'mid', setNumber },
    )
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
        t('examPrepFinal.coreTestNotGenerated', { number: test.number }),
      )
      return
    }
    setStartError(null)
    router.push(
      `/studyspace/course/${courseId}/exam-prep/test/${test.id}`,
    )
  }

  /** 중간 테스트 시작 — 카드 내 시작 버튼에서 호출. testId 있을 때만 라우팅. */
  const handleStartMid = (mid: MidTest) => {
    const tid = mid.testId
    if (!tid) return
    setStartError(null)
    router.push(`/studyspace/course/${courseId}/exam-prep/test/${tid}`)
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
        <div className="mx-auto max-w-5xl px-3 py-5 md:px-10 md:py-10">
          {startError && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {startError}
            </div>
          )}
          {/* 상단 영역: 핵심/중간 선택 시 정보 카드, 없으면 3박스 헤더.
              세 가지 변형의 자연 높이가 달라 스왑 시 하단 컨텐츠가 들썩이는 문제 →
              고정 높이 래퍼로 묶고 내부는 h-full 로 채워 레이아웃 시프트 방지. */}
          <div className="md:h-[200px]">
            {selectedCoreTest ? (
              <SelectedTestInfoCard
                test={selectedCoreTest}
                onStart={() => handleStartTest(selectedCoreTest)}
              />
            ) : selectedMidTest ? (
              <SelectedMidTestInfoCard
                midTest={selectedMidTest}
                onStart={() => handleStartMid(selectedMidTest)}
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
          </div>

          {/* 테스트 세트 섹션 */}
          <div className="mt-10">
            <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-50">
              {t('examPrepFinal.testSets')}
            </h3>

            <TestSetTabs active={activeTab} onChange={handleTabChange} />

            {/* 컨텐츠 박스 (탭과 이어짐 — 상단 좌측 모서리만 라운드 제거) */}
            <div
              className={cn(
                'relative rounded-3xl rounded-tl-none px-3 py-6 md:px-12 md:py-16',
                isCoreSetTab(activeTab)
                  ? SET_PANEL_BG[activeTab]
                  : 'bg-[#383698]',
              )}
            >
              {isCoreSetTab(activeTab) ? (
                <CoreSetContent
                  setNumber={activeTab}
                  data={data}
                  selection={selection}
                  courseId={courseId}
                  onSelectCore={handleSelectCore}
                  onSelectMid={handleSelectMid}
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
    <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm font-medium text-gray-400 md:gap-2">
      <Link
        href="/studyspace/home"
        className="shrink-0 transition-colors hover:text-[#6366F1]"
      >
        {t('courseNav.home')}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <Link
        href={`/studyspace/course/${courseId}`}
        className="min-w-0 truncate transition-colors hover:text-[#6366F1]"
      >
        {courseTitle ?? '...'}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span className="shrink-0 font-semibold text-gray-900 dark:text-gray-100">
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
 * 클릭 시 책 펼침 모션 없이 부모 selection 만 토글 — 핵심테스트와 동일한 토글 UX.
 * 시작은 상단 SelectedMidTestInfoCard 의 Play 버튼에서.
 */
function CoreSetContent({
  setNumber,
  data,
  selection,
  courseId,
  onSelectCore,
  onSelectMid,
}: {
  setNumber: 1 | 2 | 3
  data: ExamPrepData
  selection: Selection
  courseId: string
  onSelectCore: (id: string) => void
  onSelectMid: (setNumber: 1 | 2 | 3) => void
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
  // 2행 고정 — 아이템을 두 줄로 균등 분배 (행당 ceil(n/2)개)
  const rows = chunkInto(items, Math.max(1, Math.ceil(items.length / 2)))

  const isCoreSelected = (id: string) =>
    selection?.kind === 'core' && selection.id === id
  const isMidSelected = (setNum: 1 | 2 | 3) =>
    selection?.kind === 'mid' && selection.setNumber === setNum

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {rows.map((row, ri) => (
        <div key={ri} className="flex flex-wrap md:flex-nowrap items-center justify-center gap-3 md:gap-6">
          {row.map((item) =>
            item.kind === 'core' ? (
              <CoreTestButton
                key={item.test.id}
                test={item.test}
                setTone={setNumber}
                isSelected={isCoreSelected(item.test.id)}
                onClick={() => onSelectCore(item.test.id)}
              />
            ) : (
              <MidTestBox
                key={`mid-${item.mid.setNumber}`}
                midTest={item.mid}
                courseId={courseId}
                isSelected={isMidSelected(item.mid.setNumber)}
                onClick={() => onSelectMid(item.mid.setNumber)}
              />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
