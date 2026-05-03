/**
 * @file groupQuizzes.ts
 * @description 퀴즈를 quiz_type별로 그룹화하는 순수 함수
 * @module features/my-quiz/domain
 * @dependencies types
 */

import type { StudentQuizType } from '@/shared/components/quiz'
import { TYPE_ORDER } from '../types'
import type { QuizSource } from '../types'

export interface QuizWithMeta {
  quiz_id: string
  quiz_type: StudentQuizType
  quiz_source: QuizSource
  lecture_id?: string
  question: string
  answer: string | null
  explanation: string | null
  difficulty: string | null
  choices: {
    choice_id: string
    choice_order: number
    choice_text: string
    is_correct: boolean
    choice_explanation: string | null
    choice_text_eng?: string | null
    choice_explanation_eng?: string | null
  }[]
  bookmark: boolean
  correct: boolean | null
  selected_answer: number | null
  created_at?: string
  /** 영어 번역 (한/영 토글용) */
  question_eng?: string | null
  answer_eng?: string | null
  explanation_eng?: string | null
  /** 3단 그룹핑용 메타 */
  course_id?: string
  course_name?: string
  lecture_name?: string
}

export interface QuizGroup {
  type: StudentQuizType
  items: QuizWithMeta[]
}

/**
 * quiz_type별 TYPE_ORDER 순 그룹화.
 * 동일 유형 내 instructor 먼저 → customize 순, 동일 source 내 created_at 최신순.
 */
export function groupQuizzesByType(quizzes: QuizWithMeta[]): QuizGroup[] {
  return TYPE_ORDER
    .map(type => ({
      type,
      items: quizzes
        .filter(q => q.quiz_type === type)
        .sort((a, b) => {
          if (a.quiz_source !== b.quiz_source) {
            const order: Record<string, number> = { instructor: 0, content: 1, customize: 2 }
            return (order[a.quiz_source] ?? 9) - (order[b.quiz_source] ?? 9)
          }
          // 동일 source 내 created_at 최신순
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          }
          return 0
        }),
    }))
    .filter(g => g.items.length > 0)
}

export interface LectureGroup {
  lecture_id: string
  lecture_name: string
  typeGroups: QuizGroup[]
}

export interface CourseGroup {
  course_id: string
  course_name: string
  lectureGroups: LectureGroup[]
}

/**
 * 강좌 → 회차 → 유형 3단 그룹핑.
 */
export function groupQuizzesByCourseAndLecture(quizzes: QuizWithMeta[]): CourseGroup[] {
  const courseMap = new Map<string, { name: string; lectureMap: Map<string, { name: string; quizzes: QuizWithMeta[] }> }>()

  for (const quiz of quizzes) {
    const cid = quiz.course_id ?? 'unknown'
    const cname = quiz.course_name ?? cid
    const lid = quiz.lecture_id ?? 'unknown'
    const lname = quiz.lecture_name ?? lid

    if (!courseMap.has(cid)) {
      courseMap.set(cid, { name: cname, lectureMap: new Map() })
    }
    const course = courseMap.get(cid)!
    if (!course.lectureMap.has(lid)) {
      course.lectureMap.set(lid, { name: lname, quizzes: [] })
    }
    course.lectureMap.get(lid)!.quizzes.push(quiz)
  }

  const result: CourseGroup[] = []
  for (const [courseId, courseData] of courseMap) {
    const lectureGroups: LectureGroup[] = []
    for (const [lectureId, lectureData] of courseData.lectureMap) {
      const typeGroups = groupQuizzesByType(lectureData.quizzes)
      if (typeGroups.length > 0) {
        lectureGroups.push({ lecture_id: lectureId, lecture_name: lectureData.name, typeGroups })
      }
    }
    if (lectureGroups.length > 0) {
      result.push({ course_id: courseId, course_name: courseData.name, lectureGroups })
    }
  }

  return result
}
