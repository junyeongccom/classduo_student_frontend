'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'
import { TOP_TABS } from '@/shared/constants/nav'
import { Edit, Search } from 'lucide-react'

interface TopTabsProps {
  onNewChat?: () => void
  onOpenChatHistory?: () => void
}

export function TopTabs({ onNewChat, onOpenChatHistory }: TopTabsProps) {
  const pathname = usePathname()

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
          {TOP_TABS.map((tab) => {
            const isActive = pathname === tab.href

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  'text-sm transition-colors',
                  isActive
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* 우측: 빈 공간 (필요시 다른 요소 추가 가능) */}
      <div></div>
    </header>
  )
}


