/**
 * @file ExamPrepContainer.tsx
 * @description 기말 대비 학습 메인 컨테이너 — 주차 그룹 핵심테스트 리스트 + 추천/선택 카드
 * @module features/exam-prep-final/components/containers
 * @dependencies useTranslations, mock data
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight, List as ListIcon, Loader2 as LoaderIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { useMediaQuery } from '@/shared/hooks/useMediaQuery'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import { TopHeaderCards } from '../ui/TopHeaderCards'
import { SelectedTestInfoCard } from '../ui/SelectedTestInfoCard'
import { WeeklyCoreTestList } from '../ui/WeeklyCoreTestList'
import { CoreTestListModal } from '../ui/CoreTestListModal'
import { useExamPrepData } from '../../hooks/useExamPrepData'
import type { CoreTest } from '../../types'

/** 선택 상태 — 핵심테스트 선택 여부 (2026-09 개편: 중간테스트 폐지). */
type Selection = { kind: 'core'; id: string } | null

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
  // 모바일(<768px): 테스트 선택 시 상단 3박스를 유지한 채, 선택 정보 카드를
  // 하단 사이드바 버튼 위에 floating 으로 띄운다(시안 1041:3796). 데스크톱은 기존대로 상단 스왑.
  const isMobile = useMediaQuery('(max-width: 767px)')
  const { courseTitle } = useLectures(courseId)
  const { data, isLoading, error, refresh } = useExamPrepData(courseId)
  // 페이지 마운트 시 PNG 자산 prefetch — 첫 클릭 딜레이 방지
  useEffect(() => {
    PRELOAD_ASSETS.forEach((src) => {
      const img = new window.Image()
      img.src = src
    })
  }, [])

  const [selection, setSelection] = useState<Selection>(null)
  const [startError, setStartError] = useState<string | null>(null)
  // '테스트 세트' 옆 "목록" 트리거 — 핵심테스트 26개 주제 목록 모달 오픈 상태.
  const [listOpen, setListOpen] = useState(false)

  const selectedCoreTest: CoreTest | null = useMemo(() => {
    if (!data || selection?.kind !== 'core') return null
    return data.coreTests.find((t) => t.id === selection.id) ?? null
  }, [data, selection])

  /** 핵심테스트 토글 — 같은 ID 재클릭 시 deselect, 그 외엔 core 로 교체. */
  const handleSelectCore = (id: string) => {
    setSelection((prev) =>
      prev?.kind === 'core' && prev.id === id ? null : { kind: 'core', id },
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
        <div
          className={cn(
            'mx-auto max-w-5xl px-3 py-5 md:px-10 md:py-10',
            // 모바일에서 floating 카드가 뜰 때, 마지막 테스트 버튼이 카드에 가리지 않도록 하단 여백 확보
            isMobile && selectedCoreTest && 'pb-44',
          )}
        >
          {startError && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {startError}
            </div>
          )}
          {/* 상단 영역: 핵심/중간 선택 시 정보 카드, 없으면 3박스 헤더.
              세 가지 변형의 자연 높이가 달라 스왑 시 하단 컨텐츠가 들썩이는 문제 →
              고정 높이 래퍼로 묶고 내부는 h-full 로 채워 레이아웃 시프트 방지. */}
          <div className="md:h-[200px]">
            {!isMobile && selectedCoreTest ? (
              <SelectedTestInfoCard
                test={selectedCoreTest}
                onStart={() => handleStartTest(selectedCoreTest)}
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
            <div className="mb-4 flex items-center gap-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-50">
                {t('examPrepFinal.testSets')}
              </h3>
              {/* 목록 — 핵심테스트 26개 주제 목록 모달 트리거 */}
              <button
                type="button"
                onClick={() => setListOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 transition-colors hover:border-[#6366F1] hover:text-[#6366F1] dark:border-gray-700 dark:text-gray-300 dark:hover:border-[#6366F1] dark:hover:text-[#818CF8]"
              >
                <ListIcon className="h-4 w-4" />
                {t('examPrepFinal.coreTestList.trigger')}
              </button>
            </div>

            {/* 주차 그룹 리스트 (2026-09 B안 개편) — 세트 탭 제거, 회차 제목·진행률을 행에 직접 표기 */}
            <WeeklyCoreTestList
              coreTests={data.coreTests}
              selectedCoreId={selection?.kind === 'core' ? selection.id : null}
              onSelectCore={handleSelectCore}
            />
          </div>
        </div>
      </div>

      {/* 모바일 floating 정보 카드 — 테스트 선택 시 하단 사이드바 버튼(좌하단 z-[48]) 위에 띄움.
          --u 는 --app-w(min(100vw,430px))/390 이라 1.10 으로 캡 → 햄버거 버튼 상단이 뷰포트 하단에서
          최대 ~62px → bottom 80px + safe-area 면 전 모바일 폭에서 버튼과 겹치지 않는다. (시안 1041:3796) */}
      {isMobile && selectedCoreTest && (
        <div className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom))] z-[45] flex justify-center px-4">
          <div className="w-full max-w-[480px] rounded-3xl shadow-[0_8px_30px_rgba(15,23,42,0.18)]">
            {selectedCoreTest ? (
              <SelectedTestInfoCard
                test={selectedCoreTest}
                onStart={() => handleStartTest(selectedCoreTest)}
              />
            ) : null}
          </div>
        </div>
      )}

      {/* 목록 모달 — 핵심테스트 주제 목록 (서술형 중간테스트 제외).
          그리드와 동일하게 잠긴(locked) 테스트는 목록에서도 제외 — 비면 모달 자체 empty 상태. */}
      {listOpen && (
        <CoreTestListModal
          coreTests={data.coreTests.filter((c) => c.status !== 'locked')}
          onClose={() => setListOpen(false)}
          onSelectTest={(test) => {
            setListOpen(false)
            handleStartTest(test)
          }}
        />
      )}
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
    <nav className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400 md:gap-2">
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
