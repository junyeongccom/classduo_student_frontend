/**
 * @file groupCoursesByTerm.ts
 * @description 과목 목록을 학기별로 그룹핑하는 순수 함수
 * @module features/home/domain
 * @dependencies 없음
 */

import type { Course, CourseGroup, TermCode } from '../types'

/** term_code → 정렬 순서 (높을수록 최근 학기) */
const TERM_ORDER: Record<TermCode, number> = {
  SPRING: 1,
  SUMMER: 2,
  FALL: 3,
  WINTER: 4,
}

/**
 * 과목 목록을 학기별로 그룹핑
 * academic_term이 null인 과목은 "기타" 그룹에 최하단 배치
 */
export function groupCoursesByTerm(courses: Course[]): CourseGroup[] {
  const termMap = new Map<string, CourseGroup>()
  const etcCourses: Course[] = []

  for (const course of courses) {
    if (!course.academic_term) {
      etcCourses.push(course)
      continue
    }

    const key = course.academic_term.key
    if (!termMap.has(key)) {
      termMap.set(key, {
        term: course.academic_term,
        courses: [],
      })
    }
    termMap.get(key)!.courses.push(course)
  }

  // 학기 정렬: 연도 내림차순 → 학기 내림차순
  const groups = Array.from(termMap.values()).sort((a, b) => {
    const yearDiff = (b.term?.year ?? 0) - (a.term?.year ?? 0)
    if (yearDiff !== 0) return yearDiff
    return (TERM_ORDER[b.term?.termCode ?? 'SPRING'] ?? 0) - (TERM_ORDER[a.term?.termCode ?? 'SPRING'] ?? 0)
  })

  // "기타" 그룹은 최하단
  if (etcCourses.length > 0) {
    groups.push({
      term: null,
      courses: etcCourses,
    })
  }

  return groups
}
