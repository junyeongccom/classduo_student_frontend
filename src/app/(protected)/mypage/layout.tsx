'use client'

import { Sidebar } from '@/shared/components/common'
import { LanguageToggle } from '@/shared/components/common/LanguageToggle'
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
          <header className="fixed left-0 top-0 z-40 flex h-14 w-full items-center justify-between border-b border-gray-100 bg-white px-6 text-gray-700">
            <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden">
              <LanguageToggle size="sm" />
              <div className="flex min-w-0 flex-1 items-center overflow-hidden">
                {topbar ?? null}
              </div>
            </div>
          </header>

          <div className="flex flex-1 overflow-hidden pt-14">
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

