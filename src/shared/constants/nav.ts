import { 
  Bot, 
  PenLine, 
  MessageCircle, 
  Sparkles, 
  FileText,
  User
} from 'lucide-react'

/**
 * 사이드바 메뉴 아이템 정의
 */
export const SIDEBAR_MENU = [
  {
    id: 'ai-tutor',
    label: 'AI 튜터',
    icon: Bot,
    href: '/dashboard/ai-tutor',
  },
  {
    id: 'review-50',
    label: '50초 복습',
    icon: PenLine,
    href: '/dashboard/review',
  },
  {
    id: 'preview-50',
    label: '50초 예습',
    icon: MessageCircle,
    href: '/dashboard/preview',
  },
  {
    id: 'assignment',
    label: '과제 보조',
    icon: Sparkles,
    href: '/dashboard/assignment',
  },
  {
    id: 'exam',
    label: '시험 준비',
    icon: FileText,
    href: '/dashboard/exam',
  },
] as const

/**
 * 프로필 메뉴 (사이드바 하단)
 */
export const PROFILE_MENU = {
  id: 'profile',
  label: '프로필',
  icon: User,
  href: '/mypage',
} as const

/**
 * 상단 탭 메뉴 (AI 튜터 내부)
 */
export const TOP_TABS = [
  { id: 'answer', label: '답변', href: '/dashboard/ai-tutor' },
  { id: 'notes', label: '수업노트', href: '/dashboard/ai-tutor/notes' },
  { id: 'materials', label: '강의자료', href: '/dashboard/ai-tutor/materials' },
] as const


