import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { cookies } from 'next/headers'
import '@/shared/styles/globals.css'
import { AuthProvider } from '@/features/auth'
import { I18nRootProvider } from '@/shared/i18n/I18nRootProvider'
import { MaintenanceNoticeModal } from '@/shared/components/common/MaintenanceNoticeModal'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

export const metadata: Metadata = {
  // [demo/hai-sync 전용] OG 절대경로 기준을 데모 배포 도메인으로 (korea.aplus.io.kr 은 고대 빌드라 데모 자산이 없음)
  metadataBase: new URL('https://classduo-student-frontend-git-dem-1fd9d4-junyeongccoms-projects.vercel.app'),
  title: 'HAI-Sync - AI 학습 파트너',
  description: 'AI 기반 학습 보조 플랫폼',
  icons: {
    icon: '/HAI_Sync_favicon.png',
    apple: '/HAI_Sync_favicon.png',
  },
  // iOS(아이패드) "홈 화면에 추가" 시 Safari 크롬 없이 전체화면(standalone)으로 실행
  appleWebApp: {
    capable: true,
    title: 'HAI-Sync',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'HAI-Sync - AI 학습 파트너',
    description: 'AI 기반 학습 보조 플랫폼',
    url: 'https://classduo-student-frontend-git-dem-1fd9d4-junyeongccoms-projects.vercel.app',
    siteName: 'HAI-Sync',
    images: [
      {
        url: '/present_image_hai.png',
        width: 1200,
        height: 630,
        alt: 'HAI-Sync 서비스 대표 이미지',
      },
    ],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HAI-Sync - AI 학습 파트너',
    description: 'AI 기반 학습 보조 플랫폼',
    images: ['/present_image_hai.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const locale = cookieStore.get('classduo_locale')?.value === 'en' ? 'en' : 'ko'
  const theme = cookieStore.get('classduo_theme')?.value === 'dark' ? 'dark' : ''

  return (
    <html lang={locale} className={theme} suppressHydrationWarning>
      <head>
        {GTM_ID && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
            }}
          />
        )}
      </head>
      <body>
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <I18nRootProvider>
          <AuthProvider>
            <MaintenanceNoticeModal />
            {children}
          </AuthProvider>
        </I18nRootProvider>
      </body>
    </html>
  )
}


