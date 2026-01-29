import type { Metadata } from 'next'
import '@/shared/styles/globals.css'
import { AuthProvider } from '@/features/auth'
import { I18nProvider } from '@/shared/i18n/I18nProvider'

export const metadata: Metadata = {
  metadataBase: new URL('https://korea.classduo.io.kr'),
  title: 'Aplus - 매일매일 A+학점을 향해!',
  description: 'AI 기반 학습 보조 플랫폼',
  icons: {
    icon: '/Aplus_favicon.png',
  },
  openGraph: {
    title: 'Aplus - 매일매일 A+학점을 향해!',
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
    title: 'Aplus - 매일매일 A+학점을 향해!',
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
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}


