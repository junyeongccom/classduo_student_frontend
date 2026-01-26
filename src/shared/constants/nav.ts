import { 
  Bot, 
  PenLine, 
  FileText,
  User
} from 'lucide-react'

/**
 * 사이드바 메뉴 아이템 정의
 */
export const SIDEBAR_MENU = [
  {
    id: 'ai-tutor',
    labelKey: 'nav.aiTutor',
    icon: Bot,
    href: '/studyspace/ai-tutor',
  },
  {
    id: 'review-50',
    labelKey: 'nav.review50',
    icon: PenLine,
    href: '/studyspace/review',
  },
  {
    id: 'exam',
    labelKey: 'nav.exam',
    icon: FileText,
    href: '/studyspace/exam',
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
  { id: 'answer', label: '답변', href: '/studyspace/ai-tutor' },
  { id: 'notes', label: '수업녹음본', href: '/studyspace/ai-tutor/notes' },
  { id: 'materials', label: '강의자료', href: '/studyspace/ai-tutor/materials' },
] as const


