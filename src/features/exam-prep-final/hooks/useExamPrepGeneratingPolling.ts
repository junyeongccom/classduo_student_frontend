/**
 * @file useExamPrepGeneratingPolling.ts
 * @description mid/final 슬롯 generating 상태 5초 폴링 + visibilitychange + 60회 cap
 * @module features/exam-prep-final/hooks
 * @dependencies react
 *
 * 정책 (b2b20260430 §FR-5):
 *   - generating 슬롯이 1개 이상이면 5초 간격 재호출. 0개면 자동 종료.
 *   - visibilitychange 시 hidden=일시정지, visible=즉시 1회 + 폴링 재개.
 *   - 60회(=5분) 후 강제 forceFailed=true 표시 + 재시도 버튼 노출.
 */

'use client'

import { useEffect, useRef, useState } from 'react'

import {
  getFinalTest,
  getMidTests,
  type FinalTestMetaDto,
  type MidFinalStatus,
  type MidTestListResponseDto,
} from '../services/midFinalService'

const POLL_INTERVAL_MS = 5000
const MAX_POLL_COUNT = 60

interface UsePollingResult {
  midData: MidTestListResponseDto | null
  finalData: FinalTestMetaDto | null
  forceFailed: boolean
  isPolling: boolean
  refresh: () => Promise<void>
}

function _hasGeneratingSlot(
  midData: MidTestListResponseDto | null,
  finalData: FinalTestMetaDto | null,
): boolean {
  const inMid = !!midData?.items?.some((s) => s.status === 'generating')
  const inFinal = finalData?.status === 'generating'
  return inMid || inFinal
}

export function useExamPrepGeneratingPolling(courseId: string | null): UsePollingResult {
  const [midData, setMidData] = useState<MidTestListResponseDto | null>(null)
  const [finalData, setFinalData] = useState<FinalTestMetaDto | null>(null)
  const [forceFailed, setForceFailed] = useState(false)
  const [isPolling, setIsPolling] = useState(false)

  const pollCountRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)
  const isVisibleRef = useRef(
    typeof document === 'undefined' ? true : !document.hidden,
  )

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsPolling(false)
  }

  const fetchOnce = async () => {
    if (!courseId) return
    try {
      const [m, f] = await Promise.all([
        getMidTests(courseId),
        getFinalTest(courseId),
      ])
      if (!isMountedRef.current) return
      if (m.data) setMidData(m.data)
      if (f.data) setFinalData(f.data)
    } catch (e) {
      // 비치명적 — 다음 tick 에서 재시도
    }
  }

  const tick = async () => {
    pollCountRef.current += 1
    await fetchOnce()
    if (pollCountRef.current >= MAX_POLL_COUNT) {
      if (isMountedRef.current) setForceFailed(true)
      stopTimer()
    }
  }

  const startTimer = () => {
    if (timerRef.current) return
    setIsPolling(true)
    timerRef.current = setInterval(() => {
      if (!isVisibleRef.current) return
      void tick()
    }, POLL_INTERVAL_MS)
  }

  // 초기 fetch + visibilitychange 등록
  useEffect(() => {
    isMountedRef.current = true
    pollCountRef.current = 0
    setForceFailed(false)
    void fetchOnce()

    const onVisibility = () => {
      const visible = !document.hidden
      isVisibleRef.current = visible
      if (visible) {
        // 즉시 1회 + 폴링 재개
        void fetchOnce()
        if (
          _hasGeneratingSlot(midData, finalData) &&
          !timerRef.current &&
          pollCountRef.current < MAX_POLL_COUNT
        ) {
          startTimer()
        }
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      isMountedRef.current = false
      document.removeEventListener('visibilitychange', onVisibility)
      stopTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  // generating 상태 변화에 맞춰 timer 시작/종료
  useEffect(() => {
    const generating = _hasGeneratingSlot(midData, finalData)
    if (generating && !forceFailed) {
      if (!timerRef.current) startTimer()
    } else {
      stopTimer()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midData, finalData, forceFailed])

  const refresh = async () => {
    pollCountRef.current = 0
    setForceFailed(false)
    await fetchOnce()
  }

  return { midData, finalData, forceFailed, isPolling, refresh }
}

export type { MidFinalStatus }
