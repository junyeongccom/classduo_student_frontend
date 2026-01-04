import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Tailwind CSS 클래스 병합 유틸리티
 * clsx로 조건부 클래스를 처리하고, tailwind-merge로 충돌을 해결
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * API Base URL
 * 환경변수 NEXT_PUBLIC_API_URL을 사용합니다.
 * 기본값은 개발 환경용입니다 (환경변수가 설정되지 않은 경우에만 사용).
 * 
 * ⚠️ Vercel 배포 시:
 * 1. Vercel 대시보드 > 프로젝트 > Settings > Environment Variables
 * 2. NEXT_PUBLIC_API_URL 추가 (예: https://your-backend-api.com)
 * 3. Production, Preview, Development 환경 모두에 설정
 */
export const API_BASE_URL = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL
  
  // 환경 변수가 있으면 사용
  if (url && url.trim() !== '') {
    return url.trim()
  }
  
  // 빌드 시점에는 에러를 절대 던지지 않음 (Vercel 빌드 실패 방지)
  // Next.js 빌드 시점에는 환경 변수가 아직 주입되지 않을 수 있음
  // 런타임에만 경고를 표시하고, 기본값 사용
  const defaultUrl = 'http://localhost:8000'
  
  // 런타임(브라우저)에서만 경고 표시
  if (typeof window !== 'undefined') {
    console.warn('⚠️ NEXT_PUBLIC_API_URL이 설정되지 않았습니다. Vercel 환경 변수를 확인하세요. 기본값을 사용합니다:', defaultUrl)
  }
  
  return defaultUrl
})()

/**
 * 토큰 저장소 키
 */
export const TOKEN_KEY = 'classduo_access_token'
export const REFRESH_TOKEN_KEY = 'classduo_refresh_token'


