/**
 * @file AITutorTabContainer.tsx
 * @description AI 조교 탭 컨테이너 — ChatInterface를 래핑하여 단일 회차 채팅 제공
 * @module features/lecture-study/components/containers
 * @dependencies features/ai-tutor (ChatInterface)
 */

'use client'

import { useMemo, useState } from 'react'
import { ChatInterface } from '@/features/ai-tutor'

interface AITutorTabContainerProps {
  lectureId: string
}

export function AITutorTabContainer({ lectureId }: AITutorTabContainerProps) {
  const selectedLectureIds = useMemo(() => [lectureId], [lectureId])
  const [sessionId, setSessionId] = useState<string | undefined>(undefined)

  return (
    <div className="flex h-full flex-col">
      <ChatInterface
        selectedLectureIds={selectedLectureIds}
        sessionId={sessionId}
        onSessionCreated={setSessionId}
      />
    </div>
  )
}
