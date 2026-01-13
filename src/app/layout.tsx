import type { Metadata } from 'next'
import '@/shared/styles/globals.css'
import { AuthProvider } from '@/features/auth'

export const metadata: Metadata = {
  metadataBase: new URL('https://korea.classduo.io.kr'),
  title: 'ClassDuo - 대학생 공부중독 앱',
  description: 'AI 기반 학습 보조 플랫폼',
  icons: {
    icon: '/student_pavicon.png',
  },
  openGraph: {
    title: 'ClassDuo - 대학생 공부중독 앱',
    description: 'AI 기반 학습 보조 플랫폼',
    url: 'https://korea.classduo.io.kr',
    siteName: 'ClassDuo',
    images: [
      {
        url: '/present_image.png',
        width: 1200,
        height: 630,
        alt: 'ClassDuo 서비스 대표 이미지',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClassDuo - 대학생 공부중독 앱',
    description: 'AI 기반 학습 보조 플랫폼',
    images: ['/present_image.png'],
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


