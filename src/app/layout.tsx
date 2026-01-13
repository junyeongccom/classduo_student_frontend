import type { Metadata } from 'next'
import '@/shared/styles/globals.css'
import { AuthProvider } from '@/features/auth'

export const metadata: Metadata = {
  title: 'ClassDuo - 대학생 공부중독 앱',
  description: 'AI 기반 학습 보조 플랫폼',
  icons: {
    icon: '/student_pavicon.png',
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


