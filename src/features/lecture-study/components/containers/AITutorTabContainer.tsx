/**
 * @file AITutorTabContainer.tsx
 * @description AI 조교 탭 컨테이너 — 기존 ChatInterface 래핑
 * @module features/lecture-study/components/containers
 * @dependencies features/ai-tutor (ChatInterface 직접 import은 도메인 경계 위반이므로 placeholder)
 */

'use client'

import { Bot } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface AITutorTabContainerProps {
  lectureId: string
}

export function AITutorTabContainer({ lectureId }: AITutorTabContainerProps) {
  const t = useTranslations()

  // TODO: Task 430에서 ai-tutor ChatInterface를 shared로 승격하거나
  // lecture-study 전용 채팅 인터페이스를 구현
  // 현재는 lectureId를 단일로 전달하는 래퍼 placeholder
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
      <Bot className="h-10 w-10" />
      <p className="text-sm">{t('lectureStudy.rightPanel.placeholder')}</p>
      <p className="text-[11px] text-gray-300">lectureId: {lectureId.slice(0, 8)}...</p>
    </div>
  )
}
