/**
 * @file useCoreTests.ts
 * @description 과목 단위 core test 목록 fetch + 회차번호 → test_id 매핑
 * @module features/exam-prep-final/hooks
 * @dependencies examPrepService
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
  /** 회차 번호(lecture_no)로 test_id 찾기. 없으면 null. */
  findTestIdByLectureNo: (lectureNo: number) => string | null
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
      setTests(data?.tests ?? [])
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

  return {
    tests,
    loading,
    error,
    findTestIdByLectureNo,
    refresh: fetchOnce,
  }
}
