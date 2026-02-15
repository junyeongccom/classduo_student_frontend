/**
 * @file RightPanelPlaceholder.tsx
 * @description 우측 패널 탭별 Placeholder UI
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react
 */

import { BookOpen, HelpCircle, Gamepad2, Bot } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { LectureStudyTab } from '../../types'

const TAB_ICONS: Record<LectureStudyTab, typeof BookOpen> = {
  summary: BookOpen,
  quiz: HelpCircle,
  game: Gamepad2,
  'ai-tutor': Bot,
}

interface RightPanelPlaceholderProps {
  tab: LectureStudyTab
}

export function RightPanelPlaceholder({ tab }: RightPanelPlaceholderProps) {
  const t = useTranslations()
  const Icon = TAB_ICONS[tab]

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
      <Icon className="h-10 w-10" />
      <p className="text-sm">{t('lectureStudy.rightPanel.placeholder')}</p>
    </div>
  )
}
