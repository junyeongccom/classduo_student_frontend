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
  CORE_TEST_TOTAL,
  getLectureNoForCoreTest,
} from '../domain/coreTestLectureMap'
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
  apiIsMastered: boolean  // 백엔드 is_mastered (test_user_state.mastered_at)
}): CoreTest {
  const { lecture, number, apiTestId, apiQuestionCount, apiIsMastered } = args
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
    isTestMastered: apiIsMastered,
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

    // lecture_no → Lecture 인덱스 (sortedLectures 대신)
    // CORE_TEST_TO_LECTURE_NO 매핑이 비선형(14·15회차 skip)이라 인덱스 매핑 불가
    const lectureByNo = new Map<number, (typeof lectures)[number]>()
    lectures.forEach((l) => {
      if (l.lecture_number != null) {
        lectureByNo.set(l.lecture_number, l)
      }
    })

    // api test_id 매핑 (lecture_session_id 기준)
    const apiByLecture = new Map<string, CoreTestSummaryDto>()
    apiTests.forEach((t) => apiByLecture.set(t.lecture_session_id, t))

    // 핵심테스트 26개 슬롯 — 각 슬롯은 매핑 테이블의 lecture_no 로 lookup
    //   1~12 → 2~13회차, 13~26 → 16~29회차 (1주차/14·15주차 제외)
    const coreTests: CoreTest[] = Array.from(
      { length: CORE_TEST_TOTAL },
      (_, i) => {
        const number = i + 1
        const targetLectureNo = getLectureNoForCoreTest(number)
        const lec =
          targetLectureNo != null ? lectureByNo.get(targetLectureNo) : undefined

        if (!lec) {
          // 매핑된 회차가 lectures 에 없음 → placeholder (locked)
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
            isTestMastered: false,
          }
        }
        const api = apiByLecture.get(lec.id)
        return lectureToCoreTest({
          lecture: lec,
          number,
          apiTestId: api?.test_id ?? null,
          apiQuestionCount: api?.question_count ?? 0,
          apiIsMastered: api?.is_mastered ?? false,
        })
      },
    )

    const totalCoreTests = coreTests.length
    // masteredCount: isTestMastered === true 인 테스트 수
    // (모든 문항이 master 상태인 테스트에만 ★ 배지 + 여기서 카운트)
    // gamification.mastered_problem_count 는 개별 문항 카운트라 기준 불일치 → 미사용
    const masteredCount = coreTests.filter((t) => t.isTestMastered).length

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
