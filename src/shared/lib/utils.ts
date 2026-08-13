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
// [demo/hai-sync 전용] 한림 8/28 부스 데모: Vercel Preview 환경변수(dev-api)를 무시하고
// 운영검증된 PROD API에 고정한다. main 병합 금지 브랜치.
export const API_BASE_URL = 'https://api.classduo.io.kr'

/**
 * 토큰 저장소 키
 */
export const TOKEN_KEY = 'classduo_access_token'
export const REFRESH_TOKEN_KEY = 'classduo_refresh_token'


