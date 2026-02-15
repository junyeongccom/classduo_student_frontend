/**
 * @file groupCoursesByTerm.ts
 * @description 과목 목록을 학기별로 그룹핑하는 순수 함수
 * @module features/home/domain
 * @dependencies 없음
 */

import type { Course, CourseGroup } from '../types'

/**
 * 과목 목록을 학기별로 그룹핑
 * academic_term_id가 null인 과목은 "기타" 그룹에 최하단 배치
 */
export function groupCoursesByTerm(courses: Course[]): CourseGroup[] {
  const termMap = new Map<string, CourseGroup>()
  const etcCourses: Course[] = []

  for (const course of courses) {
    if (!course.academic_term_id || !course.academic_term) {
      etcCourses.push(course)
      continue
    }

    const termId = course.academic_term_id
    if (!termMap.has(termId)) {
      termMap.set(termId, {
        term: course.academic_term!,
        courses: [],
      })
    }
    termMap.get(termId)!.courses.push(course)
  }

  // 학기 정렬: 연도 내림차순, semester 내림차순
  const groups = Array.from(termMap.values()).sort((a, b) => {
    const yearDiff = (b.term?.year ?? 0) - (a.term?.year ?? 0)
    if (yearDiff !== 0) return yearDiff
    return (b.term?.semester ?? 0) - (a.term?.semester ?? 0)
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
