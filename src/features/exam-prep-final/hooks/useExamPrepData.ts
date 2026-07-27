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
  ExamPrepData,
  MidTest,
  FinalTest,
} from '../types'
import {
  buildCoreTestSlots,
  type CoreTestSlotLecture,
} from '../domain/buildCoreTestSlots'
import {
  EXAM_DATE_ISO,
  computeDdaysToExam,
} from '@/shared/constants/examPrep'

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

    // lecture_session_id → 회차 메타 (주차/차시/제목 표시용)
    const lectureById = new Map<string, CoreTestSlotLecture>()
    lectures.forEach((l) => lectureById.set(l.id, l))

    // 핵심테스트 슬롯 — 백엔드가 반환한 core 테스트를 1:1 로 그대로 노출한다.
    //   구 방식(고정 26슬롯 × coreTestLectureMap 회차 매핑)은 폐지.
    //   → 26개 상한이 사라져 core 테스트 29개인 운영 과목은 29개가 전부 나온다 (의도된 변화).
    //   → 같은 회차에 core 테스트가 여러 개인 과목도 전부 개별 슬롯으로 나온다.
    const coreTests: CoreTest[] = buildCoreTestSlots({
      tests: apiTests,
      lectureById,
      fallbackTitle: (week, session) =>
        t('examPrepFinal.weekSession', { week, session }),
    })

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

    // 전부 자유 풀이 정책: 핵심 순차 잠금 + 중간/최종 게이트 모두 해제(생성된 테스트는 항상 풀이 가능).
    //   문항 미생성(0문항) 슬롯만 '콘텐츠 없음'으로 locked 유지. (구 dev/prod 분기 폐지)
    const bypassLock = true

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
      } else if (bypassLock && apiItem?.test_id) {
        // dev/로컬: 백엔드가 shared mid 를 게이트(status='locked')해도 test_id 가 있으면(생성됨)
        // 강제 개방 — 생성된 mid 를 자유롭게 풀게.
        status = rawStatus === 'mastered' ? 'mastered' : 'available'
        unlocked = true
      } else {
        status = rawStatus === 'empty' ? 'mastered' : rawStatus
        unlocked = status === 'available' || status === 'mastered'
      }
      return {
        setNumber: set,
        minutes: 15,
        questions: 20,
        // 분모는 항상 실제 슬롯 수 — SET_RANGES 정원(8/10)으로 부풀리지 않는다.
        // (슬롯이 26개 미만인 과목에서 존재하지 않는 핵심테스트가 카운트되는 것 방지)
        totalCoreInSet,
        masteredCount: masteredCountInSet,
        unlocked,
        testId: apiItem?.test_id ?? null,
        status,
      }
    })

    // final — finalApi 의 status / test_id 를 병합. setMasterStates 는 mid 의 mastered
    // 여부에서 도출. 전부 자유 풀이: 생성(test_id)됐으면 backend 게이트 무관하게 개방.
    const rawFinalStatus = finalApi?.status ?? 'locked'
    const finalStatus =
      bypassLock && finalApi?.test_id
        ? rawFinalStatus === 'mastered'
          ? 'mastered'
          : 'available'
        : rawFinalStatus
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
