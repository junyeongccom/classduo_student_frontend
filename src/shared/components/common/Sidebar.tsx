'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'
import { SIDEBAR_MENU, PROFILE_MENU } from '@/shared/constants/nav'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <aside className={cn(
      "group fixed left-0 top-0 z-40 h-screen border-r border-gray-200 bg-white transition-all duration-300",
      isCollapsed ? "w-[70px]" : "w-[120px]"
    )}>
      <div className="flex h-full flex-col">
        {/* 로고 + 토글 버튼 */}
        <div className="relative flex h-16 items-center justify-center">
          <Link href="/dashboard" className="flex items-center justify-center">
            {!isCollapsed && (
              <img src="/로고.png" alt="CLASSDUO" className="h-5 w-auto" />
            )}
          </Link>
          
          {/* 접기/펼치기 버튼 - 사이드바 오른쪽에서 튀어나옴 */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 rounded-full border border-gray-200 bg-white p-1 text-gray-400 opacity-0 shadow-sm transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        {/* 메인 메뉴 */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {SIDEBAR_MENU.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)

            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs transition-colors',
                  isActive
                    ? 'bg-gray-100 text-gray-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* 프로필 (하단) */}
        <div className="px-2 py-4">
          <Link
            href={PROFILE_MENU.href}
            className={cn(
              'flex flex-col items-center gap-1 rounded-lg px-2 py-3 text-xs transition-colors',
              pathname === PROFILE_MENU.href
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            )}
            title={isCollapsed ? PROFILE_MENU.label : undefined}
          >
            <PROFILE_MENU.icon className="h-5 w-5" />
            {!isCollapsed && <span>{PROFILE_MENU.label}</span>}
          </Link>
        </div>
      </div>
    </aside>
  )
}


