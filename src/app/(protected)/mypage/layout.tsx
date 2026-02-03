'use client'

import { Sidebar } from '@/shared/components/common'
import {
  StudyspaceLayoutProvider,
  useStudyspaceLayoutSlots,
} from '@/shared/components/layouts/studyspace'

function MyPageLayoutShell({ children }: { children: React.ReactNode }) {
  const { topbar } = useStudyspaceLayoutSlots()

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
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

          <div className={`flex flex-1 overflow-hidden pl-[88px] ${topbar ? 'pt-14' : ''}`}>
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

