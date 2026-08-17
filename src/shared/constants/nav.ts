import {
  Home,
  LayoutGrid,
  MessageSquare,
  Leaf,
  MessageCircle,
  Bookmark,
  ClipboardList,
} from 'lucide-react'

import type { ComponentType, SVGProps } from 'react'

export type CourseMenuId =
  | 'course-dashboard'
  | 'lecture-study'
  | 'exam-prep'
  | 'course-dialogue'
  | 'my-quizzes'
  | 'home'
  | 'feedback'

export interface CourseMenuItem {
  id: CourseMenuId
  labelKey: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  /** SVG 아이콘 대신 사용할 이미지 src (있으면 우선). public/ 기준 절대 경로 */
  iconSrc?: string
  /** href 빌더 — courseId 주입 */
  hrefFor: (courseId: string) => string
  /** active 매칭 패턴 빌더 */
  matchFor: (courseId: string) => string
  color: string
  /** 그룹 (siderbar 섹션 라벨) */
  group: 'course' | 'resources' | 'global'
  /** 특수 액션 (예: feedback modal trigger) */
  action?: 'feedback-modal'
}

/**
 * 새 UI 사이드바 메뉴
 */
export const NEW_SIDEBAR_MENU = [
  {
    id: 'home',
    labelKey: 'newNav.classes',
    icon: LayoutGrid,
    href: '/studyspace/home',
    color: '#3B82F6',    // blue
  },
  {
    id: 'feedback',
    labelKey: 'newNav.feedback',
    icon: MessageSquare,
    // 클릭 시 preventDefault + 개선요청 모달. href 는 폴백(새 탭/미들클릭)용.
    href: '/studyspace/home',
    color: '#7C3AED',    // violet
  },
] as const

/**
 * 과목 컨텍스트 사이드바 메뉴 — `/studyspace/course/[id]/...` 진입 시 표시
 *
 * course 그룹 순서: 대시보드 → 기말대비 → 회차별 → 대화형
 * resources 그룹: 내 퀴즈 저장소
 */
export const COURSE_SIDEBAR_MENU: readonly CourseMenuItem[] = [
  {
    id: 'course-dashboard',
    labelKey: 'courseNav.dashboard',
    icon: LayoutGrid,
    hrefFor: (id) => `/studyspace/course/${id}`,
    matchFor: (id) => `/studyspace/course/${id}`,
    color: '#6366F1',
    group: 'course',
  },
  {
    id: 'exam-prep',
    labelKey: 'courseNav.examPrep',
    // 다른 메뉴 아이콘과 동일한 SVG 라인 스타일/색을 쓰도록 lucide 아이콘 사용 (기존 PNG는 색이 진했음)
    icon: ClipboardList,
    hrefFor: (id) => `/studyspace/course/${id}/exam-prep`,
    matchFor: (id) => `/studyspace/course/${id}/exam-prep`,
    color: '#7C3AED',
    group: 'course',
  },
  {
    id: 'lecture-study',
    labelKey: 'courseNav.lectureStudy',
    icon: Leaf,
    hrefFor: (id) => `/studyspace/course/${id}/lectures`,
    matchFor: (id) => `/studyspace/course/${id}/lectures`,
    color: '#8B5CF6',
    group: 'course',
  },
  {
    id: 'course-dialogue',
    labelKey: 'courseNav.dialogue',
    icon: MessageCircle,
    hrefFor: (id) => `/studyspace/course/${id}/dialogue`,
    matchFor: (id) => `/studyspace/course/${id}/dialogue`,
    color: '#7C3AED',
    group: 'course',
  },
  {
    id: 'my-quizzes',
    labelKey: 'courseNav.myQuizzes',
    icon: Bookmark,
    hrefFor: (id) => `/studyspace/course/${id}/my-quizzes`,
    matchFor: (id) => `/studyspace/course/${id}/my-quizzes`,
    color: '#F97316',
    group: 'resources',
  },
  {
    id: 'home',
    labelKey: 'courseNav.home',
    icon: Home,
    hrefFor: () => `/studyspace/home`,
    matchFor: () => `/studyspace/home`,
    color: '#6B7280',
    group: 'global',
  },
  {
    id: 'feedback',
    labelKey: 'courseNav.feedback',
    icon: MessageSquare,
    hrefFor: () => `/studyspace/home`,
    matchFor: () => `__feedback_modal__`,
    color: '#6B7280',
    group: 'global',
    action: 'feedback-modal',
  },
] as const
