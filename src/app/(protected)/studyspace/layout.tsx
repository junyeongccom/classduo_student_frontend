'use client'

import { useState } from 'react'
import { Sidebar } from '@/shared/components/common'
import {
  StudyspaceLayoutProvider,
  useStudyspaceLayoutSlots,
} from '@/shared/components/layouts/studyspace'
import { PanelRightOpen, X } from 'lucide-react'

function StudyspaceLayoutShell({ children }: { children: React.ReactNode }) {
  const { topbar, rightbar } = useStudyspaceLayoutSlots()
  const [isMobileRightbarOpen, setIsMobileRightbarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />

      <div
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: 'var(--sidebar-width, 140px)' }}
      >
        <div className="grid h-full grid-cols-[1fr] grid-rows-[56px_1fr] xl:grid-cols-[1fr_320px]">
          {/* Top Bar (Header) - Spans full width */}
          <header className="col-span-full flex items-center justify-between border-b border-gray-100 bg-white px-6">
            <div className="flex h-full flex-1 items-center overflow-hidden">
              {topbar ?? null}
            </div>
            
            {/* Mobile Drawer Toggle */}
            <button
              onClick={() => setIsMobileRightbarOpen(true)}
              className="ml-4 flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 xl:hidden"
            >
              <PanelRightOpen className="h-5 w-5" />
            </button>
          </header>

          {/* Main Content Area */}
          <main className="flex min-h-0 flex-col overflow-hidden bg-white">
            <div className="flex h-full flex-col">
              {children}
            </div>
          </main>

          {/* Right Sidebar (Desktop) */}
          <aside className="hidden h-full min-h-0 w-[320px] flex-col border-l border-gray-200 bg-white xl:flex">
            <div className="flex-1 overflow-y-auto">
              {rightbar ?? null}
            </div>
          </aside>

          {/* Right Sidebar (Mobile Drawer) */}
          {isMobileRightbarOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm xl:hidden"
                onClick={() => setIsMobileRightbarOpen(false)}
              />
              
              {/* Drawer */}
              <aside className="fixed inset-y-0 right-0 z-50 flex w-[320px] flex-col bg-white shadow-xl transition-transform duration-300 xl:hidden">
                <div className="flex h-14 items-center justify-between border-b border-gray-100 px-4">
                  <span className="font-semibold text-gray-900">메뉴</span>
                  <button
                    onClick={() => setIsMobileRightbarOpen(false)}
                    className="rounded-md p-2 text-gray-500 hover:bg-gray-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {rightbar ?? null}
                </div>
              </aside>
            </>
          )}
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

