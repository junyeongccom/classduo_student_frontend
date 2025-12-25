'use client'

import { TopTabs } from '@/shared/components/common'

export default function AITutorPage() {
  return (
    <div className="flex h-screen flex-col">
      {/* 상단 탭 */}
      <TopTabs />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 p-6">
        <div className="flex h-full items-center justify-center text-gray-400">
          AI 튜터 - 답변 페이지
        </div>
      </div>
    </div>
  )
}


