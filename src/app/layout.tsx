import type { Metadata } from 'next'
import '@/shared/styles/globals.css'
import { AuthProvider } from '@/features/auth'

export const metadata: Metadata = {
  title: 'ClassDuo - 학습의 새로운 파트너',
  description: 'AI 기반 학습 보조 플랫폼',
  icons: {
    icon: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}


