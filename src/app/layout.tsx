import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { cookies } from 'next/headers'
import '@/shared/styles/globals.css'
import { AuthProvider } from '@/features/auth'
import { I18nRootProvider } from '@/shared/i18n/I18nRootProvider'
import { MaintenanceNoticeModal } from '@/shared/components/common/MaintenanceNoticeModal'

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

export const metadata: Metadata = {
  metadataBase: new URL('https://korea.aplus.io.kr'),
  title: 'Aplus - 매일매일 A+학점을 향해!',
  description: 'AI 기반 학습 보조 플랫폼',
  icons: {
    icon: '/Aplus_favicon.png',
    apple: '/Aplus_favicon.png',
  },
  // iOS(아이패드) "홈 화면에 추가" 시 Safari 크롬 없이 전체화면(standalone)으로 실행
  appleWebApp: {
    capable: true,
    title: 'Aplus',
    statusBarStyle: 'default',
  },
  openGraph: {
    title: 'Aplus - 매일매일 A+학점을 향해!',
    description: 'AI 기반 학습 보조 플랫폼',
    url: 'https://korea.aplus.io.kr',
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


