'use client'

import { AuthGuard } from '@/features/auth'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        {children}
      </div>
    </AuthGuard>
  )
}
