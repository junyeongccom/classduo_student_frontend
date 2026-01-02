'use client'

import { cn } from '@/shared/lib/utils'
import { Edit, Search } from 'lucide-react'

export type TabType = 'answer' | 'notes' | 'materials'

interface TopTabsProps {
  onNewChat?: () => void
  onOpenChatHistory?: () => void
  activeTab?: TabType
  onTabChange?: (tab: TabType) => void
  hasReferences?: boolean
}

const TABS: { id: TabType; label: string }[] = [
  { id: 'answer', label: '답변' },
  { id: 'notes', label: '수업녹음본' },
  { id: 'materials', label: '강의자료' },
]

export function TopTabs({ 
  onNewChat, 
  onOpenChatHistory,
  activeTab = 'answer',
  onTabChange,
  hasReferences = false
}: TopTabsProps) {

  const handleTabClick = (tabId: TabType) => {
    onTabChange?.(tabId)
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* 좌측: 아이콘 버튼들 + 탭 메뉴 */}
      <div className="flex items-center gap-24">
        <div className="flex items-center gap-2">
          <button 
            onClick={onNewChat}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="새 채팅"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button 
            onClick={onOpenChatHistory}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="채팅 기록 및 검색"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* 탭 메뉴 */}
        <nav className="flex items-center gap-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            // 수업녹음본/강의자료 탭은 참고자료가 있을 때만 활성화
            const isDisabled = (tab.id === 'notes' || tab.id === 'materials') && !hasReferences

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                disabled={isDisabled}
                className={cn(
                  'text-sm transition-colors',
                  isActive
                    ? 'text-gray-900 font-medium'
                    : isDisabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* 우측: 빈 공간 (필요시 다른 요소 추가 가능) */}
      <div></div>
    </header>
  )
}


