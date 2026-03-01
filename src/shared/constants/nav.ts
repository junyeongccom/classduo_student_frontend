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
} from 'lucide-react'

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
    id: 'my-quizzes',
    labelKey: 'newNav.myQuizzes',
    icon: HelpCircle,
    href: '/studyspace/my-quizzes',
    color: '#F97316',    // orange
  },
  {
    id: 'games',
    labelKey: 'newNav.games',
    icon: Puzzle,
    href: '/studyspace/games',
    color: '#22C55E',    // green
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


