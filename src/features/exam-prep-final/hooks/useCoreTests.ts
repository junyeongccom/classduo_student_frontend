/**
 * @file useCoreTests.ts
 * @description 과목 단위 core test 목록 fetch + 회차번호 → test_id 매핑
 * @module features/exam-prep-final/hooks
 * @dependencies examPrepService
 *
 * 매핑 전략 (이중 폴백):
 *   1) lecture_no 정확 매칭 — 백엔드 lectures.lecture_no 가 mock 카드 번호(1~26)와
 *      동일한 의미일 때 동작.
 *   2) 인덱스 기반 fallback — 백엔드 응답이 lecture_no asc 로 정렬되어 있다는
 *      성질을 이용해 N번째 카드를 N번째 test에 매핑. lectures.lecture_no 가 NULL/비순차
 *      이어도 시간순 회차 의미만 유지되면 정합.
 */
import { useEffect, useState } from 'react'
import {
  listCoreTests,
  type CoreTestSummary,
} from '../services/examPrepService'

export interface UseCoreTestsResult {
  tests: CoreTestSummary[]
  loading: boolean
  error: string | null
  /** lecture_no 정확 매칭 + 1순위 polyfill */
  findTestIdByLectureNo: (lectureNo: number) => string | null
  /** 1-based 회차 번호 → tests[number-1] (lecture_no 매칭 실패 시 fallback) */
  findTestIdByOrder: (orderNumber: number) => string | null
  /** 위 두 가지를 자동 시도 (lecture_no → order). 둘 다 실패 시 null */
  resolveTestIdForCard: (cardNumber: number) => string | null
  refresh: () => Promise<void>
}

export function useCoreTests(courseId: string | null): UseCoreTestsResult {
  const [tests, setTests] = useState<CoreTestSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOnce = async () => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    const { data, error } = await listCoreTests(courseId)
    if (error) {
      setError(error)
      setTests([])
    } else {
      const list = data?.tests ?? []
      setTests(list)
      // 개발자 진단을 돕기 위해 한 번 로그 (production에서도 가벼움 — 26 항목 수준)
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-console
        console.debug(
          '[exam-prep] core tests loaded:',
          list.map((t) => ({
            test_id: t.test_id,
            lecture_no: t.lecture_no,
            title: t.title,
          })),
        )
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOnce()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const findTestIdByLectureNo = (lectureNo: number): string | null => {
    const found = tests.find((t) => t.lecture_no === lectureNo)
    return found?.test_id ?? null
  }

  const findTestIdByOrder = (orderNumber: number): string | null => {
    const idx = orderNumber - 1 // 1-based → 0-based
    if (idx < 0 || idx >= tests.length) return null
    return tests[idx]?.test_id ?? null
  }

  const resolveTestIdForCard = (cardNumber: number): string | null => {
    return (
      findTestIdByLectureNo(cardNumber) ??
      findTestIdByOrder(cardNumber) ??
      null
    )
  }

  return {
    tests,
    loading,
    error,
    findTestIdByLectureNo,
    findTestIdByOrder,
    resolveTestIdForCard,
    refresh: fetchOnce,
  }
}
