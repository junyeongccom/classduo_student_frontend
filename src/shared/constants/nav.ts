import {
  Bot,
  PenLine,
  FileText,
  User,
  Home,
  Repeat,
  LayoutGrid,
  HelpCircle,
  Puzzle,
  MessageSquare,
  BookMarked,
  Leaf,
  MessageCircle,
  Bookmark,
  PencilLine,
  ClipboardList,
} from 'lucide-react'

import type { ComponentType, SVGProps } from 'react'

export type CourseMenuId =
  | 'course-dashboard'
  | 'lecture-study'
  | 'exam-prep'
  | 'course-dialogue'
  | 'my-quizzes'
  | 'create-question'
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
 * 사이드바 메뉴 아이템 정의
 */
export const SIDEBAR_MENU = [
  {
    id: 'home',
    labelKey: 'nav.home',
    icon: Home,
    href: '/studyspace/home',
  },
  {
    id: 'ai-tutor',
    labelKey: 'nav.aiTutor',
    icon: Bot,
    href: '/studyspace/feedback',
  },
  {
    id: 'smart-review',
    labelKey: 'nav.smartReview',
    icon: PenLine,
    href: '/studyspace/games',
  },
  {
    id: 'exam',
    labelKey: 'nav.exam',
    icon: FileText,
    href: '/studyspace/my-quizzes',
  },
  {
    id: 'repeat',
    labelKey: 'nav.repeat',
    icon: Repeat,
    href: '/studyspace/repeat',
  },
] as const

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
    href: '/studyspace/feedback',
    color: '#7C3AED',    // violet
  },
] as const

/**
 * 과목 컨텍스트 사이드바 메뉴 — `/studyspace/course/[id]/...` 진입 시 표시
 *
 * course 그룹 순서: 대시보드 → 기말대비 → 회차별 → 대화형
 * resources 그룹 순서: 문제만들기 → 내 퀴즈 저장소
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
    id: 'create-question',
    labelKey: 'courseNav.createQuestion',
    icon: PencilLine,
    hrefFor: (id) => `/studyspace/course/${id}/my-quizzes?tab=create`,
    matchFor: (id) => `/studyspace/course/${id}/my-quizzes?tab=create`,
    color: '#22C55E',
    group: 'resources',
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

/**
 * 프로필 메뉴 (사이드바 하단)
 */
export const PROFILE_MENU = {
  id: 'profile',
  labelKey: 'nav.profile',
  icon: User,
  href: '/mypage',
} as const

/**
 * 상단 탭 메뉴 (AI 튜터 내부)
 */
export const TOP_TABS = [
  { id: 'answer', label: '답변', href: '/studyspace/feedback' },
  { id: 'notes', label: '수업녹음본', href: '/studyspace/feedback/notes' },
  { id: 'materials', label: '강의자료', href: '/studyspace/feedback/materials' },
] as const


