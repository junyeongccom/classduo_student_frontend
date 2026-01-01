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
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (() => {
  if (process.env.NODE_ENV === 'production') {
    console.warn('NEXT_PUBLIC_API_URL이 설정되지 않았습니다. .env 파일을 확인하세요.')
  }
  return 'http://localhost:8000'
})()

/**
 * 토큰 저장소 키
 */
export const TOKEN_KEY = 'classduo_access_token'
export const REFRESH_TOKEN_KEY = 'classduo_refresh_token'


