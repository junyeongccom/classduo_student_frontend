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
  fetchMyCourseState,
  type StudentCourseStateDto,
} from '@/shared/services/gamificationService'
import type { CoreTest, ExamPrepData } from '../types'
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

    const totalCoreTests = coreTests.length
    // masteredCount: isTestMastered === true 인 테스트 수
    // (모든 문항이 master 상태인 테스트에만 ★ 배지 + 여기서 카운트)
    // gamification.mastered_problem_count 는 개별 문항 카운트라 기준 불일치 → 미사용
    const masteredCount = coreTests.filter((t) => t.isTestMastered).length

    // 추천 학습 (2026-09 정책):
    //   1) 가장 최근에 응시(last_attempted_at)한 테스트가 있고 아직 미마스터면 → 그 테스트
    //   2) 없거나 그 테스트를 전부 마스터했으면 → 가장 오래된 회차(리스트 순 = lecture_no asc)의
    //      첫 미마스터 테스트 (아무것도 안 풀었으면 1주차 1차시부터)
    //   3) 전부 마스터면 첫 테스트 fallback
    const lastAttempted =
      [...coreTests]
        .filter((t) => t.lastAttemptedAt && t.status === 'available')
        .sort((a, b) => (b.lastAttemptedAt! > a.lastAttemptedAt! ? 1 : -1))[0] ?? null
    const oldestUnmastered =
      coreTests.find((t) => t.status === 'available' && !t.isTestMastered) ?? null
    const recommendedTest =
      (lastAttempted && !lastAttempted.isTestMastered ? lastAttempted : null) ??
      oldestUnmastered ??
      coreTests.find((t) => t.status === 'available') ??
      coreTests[0] ??
      null

    return {
      examDate: EXAM_DATE_ISO,
      ddays: computeDdaysToExam(),
      totalCoreTests,
      masteredCount,
      recommendedTest,
      coreTests,
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
