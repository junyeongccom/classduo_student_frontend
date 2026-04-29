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
import {
  EXAM_DATE_ISO,
  computeDdaysToExam,
} from '@/shared/constants/examPrep'

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
  number: number  // 1~26 (SET_RANGES 기반 고정)
  apiTestId: string | null  // exam_prep_test.id (백엔드 매칭 결과)
  apiQuestionCount: number  // 백엔드 question_count (없으면 0)
}): CoreTest {
  const { lecture, number, apiTestId, apiQuestionCount } = args
  // 26개 정원 고정 분배 (set1=9, set2=9, set3=8) — SET_RANGES 기준
  const setNumber: 1 | 2 | 3 =
    number <= SET_RANGES[1].end ? 1 : number <= SET_RANGES[2].end ? 2 : 3

  // 정책 (Q2 답변 = B 의 완화):
  // - apiQuestionCount > 0 (핵심테스트 문항 존재) → available
  // - 그 외 → locked (백엔드 핵심테스트 미생성)
  // has_content(=lecture 콘텐츠 파이프라인 완료) 조건은 제거 — 사용자가 임의로 매핑한
  // 핵심테스트도 풀이 가능해야 하므로 문항 존재 여부로만 판단.
  const status: CoreTestStatus =
    apiQuestionCount > 0 ? 'available' : 'locked'

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

    // 핵심테스트는 26개 슬롯 고정 — 사용자가 추후 lectures 와 1:1 매핑 예정
    // lectures 가 26개 미만이면 부족분은 placeholder(빈 슬롯, locked)로 채움
    const FIXED_TOTAL = 26
    const coreTests: CoreTest[] = Array.from({ length: FIXED_TOTAL }, (_, i) => {
      const number = i + 1
      const lec = sortedLectures[i]
      if (!lec) {
        // placeholder — 매핑된 lecture 없음
        const setNumber: 1 | 2 | 3 =
          number <= SET_RANGES[1].end
            ? 1
            : number <= SET_RANGES[2].end
              ? 2
              : 3
        return {
          id: `placeholder-${number}`,
          number,
          setNumber,
          weekNo: 0,
          sessionNo: 0,
          lectureTitle: '',
          masteryLevel: 0,
          status: 'locked' as const,
          metaCounts: { gray: 0, cyan: 0, green: 0 },
        }
      }
      const api = apiByLecture.get(lec.id)
      return lectureToCoreTest({
        lecture: lec,
        number,
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
      examDate: EXAM_DATE_ISO,
      ddays: computeDdaysToExam(),
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
