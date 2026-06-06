/**
 * @file SelectedTestInfoCard.tsx
 * @description 핵심 테스트 선택 시 상단 3박스를 대체하는 정보 카드. mastery 카운트는
 *   백엔드 fetchTestMasterySummary 응답으로 동기화 (test.metaCounts mock 무시).
 * @module features/exam-prep-final/components/ui
 * @dependencies lucide-react, examPrepService
 */

'use client'

import { useEffect, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { fetchTestMasterySummary, fetchCoreTestDetail } from '../../services/examPrepService'
import type { CoreTest } from '../../types'

interface SelectedTestInfoCardProps {
  test: CoreTest
  onStart: () => void
}

interface MasteryCounts {
  learning: number
  skilled: number
  master: number
}

/** test.id 가 백엔드 UUID 인지 (lecture-/placeholder- prefix 가 아닌지) */
function _isBackendTestId(id: string): boolean {
  return !id.startsWith('lecture-') && !id.startsWith('placeholder-')
}

export function SelectedTestInfoCard({ test, onStart }: SelectedTestInfoCardProps) {
  const t = useTranslations()
  const numberLabel = String(test.number).padStart(2, '0')
  const sessionLabel = t('examPrepFinal.weekSession', {
    week: test.weekNo,
    session: test.sessionNo,
  })

  const [mastery, setMastery] = useState<MasteryCounts | null>(null)
  // 1순위 주제 — 선택 시 detail fetch (summary엔 주제 없음). 주차/차시 대신 표시.
  const [topic, setTopic] = useState<string>('')

  // 선택된 test 가 변경될 때마다 mastery summary 재조회
  useEffect(() => {
    if (!_isBackendTestId(test.id)) {
      setMastery(null)
      return
    }
    let alive = true
    fetchTestMasterySummary(test.id).then(({ data, error }) => {
      if (!alive) return
      if (error || !data) {
        setMastery(null)
        return
      }
      setMastery({
        learning: data.summary.learning,
        skilled: data.summary.skilled,
        master: data.summary.master,
      })
    })
    return () => {
      alive = false
    }
  }, [test.id])

  // 선택 시 detail fetch → 첫 문항 source_ref.topic_title (1순위 주제). summary엔 없어서 별도 조회.
  useEffect(() => {
    if (!_isBackendTestId(test.id)) {
      setTopic('')
      return
    }
    let alive = true
    fetchCoreTestDetail(test.id).then(({ data }) => {
      if (!alive) return
      const q = data?.questions?.find((q) => q.source_ref?.topic_title?.trim())
      setTopic((q?.source_ref?.topic_title ?? '').trim())
    })
    return () => {
      alive = false
    }
  }, [test.id])

  // mastery 응답 도착 전 즉시 추정값 — isTestMastered 기반.
  //   master 도달 → 모두 master, 미도달 → 모두 learning.
  //   (실제 응답 도착 시 정확한 분포로 갱신. 과거 fallback 은 metaCounts.gray=문항수 그대로
  //    Learning 슬롯에 넣어 "15/0/0 → 0/0/15" 깜빡임을 유발했음.)
  const totalQs = test.metaCounts.gray + test.metaCounts.cyan + test.metaCounts.green
  const counts: MasteryCounts = mastery ?? (
    test.isTestMastered
      ? { learning: 0, skilled: 0, master: totalQs }
      : { learning: totalQs, skilled: 0, master: 0 }
  )

  return (
    <div className="relative flex items-stretch justify-between gap-3 rounded-3xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-900 md:min-h-[200px] md:gap-6 md:px-7 md:py-7">
      {/* MASTER 도장 — 마스터 상태일 때 우측 상단 absolute 로 띄움. 좌측 제목이 풀폭으로
          보이도록 (이전엔 도장이 우측 컬럼을 차지해 제목이 잘림). pointer-events-none 으로
          하단의 RotateCcw 버튼 클릭 영역과 겹치지 않게. */}
      {test.isTestMastered && (
        <img
          src="/master-big.png"
          alt="MASTER"
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute right-3 top-3 z-10 h-16 w-auto select-none object-contain md:right-5 md:top-5 md:h-28"
        />
      )}
      {/* 좌측 — flex-col + justify-between 으로 박스 높이 안에서 균형 분산 */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 md:gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 md:gap-4">
            <span className="text-3xl font-bold leading-none text-gray-900 dark:text-gray-50 md:text-5xl">
              {numberLabel}
            </span>
            <span className="text-sm font-medium text-gray-400 break-keep md:text-base">
              {topic || sessionLabel}
            </span>
          </div>
          <h3
            className="mt-3 text-base font-bold text-gray-900 dark:text-gray-50 md:mt-5 md:text-3xl"
            title={test.lectureTitle}
          >
            {test.lectureTitle}
          </h3>
        </div>

        {/* 미터링 도트 — 박스 하단 정렬. 색상은 풀이 화면 SolveSidebar 와 동일.
            (Learning #D9D9D9 / Skilled #FFCD36 / Master #A78BFA) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-base font-medium text-gray-700 dark:text-gray-200">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#D9D9D9]" />
            {counts.learning}
          </span>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#FFCD36]" />
            {counts.skilled}
          </span>
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#A78BFA]" />
            {counts.master}
          </span>
        </div>
      </div>

      {test.isTestMastered ? (
        /* 다시보기 — 우측 하단 작은 리플레이 버튼 (MASTER 도장은 카드 상단 absolute) */
        <button
          type="button"
          onClick={onStart}
          aria-label={t('examPrepFinal.replayLabel')}
          title={t('examPrepFinal.replayLabel')}
          className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#6366F1] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onStart}
          aria-label={t('examPrepFinal.startTestAria')}
          className="flex h-14 w-14 shrink-0 self-center items-center justify-center rounded-2xl bg-[#6366F1] text-white shadow-md shadow-indigo-500/20 transition-colors hover:bg-[#5558E6] md:h-20 md:w-20"
        >
          <Play className="h-6 w-6 fill-white md:h-8 md:w-8" />
        </button>
      )}
    </div>
  )
}
