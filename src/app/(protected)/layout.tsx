'use client'

import { AuthGuard } from '@/features/auth'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      {/* dark: 변형이 없으면 다크 모드에서 이 래퍼가 흰색으로 남아,
          자식이 화면을 다 덮지 못하는 페이지(마이페이지 등)에서 본문이 통째로 밝게 보인다. */}
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {children}
      </div>
    </AuthGuard>
  )
}
