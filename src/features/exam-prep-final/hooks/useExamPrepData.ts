/**
 * @file useExamPrepData.ts
 * @description 기말대비학습 메인 페이지 데이터 — useLectures + exam-prep API + gamification 결합
 * @module features/exam-prep-final/hooks
 * @dependencies useLectures, examPrepService, gamificationService
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import {
  fetchCoreTestsByCourse,
  type CoreTestSummaryDto,
} from '../services/examPrepService'
import {
  getFinalTest,
  getMidTests,
  type FinalTestMetaDto,
  type MidTestListResponseDto,
} from '../services/midFinalService'
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

/** dev 사이트(dev-*)/localhost 는 기말대비 sequential 잠금을 우회(생성된 테스트 자유 풀이),
 *  prod 는 정상 게이트 유지. course-dashboard 의 examPrepUnlock 와 동일 정책(도메인 분리상 로컬 복제). */
function isDevOrLocalHost(): boolean {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname
  return host === 'localhost' || host.startsWith('127.') || host.startsWith('dev-')
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
  number: number  // 1~26 (SET_RANGES 기반 고정)
  apiTestId: string | null  // exam_prep_test.id (백엔드 매칭 결과)
  apiQuestionCount: number  // 백엔드 question_count (없으면 0)
  apiIsMastered: boolean  // 백엔드 is_mastered (test_user_state.mastered_at)
  /** locale-aware fallback 생성용 — '{week}주차 {session}차시' / 'W{week} S{session}' */
  fallbackTitle: (week: number, session: number) => string
}): CoreTest {
  const { lecture, number, apiTestId, apiQuestionCount, apiIsMastered, fallbackTitle } = args
  // 26개 정원 고정 분배 (set1=9, set2=9, set3=8) — SET_RANGES 기준
  const setNumber: 1 | 2 | 3 =
    number <= SET_RANGES[1].end ? 1 : number <= SET_RANGES[2].end ? 2 : 3

  // 1차 status — 백엔드 문항 존재 여부만 반영. 최종 status 는 useMemo 내 sequential
  // 잠금 패스(직전 핵심 master 여부)로 재계산되므로, 여기서는 "후보 available" 의미.
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
      fallbackTitle(lecture.week_number ?? 0, lecture.session_number ?? 0),
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
  const t = useTranslations()
  const {
    lectures,
    isLoading: lecturesLoading,
    error: lecturesError,
    refresh: refreshLectures,
  } = useLectures(courseId)

  const [apiTests, setApiTests] = useState<CoreTestSummaryDto[]>([])
  const [apiTestsLoading, setApiTestsLoading] = useState(true)
  const [midApi, setMidApi] = useState<MidTestListResponseDto | null>(null)
  const [finalApi, setFinalApi] = useState<FinalTestMetaDto | null>(null)
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

  // mid / final tests fetch — MidTestBox·FinalTestPanel 잠금 해제 + testId 라우팅 +
  // 디버그 트리거의 점/스피너/숨김 분기 입력 (b2b20260430).
  useEffect(() => {
    let alive = true
    Promise.all([getMidTests(courseId), getFinalTest(courseId)]).then(
      ([midResult, finalResult]) => {
        if (!alive) return
        if (midResult.error) {
          console.warn('[useExamPrepData] mid-tests fetch failed:', midResult.error)
          setMidApi(null)
        } else {
          setMidApi(midResult.data ?? null)
        }
        if (finalResult.error) {
          console.warn(
            '[useExamPrepData] final-test fetch failed:',
            finalResult.error,
          )
          setFinalApi(null)
        } else {
          setFinalApi(finalResult.data ?? null)
        }
      },
    )
    return () => {
      alive = false
    }
  }, [courseId])

  // 생성 중(generating) 인 mid/final 이 있으면 5초 간격 폴링 — status 가 available/
  // mastered/failed 로 전환되면 자동 종료. 디버그 트리거 클릭 후 backend 워커 완료
  // (~30~120s) 시점을 자동 감지해 UI 갱신.
  useEffect(() => {
    const hasGenerating =
      (midApi?.items ?? []).some((i) => i.status === 'generating') ||
      finalApi?.status === 'generating'
    if (!hasGenerating) return
    let alive = true
    const id = setInterval(() => {
      if (!alive) return
      getMidTests(courseId).then(({ data, error }) => {
        if (!alive) return
        if (!error) setMidApi(data ?? null)
      })
      getFinalTest(courseId).then(({ data, error }) => {
        if (!alive) return
        if (!error) setFinalApi(data ?? null)
      })
    }, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [midApi, finalApi, courseId])

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
          fallbackTitle: (week, session) =>
            t('examPrepFinal.weekSession', { week, session }),
        })
      },
    )

    // mid api 매핑 — sequential 잠금 패스 보다 먼저 빌드 (set 경계 mid master 검사용)
    type MidApiItem = NonNullable<typeof midApi>['items'][number]
    const midApiBySegment = new Map<number, MidApiItem>()
    if (midApi?.items) {
      for (const item of midApi.items) {
        midApiBySegment.set(item.segment_index, item)
      }
    }
    // 세트 완성 검사 — frontend 자체 정책 (backend mid placeholder 가 잘못 만들어진 케이스 방어).
    //   세트 N 의 모든 핵심테스트가 isTestMastered=true 일 때만 mid 활성/master 가능.
    //   레거시 데이터 (master 0건인데 mid placeholder 가 미리 만들어진 경우) 차단.
    const isSetComplete = (setNumber: 1 | 2 | 3): boolean => {
      const totalCoreInSet = coreTests.filter((t) => t.setNumber === setNumber).length
      const masteredCountInSet = coreTests.filter(
        (t) => t.setNumber === setNumber && t.isTestMastered,
      ).length
      return totalCoreInSet > 0 && masteredCountInSet === totalCoreInSet
    }
    // 'empty' (오답 0건이라 빈 mid) 는 "복습할 게 없을 만큼 잘 풀었다"로 간주하여 master 동급 처리.
    // 단 세트 완성(모든 핵심 master) 조건도 함께 충족해야 함.
    const isMidMastered = (setNumber: 1 | 2 | 3): boolean => {
      if (!isSetComplete(setNumber)) return false
      const s = midApiBySegment.get(setNumber)?.status
      return s === 'mastered' || s === 'empty'
    }

    // dev/로컬은 sequential 잠금 + mid 게이트를 우회 — 생성된 테스트 전부 자유 풀이. prod 는 정상 게이트.
    const bypassLock = isDevOrLocalHost()

    // ─── 핵심테스트 sequential 잠금 정책 (b2c20260503 + set 경계 강화) ───
    //   1번: 항상 시작점 (단, 백엔드 문항 미생성이면 자동 locked)
    //   같은 set 내 N번(>1): 직전 핵심테스트(N-1) master 시 unlock
    //   set 경계 첫 핵심(예: 핵심10/19): 직전 핵심 master + 직전 set 의 중간테스트 master 추가 조건
    //   apiQuestionCount === 0 인 슬롯(placeholder/문항 미생성)은 그대로 locked 유지
    //   체인이 한 번 끊기면(이전이 master 미달이거나 mid 미달) 그 뒤로는 모두 locked
    for (let i = 1; i < coreTests.length; i++) {
      const t = coreTests[i]
      if (t.status === 'locked') continue  // 이미 백엔드 미생성으로 locked
      const prev = coreTests[i - 1]
      let allowed = prev.isTestMastered
      // set 경계 검사: 직전 핵심과 set 이 다르면 직전 set 의 mid 도 master 여야 함
      if (allowed && t.setNumber !== prev.setNumber) {
        if (!isMidMastered(prev.setNumber)) {
          allowed = false
        }
      }
      if (!allowed && !bypassLock) {
        coreTests[i] = {
          ...t,
          status: 'locked',
          metaCounts: { ...t.metaCounts, gray: 0 },
        }
      }
    }

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

    // mid — b2b20260430 백엔드 연동. midApi.items 의 status / test_id 를 병합.
    //   unlocked = status ∈ {available, mastered, empty}
    //   masteredCount = 해당 setNumber 의 isTestMastered=true 핵심테스트 개수
    //   'empty' 정책 (b2c20260503): 오답 0건이라 빈 mid 가 publish 된 경우 → 자동 mastered 동급.
    //     "복습할 게 없을 만큼 잘 풀었음" 으로 처리하여 다음 set 의 첫 핵심을 unlock 시킨다.

    const midTests: MidTest[] = [1, 2, 3].map((setNumber) => {
      const set = setNumber as 1 | 2 | 3
      const range = SET_RANGES[set]
      const totalCoreInSet = coreTests.filter(
        (t) => t.setNumber === set,
      ).length
      const masteredCountInSet = coreTests.filter(
        (t) => t.setNumber === set && t.isTestMastered,
      ).length
      const apiItem = midApiBySegment.get(set)
      const rawStatus = apiItem?.status ?? 'locked'
      // 1) 세트 미완성 → backend status 무관하게 무조건 lock (레거시 mid placeholder 방어)
      // 2) 세트 완성 → backend status 사용 (단 'empty' → 'mastered' 변환)
      let status: typeof rawStatus
      let unlocked: boolean
      if (!isSetComplete(set) && !bypassLock) {
        status = 'locked'
        unlocked = false
      } else {
        status = rawStatus === 'empty' ? 'mastered' : rawStatus
        unlocked = status === 'available' || status === 'mastered'
      }
      return {
        setNumber: set,
        minutes: 15,
        questions: 20,
        totalCoreInSet: totalCoreInSet || range.end - range.start + 1,
        masteredCount: masteredCountInSet,
        unlocked,
        testId: apiItem?.test_id ?? null,
        status,
      }
    })

    // final — finalApi 의 status / test_id 를 병합. setMasterStates 는 mid 의 mastered
    // 여부에서 도출.
    const finalStatus = finalApi?.status ?? 'locked'
    const finalUnlocked =
      finalStatus === 'available' || finalStatus === 'mastered'
    // 'empty' 도 mastered 동급 처리 (위 isMidMastered 와 동일 정책)
    const setMasterStates: [boolean, boolean, boolean] = [
      isMidMastered(1),
      isMidMastered(2),
      isMidMastered(3),
    ]
    const finalTest: FinalTest = {
      minutes: 15,
      questions: 20,
      unlocked: finalUnlocked,
      setMasterStates,
      testId: finalApi?.test_id ?? null,
      status: finalStatus,
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
  }, [lectures, apiTests, midApi, finalApi, gamification, locale])

  const refresh = () => {
    refreshLectures()
    setApiTestsLoading(true)
    fetchCoreTestsByCourse(courseId).then(({ data, error }) => {
      if (!error) setApiTests(data?.tests ?? [])
      setApiTestsLoading(false)
    })
    getMidTests(courseId).then(({ data, error }) => {
      if (!error) setMidApi(data ?? null)
    })
    getFinalTest(courseId).then(({ data, error }) => {
      if (!error) setFinalApi(data ?? null)
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
