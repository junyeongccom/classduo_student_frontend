/**
 * @file useExamPrepData.ts
 * @description 기말대비학습 메인 페이지 데이터 — useLectures + exam-prep API + gamification 결합
 * @module features/exam-prep-final/hooks
 * @dependencies useLectures, examPrepService, gamificationService
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import {
  fetchCoreTestsByCourse,
  type CoreTestSummaryDto,
} from '../services/examPrepService'
import {
  fetchMyCourseState,
  type StudentCourseStateDto,
} from '@/shared/services/gamificationService'
import type {
  CoreTest,
  CoreTestStatus,
  ExamPrepData,
  MidTest,
  FinalTest,
} from '../types'
import { SET_RANGES } from '../domain/testSetGroups'

/** 기말고사 일자 (하드코딩 — 추후 courses 테이블에 컬럼 추가) */
const HARDCODED_EXAM_DATE = '2026-06-22'

/** 오늘부터 target 까지 일수 */
function computeDdayToTarget(targetIso: string): number {
  const target = new Date(targetIso)
  if (Number.isNaN(target.getTime())) return 0
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = target.getTime() - today.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  return Math.max(0, days)
}

/** lecture 1 row → CoreTest 형태로 매핑 */
function lectureToCoreTest(args: {
  lecture: {
    id: string
    title: string | null
    lecture_number: number | null
    week_number: number | null
    session_number: number | null
    date: string | null
    has_content: boolean
    essence_7words: string | null
  }
  number: number  // 1-based 순번 (lectures 정렬 후 인덱스)
  totalCount: number  // 전체 lecture 수 — 동적 세트 분배에 사용
  apiTestId: string | null  // exam_prep_test.id (백엔드 매칭 결과)
  apiQuestionCount: number  // 백엔드 question_count (없으면 0)
}): CoreTest {
  const { lecture, number, totalCount, apiTestId, apiQuestionCount } = args
  // 동적 분배: lectures 수에 비례하여 3세트로 분할
  // 26개 정원 가정의 SET_RANGES 는 미사용 (실제 회차가 26개 미만/초과여도 균등 분배)
  // 예: 17개 → set1=6, set2=6, set3=5 / 26개 → set1=9, set2=9, set3=8
  const per = Math.ceil(totalCount / 3)
  const setNumber: 1 | 2 | 3 =
    number <= per ? 1 : number <= 2 * per ? 2 : 3

  // 정책 (Q2 답변 = B):
  // - has_content && api 문항 존재 → available
  // - has_content && api 문항 없음 → locked (백엔드 생성 미완료)
  // - has_content == false → locked
  let status: CoreTestStatus
  if (lecture.has_content && apiQuestionCount > 0) {
    status = 'available'
  } else {
    status = 'locked'
  }

  return {
    id: apiTestId ?? `lecture-${lecture.id}`,
    number,
    setNumber,
    weekNo: lecture.week_number ?? 0,
    sessionNo: lecture.session_number ?? 0,
    lectureTitle:
      lecture.title ??
      lecture.essence_7words ??
      `${lecture.week_number ?? 0}주차 ${lecture.session_number ?? 0}차시`,
    masteryLevel: 0,  // v1: mastery 데이터 없음
    status,
    metaCounts: {
      gray: status === 'locked' ? 0 : apiQuestionCount,
      cyan: 0,
      green: 0,
    },
  }
}

interface UseExamPrepDataResult {
  isLoading: boolean
  error: string | null
  refresh: () => void
  data: ExamPrepData | null
}

export function useExamPrepData(courseId: string): UseExamPrepDataResult {
  const locale = useLocale()
  const {
    lectures,
    isLoading: lecturesLoading,
    error: lecturesError,
    refresh: refreshLectures,
  } = useLectures(courseId)

  const [apiTests, setApiTests] = useState<CoreTestSummaryDto[]>([])
  const [apiTestsLoading, setApiTestsLoading] = useState(true)
  const [gamification, setGamification] = useState<StudentCourseStateDto | null>(
    null,
  )
  const [gamificationLoading, setGamificationLoading] = useState(true)

  // exam-prep core tests fetch
  useEffect(() => {
    let alive = true
    setApiTestsLoading(true)
    fetchCoreTestsByCourse(courseId).then(({ data, error }) => {
      if (!alive) return
      if (error) {
        // 404/500 등은 무시 (백엔드 미배포 단계 호환). lecture 메타로만 매핑.
        console.warn('[useExamPrepData] core-tests fetch failed:', error)
        setApiTests([])
      } else {
        setApiTests(data?.tests ?? [])
      }
      setApiTestsLoading(false)
    })
    return () => {
      alive = false
    }
  }, [courseId])

  // gamification state fetch
  useEffect(() => {
    let alive = true
    setGamificationLoading(true)
    fetchMyCourseState(courseId).then(({ data, error }) => {
      if (!alive) return
      if (error) {
        console.warn('[useExamPrepData] gamification fetch failed:', error)
        setGamification(null)
      } else {
        setGamification(data ?? null)
      }
      setGamificationLoading(false)
    })
    return () => {
      alive = false
    }
  }, [courseId])

  const data = useMemo<ExamPrepData | null>(() => {
    if (lectures.length === 0) return null

    // lectures 정렬 (lecture_no asc)
    const sortedLectures = [...lectures].sort((a, b) => {
      const an = a.lecture_number ?? 9999
      const bn = b.lecture_number ?? 9999
      return an - bn
    })

    // api test_id 매핑 (lecture_session_id 기준)
    const apiByLecture = new Map<string, CoreTestSummaryDto>()
    apiTests.forEach((t) => apiByLecture.set(t.lecture_session_id, t))

    // CoreTest 매핑 (lecture 수만큼 — totalCount 기반 동적 세트 분배)
    const total = sortedLectures.length
    const coreTests: CoreTest[] = sortedLectures.map((lec, i) => {
      const api = apiByLecture.get(lec.id)
      return lectureToCoreTest({
        lecture: lec,
        number: i + 1,
        totalCount: total,
        apiTestId: api?.test_id ?? null,
        apiQuestionCount: api?.question_count ?? 0,
      })
    })

    const totalCoreTests = coreTests.length
    // mastered count: gamification API 의 mastered_problem_count (Q4 답변)
    const masteredCount = gamification?.mastered_problem_count ?? 0

    // 추천 학습: "이어서 학습하기"와 동일 로직 (Q4 답변)
    // - has_content 회차 중 가장 최근 lecture_date
    const recommendedTest =
      [...coreTests]
        .filter((t) => t.status === 'available')
        .sort((a, b) => b.number - a.number)[0] ??
      coreTests.find((t) => t.status === 'available') ??
      coreTests[0] ??
      null

    // mid / final — v1 백엔드 미구현 → mock 유지 (Q3 답변 = A)
    const midTests: MidTest[] = [1, 2, 3].map((setNumber) => {
      const range = SET_RANGES[setNumber as 1 | 2 | 3]
      const totalCoreInSet = coreTests.filter(
        (t) => t.setNumber === setNumber,
      ).length
      return {
        setNumber: setNumber as 1 | 2 | 3,
        minutes: 15,
        questions: 20,
        totalCoreInSet: totalCoreInSet || range.end - range.start + 1,
        masteredCount: 0,  // v1 mastery 없음
        unlocked: false,
      }
    })

    const finalTest: FinalTest = {
      minutes: 15,
      questions: 20,
      unlocked: false,
      setMasterStates: [false, false, false],
    }

    return {
      examDate: HARDCODED_EXAM_DATE,
      ddays: computeDdayToTarget(HARDCODED_EXAM_DATE),
      totalCoreTests,
      masteredCount,
      recommendedTest,
      coreTests,
      midTests,
      finalTest,
    }
  // locale 변경 시 lectureTitle 등 재계산
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectures, apiTests, gamification, locale])

  const refresh = () => {
    refreshLectures()
    setApiTestsLoading(true)
    fetchCoreTestsByCourse(courseId).then(({ data, error }) => {
      if (!error) setApiTests(data?.tests ?? [])
      setApiTestsLoading(false)
    })
    setGamificationLoading(true)
    fetchMyCourseState(courseId).then(({ data }) => {
      setGamification(data ?? null)
      setGamificationLoading(false)
    })
  }

  return {
    isLoading: lecturesLoading || apiTestsLoading || gamificationLoading,
    error: lecturesError,
    refresh,
    data,
  }
}
