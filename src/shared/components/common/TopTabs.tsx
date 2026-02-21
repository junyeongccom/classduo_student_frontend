'use client'

import { cn } from '@/shared/lib/utils'
import { Edit, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'

export type TabType = 'answer' | 'notes' | 'materials'

interface TopTabsProps {
  onNewChat?: () => void
  onOpenChatHistory?: () => void
  activeTab?: TabType
  onTabChange?: (tab: TabType) => void
  hasReferences?: boolean
}

const TAB_IDS: TabType[] = ['answer', 'notes', 'materials']

export function TopTabs({
  onNewChat,
  onOpenChatHistory,
  activeTab = 'answer',
  onTabChange,
  hasReferences = false
}: TopTabsProps) {
  const t = useTranslations('aiTutorTopbar')

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
            title={t('newChat')}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={onOpenChatHistory}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title={t('chatHistorySearch')}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* 탭 메뉴 */}
        <nav className="flex items-center gap-6">
          {TAB_IDS.map((tabId) => {
            const isActive = activeTab === tabId
            const isDisabled = (tabId === 'notes' || tabId === 'materials') && !hasReferences

            return (
              <button
                key={tabId}
                onClick={() => handleTabClick(tabId)}
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
                {t(`tab.${tabId}`)}
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
