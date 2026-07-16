'use client'

import { Sidebar } from '@/shared/components/common'
import {
  StudyspaceLayoutProvider,
  useStudyspaceLayoutSlots,
} from '@/shared/components/layouts/studyspace'
import { useSidebarStore, SIDEBAR_WIDTH_COLLAPSED, SIDEBAR_WIDTH_EXPANDED } from '@/shared/store/useSidebarStore'
import { useNewStudyspace } from '@/shared/lib/featureFlags'

function MyPageLayoutShell({ children }: { children: React.ReactNode }) {
  const { topbar } = useStudyspaceLayoutSlots()
  const isNewUI = useNewStudyspace()
  const sidebarCollapsed = useSidebarStore((s) => s.isCollapsed)
  const isTablet = useSidebarStore((s) => s.isTablet)

  // NewUI: 동적 사이드바 너비, Legacy: 88px 고정
  const sidebarPx = isNewUI
    ? (isTablet ? SIDEBAR_WIDTH_COLLAPSED : (sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED))
    : 88

  return (
    <div className="flex h-dvh bg-gray-50 text-gray-900">
      <Sidebar />

      <div className="flex-1 transition-all duration-300">
        <div className="flex h-full flex-col">
          {/* 프로필 페이지는 topbar가 없으므로 header 제거 */}
          {topbar && (
            <header className="fixed left-0 top-0 z-40 flex h-14 w-full items-center justify-between border-b border-gray-100 bg-white px-6 text-gray-700">
              <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden">
                <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                  {topbar}
                </div>
              </div>
            </header>
          )}

          <div
            className={`flex flex-1 overflow-hidden ${topbar ? 'pt-14' : ''}`}
            style={{ paddingLeft: sidebarPx }}
          >
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white">
              <div className="flex h-full flex-col">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <StudyspaceLayoutProvider>
      <MyPageLayoutShell>{children}</MyPageLayoutShell>
    </StudyspaceLayoutProvider>
  )
}

