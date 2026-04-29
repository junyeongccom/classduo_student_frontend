/**
 * @file useCourseDashboard.ts
 * @description 과목 대시보드 데이터 집계 훅 — useLectures 위 layer
 * @module features/course-dashboard/hooks
 * @dependencies useLectures, computeCurrentWeek, computeDdayToExam, pickContinueLecture
 */

'use client'

import { useMemo } from 'react'
import { useLocale } from 'next-intl'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import { useCourses } from '@/features/home/hooks/useCourses'
import { formatTermLabel } from '@/features/home/domain/formatTermLabel'
import {
  computeCurrentWeek,
  computeDdayToExam,
  inferCurrentWeekFromLectures,
} from '../domain/computeWeekAndDday'
import { pickContinueLecture } from '../domain/pickContinueLecture'

interface UseCourseDashboardResult {
  isLoading: boolean
  error: string | null
  refresh: () => void
  courseTitle: string | null
  section: string | null
  professorName: string | null
  /** 학부대학 같은 학사 정보 — 향후 백엔드 응답에 추가되면 매핑 */
  faculty: string | null
  /** 학기 라벨 (예: "2026 1학기") */
  termLabel: string | null
  /** 현재 주차 (1-based). null이면 미정 */
  currentWeek: number | null
  /** 기말까지 D-day (양수, 일 단위). null이면 미정 */
  examDday: number | null
  /** "이어서 학습하기" 후보 회차 */
  continueLecture: ReturnType<typeof pickContinueLecture>
  /** 회차별 학습 카드 footer 용: 현재 활성 주차 (업로드 완료 표기) */
  uploadedWeek: number | null
  totalLectures: number
  activeLectures: number
}

/**
 * 임시 정책 (DB 컬럼 추가 전):
 * - termStart, examDate 는 백엔드 응답에 없음 → null 처리
 * - currentWeek 는 회차 데이터 + termStart로 계산
 * - examDday 는 임시로 null (사이드바 D-14 배지는 별도 하드코딩으로 표시)
 *   추후 courses 테이블에 term_start_date / exam_date 추가 후 연결
 */
export function useCourseDashboard(courseId: string): UseCourseDashboardResult {
  const locale = useLocale()
  const {
    lectures,
    courseTitle,
    section,
    professorName,
    isLoading,
    error,
    refresh,
  } = useLectures(courseId)

  // 학기 정보 (academic_term) 는 useLectures 응답에 없어서 useCourses 에서 가져온다
  const { courses } = useCourses()
  const matchedCourse = courses.find((c) => c.id === courseId)
  const termLabelComputed =
    matchedCourse?.academic_term
      ? formatTermLabel(matchedCourse.academic_term, locale)
      : null

  const data = useMemo(() => {
    // 학기 시작일: 회차 중 가장 빠른 lecture_date 를 fallback 으로 사용
    const termStart =
      lectures
        .map((l) => l.date)
        .filter((d): d is string => !!d)
        .sort()[0] ?? null

    const currentWeekFromDate = computeCurrentWeek(termStart)
    const currentWeekFromLectures = inferCurrentWeekFromLectures(lectures)
    // 데이터 기반 추정이 더 보수적 (활성 주차 max) — 두 값 중 작은 값 사용
    const currentWeek =
      currentWeekFromDate != null && currentWeekFromLectures != null
        ? Math.min(currentWeekFromDate, currentWeekFromLectures)
        : currentWeekFromDate ?? currentWeekFromLectures

    const continueLecture = pickContinueLecture(lectures)
    const uploadedWeek = inferCurrentWeekFromLectures(lectures)

    // 학기 라벨 — useCourses 에서 매칭한 academic_term 사용
    const termLabel = termLabelComputed

    // D-day — 임시 placeholder (백엔드 컬럼 추가 후 수정)
    const examDday: number | null = computeDdayToExam(null)

    const totalLectures = lectures.length
    const activeLectures = lectures.filter((l) => l.has_content).length

    return {
      currentWeek,
      examDday,
      continueLecture,
      uploadedWeek,
      termLabel,
      faculty: null as string | null,
      totalLectures,
      activeLectures,
    }
  }, [lectures, termLabelComputed])

  return {
    isLoading,
    error,
    refresh,
    courseTitle,
    section,
    professorName,
    ...data,
  }
}
