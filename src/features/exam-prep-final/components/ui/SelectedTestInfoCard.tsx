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
import { fetchTestMasterySummary } from '../../services/examPrepService'
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
  const numberLabel = String(test.number).padStart(2, '0')
  const sessionLabel = `${test.weekNo}주차 ${test.sessionNo}차시`

  const [mastery, setMastery] = useState<MasteryCounts | null>(null)

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
    <div className="relative flex h-full items-stretch justify-between gap-6 overflow-hidden rounded-3xl border border-gray-200 bg-white px-7 py-7 dark:border-gray-700 dark:bg-gray-900">
      {/* 좌측 — flex-col + justify-between 으로 박스 높이 안에서 균형 분산 */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-4">
            <span className="text-5xl font-bold leading-none text-gray-900 dark:text-gray-50">
              {numberLabel}
            </span>
            <span className="text-base font-medium text-gray-400">
              {sessionLabel}
            </span>
          </div>
          <h3
            className="mt-5 line-clamp-2 text-3xl font-bold text-gray-900 dark:text-gray-50"
            title={test.lectureTitle}
          >
            {test.lectureTitle}
          </h3>
        </div>

        {/* 미터링 도트 — 박스 하단 정렬. 색상은 풀이 화면 SolveSidebar 와 동일.
            (Learning #D9D9D9 / Skilled #FFCD36 / Master #A78BFA) */}
        <div className="flex items-center gap-5 text-base font-medium text-gray-700 dark:text-gray-200">
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#D9D9D9]" />
            {counts.learning}
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#FFCD36]" />
            {counts.skilled}
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#A78BFA]" />
            {counts.master}
          </span>
        </div>
      </div>

      {test.isTestMastered ? (
        <>
          {/* 마스터한 테스트 — 진입 버튼 위치에 MASTER 도장 (장식, 비상호작용) */}
          <div className="flex shrink-0 self-center">
            <img
              src="/master-big.png"
              alt="MASTER"
              aria-hidden
              draggable={false}
              className="pointer-events-none h-32 w-auto select-none object-contain"
            />
          </div>
          {/* 다시보기 — 우측 하단 작은 리플레이 버튼 */}
          <button
            type="button"
            onClick={onStart}
            aria-label="다시 보기"
            title="다시 보기"
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-[#6366F1] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={onStart}
          aria-label="Start test"
          className="flex h-20 w-20 shrink-0 self-center items-center justify-center rounded-2xl bg-[#6366F1] text-white shadow-md shadow-indigo-500/20 transition-colors hover:bg-[#5558E6]"
        >
          <Play className="h-8 w-8 fill-white" />
        </button>
      )}
    </div>
  )
}
