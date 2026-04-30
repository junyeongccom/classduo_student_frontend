/**
 * @file MidFinalSlots.tsx
 * @description mid 3슬롯 + final 1슬롯 컨테이너 — status 5종 분기 + 동적 툴팁 + retry 핸들러
 * @module features/exam-prep-final/components/containers
 * @dependencies useExamPrepGeneratingPolling, midFinalService
 *
 * 슬롯 상태 (b2b20260430 §FR-5):
 *   - locked     : 회색 + 자물쇠 + 동적 툴팁 (회차 X~Y번 마스터 시)
 *   - generating : 스피너 + "잠시 후 자동으로 열립니다"
 *   - available  : 활성 버튼 → /exam-prep/tests/{testId}
 *   - mastered   : ★ 배지
 *   - failed     : 경고 + 재시도 버튼
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useExamPrepGeneratingPolling } from '../../hooks/useExamPrepGeneratingPolling'
import {
  retryFinalTest,
  retryMidTest,
  type FinalTestMetaDto,
  type MidFinalStatus,
  type MidTestMetaDto,
} from '../../services/midFinalService'

interface MidFinalSlotsProps {
  courseId: string
  /** 풀이 라우트 prefix — /exam-prep/tests/{testId} 의 base. 기본값: 현재 페이지 기준. */
  testRouteBase?: string
}

function _statusLabel(status: MidFinalStatus, forceFailed: boolean): MidFinalStatus {
  if (forceFailed && status === 'generating') return 'failed'
  return status
}

function _rangeTooltip(range: [number, number]): string {
  const [start, end] = range
  if (!start || !end) return '먼저 모든 회차를 마스터하세요'
  if (start === end) return `회차 ${start}번을 마스터하면 열립니다`
  return `회차 ${start}~${end}번까지 마스터하면 열립니다`
}

function MidSlot({
  meta,
  forceFailed,
  testRouteBase,
  onRetry,
}: {
  meta: MidTestMetaDto
  forceFailed: boolean
  testRouteBase: string
  onRetry: () => Promise<void>
}) {
  const status = _statusLabel(meta.status, forceFailed)
  const rangeText = _rangeTooltip(meta.range_session_nos)

  if (status === 'locked') {
    return (
      <div
        role="button"
        aria-disabled="true"
        aria-label={`중간 테스트 #${meta.segment_index} 잠김 — ${rangeText}`}
        title={rangeText}
        className="flex flex-col items-center justify-center rounded-lg bg-gray-200 p-4 text-gray-500 cursor-not-allowed"
      >
        <span aria-hidden>🔒</span>
        <span className="mt-1 text-sm">중간 테스트 #{meta.segment_index}</span>
        <span className="mt-1 text-xs text-gray-500">{rangeText}</span>
      </div>
    )
  }
  if (status === 'generating') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={`중간 테스트 #${meta.segment_index} 생성 중`}
        className="flex flex-col items-center justify-center rounded-lg bg-blue-50 p-4 text-blue-700"
      >
        <span aria-hidden className="animate-spin">⏳</span>
        <span className="mt-1 text-sm">중간 테스트 #{meta.segment_index}</span>
        <span className="mt-1 text-xs">잠시 후 자동으로 열립니다</span>
      </div>
    )
  }
  if (status === 'mastered') {
    return (
      <div
        aria-label={`중간 테스트 #${meta.segment_index} 마스터 완료`}
        className="flex flex-col items-center justify-center rounded-lg bg-yellow-50 p-4 text-yellow-700"
      >
        <span aria-hidden>★</span>
        <span className="mt-1 text-sm">중간 테스트 #{meta.segment_index}</span>
        <span className="mt-1 text-xs">완료</span>
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-red-50 p-4 text-red-700">
        <span aria-hidden>⚠️</span>
        <span className="mt-1 text-sm">중간 테스트 #{meta.segment_index}</span>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-2 rounded border border-red-400 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-100"
        >
          재시도
        </button>
      </div>
    )
  }
  // available
  return (
    <Link
      href={`${testRouteBase}/${meta.test_id}`}
      className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 p-4 text-emerald-700 hover:bg-emerald-100"
      aria-label={`중간 테스트 #${meta.segment_index} 풀이 시작`}
    >
      <span aria-hidden>📝</span>
      <span className="mt-1 text-sm">중간 테스트 #{meta.segment_index}</span>
      <span className="mt-1 text-xs">시작하기</span>
    </Link>
  )
}

function FinalSlot({
  meta,
  forceFailed,
  testRouteBase,
  onRetry,
}: {
  meta: FinalTestMetaDto
  forceFailed: boolean
  testRouteBase: string
  onRetry: () => Promise<void>
}) {
  const status = _statusLabel(meta.status, forceFailed)

  if (status === 'locked') {
    return (
      <div
        role="button"
        aria-disabled="true"
        aria-label="최종 테스트 잠김 — 모든 중간 테스트를 마스터하면 열립니다"
        title="모든 중간 테스트를 마스터하면 열립니다"
        className="flex flex-col items-center justify-center rounded-lg bg-gray-200 p-4 text-gray-500 cursor-not-allowed"
      >
        <span aria-hidden>🔒</span>
        <span className="mt-1 text-sm">최종 테스트</span>
        <span className="mt-1 text-xs">모든 중간 테스트 마스터 시 열림</span>
      </div>
    )
  }
  if (status === 'generating') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="최종 테스트 생성 중"
        className="flex flex-col items-center justify-center rounded-lg bg-blue-50 p-4 text-blue-700"
      >
        <span aria-hidden className="animate-spin">⏳</span>
        <span className="mt-1 text-sm">최종 테스트</span>
        <span className="mt-1 text-xs">잠시 후 자동으로 열립니다</span>
      </div>
    )
  }
  if (status === 'mastered') {
    return (
      <div
        aria-label="최종 테스트 마스터 완료"
        className="flex flex-col items-center justify-center rounded-lg bg-yellow-50 p-4 text-yellow-700"
      >
        <span aria-hidden>★</span>
        <span className="mt-1 text-sm">최종 테스트</span>
        <span className="mt-1 text-xs">완료</span>
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg bg-red-50 p-4 text-red-700">
        <span aria-hidden>⚠️</span>
        <span className="mt-1 text-sm">최종 테스트</span>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-2 rounded border border-red-400 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-100"
        >
          재시도
        </button>
      </div>
    )
  }
  return (
    <Link
      href={`${testRouteBase}/${meta.test_id}`}
      className="flex flex-col items-center justify-center rounded-lg bg-emerald-50 p-4 text-emerald-700 hover:bg-emerald-100"
      aria-label="최종 테스트 풀이 시작"
    >
      <span aria-hidden>🏁</span>
      <span className="mt-1 text-sm">최종 테스트</span>
      <span className="mt-1 text-xs">시작하기</span>
    </Link>
  )
}

export function MidFinalSlots({
  courseId,
  testRouteBase,
}: MidFinalSlotsProps) {
  const { midData, finalData, forceFailed, refresh } =
    useExamPrepGeneratingPolling(courseId)
  const router = useRouter()
  const [retryError, setRetryError] = useState<string | null>(null)

  const baseRoute =
    testRouteBase
    ?? `/studyspace/course/${courseId}/exam-prep/test`

  const handleRetryMid = async (segmentIndex: 1 | 2 | 3) => {
    setRetryError(null)
    const r = await retryMidTest(courseId, segmentIndex)
    if (!r.ok) {
      setRetryError(r.error || '재시도에 실패했습니다')
      return
    }
    await refresh()
    router.refresh()
  }

  const handleRetryFinal = async () => {
    setRetryError(null)
    const r = await retryFinalTest(courseId)
    if (!r.ok) {
      setRetryError(r.error || '재시도에 실패했습니다')
      return
    }
    await refresh()
    router.refresh()
  }

  // 백엔드 응답이 도착하기 전 — locked 기본값으로 4슬롯 자리 잡아둠
  const midSlots: MidTestMetaDto[] =
    midData?.items
    ?? ([1, 2, 3] as Array<1 | 2 | 3>).map((idx) => ({
      test_id: null,
      segment_index: idx,
      status: 'locked' as MidFinalStatus,
      mastered_at: null,
      range_session_nos: [0, 0] as [number, number],
    }))

  const finalSlot: FinalTestMetaDto =
    finalData ?? {
      course_id: courseId,
      test_id: null,
      status: 'locked' as MidFinalStatus,
      mastered_at: null,
    }

  return (
    <section
      aria-label="중간 테스트 / 최종 테스트 슬롯"
      className="mt-6"
    >
      <h2 className="mb-3 text-base font-semibold">중간 / 최종 테스트</h2>
      {retryError && (
        <div role="alert" className="mb-2 text-sm text-red-600">
          {retryError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {midSlots.map((m) => (
          <MidSlot
            key={`mid-${m.segment_index}`}
            meta={m}
            forceFailed={forceFailed}
            testRouteBase={baseRoute}
            onRetry={() => handleRetryMid(m.segment_index)}
          />
        ))}
        <FinalSlot
          meta={finalSlot}
          forceFailed={forceFailed}
          testRouteBase={baseRoute}
          onRetry={handleRetryFinal}
        />
      </div>
    </section>
  )
}
