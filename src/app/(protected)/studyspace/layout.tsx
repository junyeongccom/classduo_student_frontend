'use client'

import { Sidebar } from '@/shared/components/common'
import {
  StudyspaceLayoutProvider,
  useStudyspaceLayoutSlots,
} from '@/shared/components/layouts/studyspace'

function StudyspaceLayoutShell({ children }: { children: React.ReactNode }) {
  const { topbar, rightbar } = useStudyspaceLayoutSlots()

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-width, 140px)' }}
      >
        <div className="flex h-full">
          <main className="flex flex-1 flex-col bg-white">
            <div className="h-14 border-b border-gray-100 bg-white px-6">
              <div className="flex h-full items-center">
                {topbar ?? null}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="flex h-full flex-col bg-white">
                {children}
              </div>
            </div>
          </main>

          <aside className="hidden xl:flex flex-none w-[320px] border-l border-gray-200 bg-white transition-[width] duration-300">
            <div className="h-full w-full overflow-y-auto">
              {rightbar ?? null}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default function StudyspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StudyspaceLayoutProvider>
      <StudyspaceLayoutShell>{children}</StudyspaceLayoutShell>
    </StudyspaceLayoutProvider>
  )
}

