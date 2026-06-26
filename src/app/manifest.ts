/**
 * @file manifest.ts
 * @description PWA 웹 매니페스트 — 홈 화면에 추가 시 URL바 없는 전체화면(standalone)으로 실행. 태블릿 데모용.
 * @module app
 * @dependencies next (MetadataRoute)
 */
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Aplus - 매일매일 A+학점을 향해!',
    short_name: 'Aplus',
    description: 'AI 기반 학습 보조 플랫폼',
    start_url: '/',
    display: 'standalone', // 홈화면 아이콘으로 실행 시 브라우저 URL바 제거
    orientation: 'any', // 태블릿 가로/세로 회전 모두 허용
    background_color: '#ffffff',
    theme_color: '#6366F1',
    icons: [
      { src: '/Aplus_favicon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/Aplus_favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
