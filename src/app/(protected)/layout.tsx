'use client'

import { AuthGuard } from '@/features/auth'
import { MaintenanceNoticeModal } from '@/shared/components/common/MaintenanceNoticeModal'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <MaintenanceNoticeModal />
        {children}
      </div>
    </AuthGuard>
  )
}
