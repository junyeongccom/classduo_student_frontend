/**
 * @file signedUrlCache.ts
 * @description PDF signed URL의 세션 스토리지 캐싱 유틸리티
 * @module features/exam_prep/domain
 * @dependencies 없음 (순수 로직)
 */

const PDF_URL_CACHE_PREFIX = 'pdf_url_'
const URL_EXPIRY_MARGIN_MS = 5 * 60 * 1000 // 만료 5분 전에 갱신

export const SIGNED_URL_EXPIRES_SEC = 86400 // 24시간

export const getCachedSignedUrl = (materialId: string): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${PDF_URL_CACHE_PREFIX}${materialId}`)
    if (!raw) return null
    const cached = JSON.parse(raw) as { url: string; expiresAt: number }
    if (Date.now() < cached.expiresAt - URL_EXPIRY_MARGIN_MS) {
      return cached.url
    }
    sessionStorage.removeItem(`${PDF_URL_CACHE_PREFIX}${materialId}`)
  } catch {
    // ignore parse errors
  }
  return null
}

export const setCachedSignedUrl = (materialId: string, url: string, expiresInSec: number) => {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      `${PDF_URL_CACHE_PREFIX}${materialId}`,
      JSON.stringify({ url, expiresAt: Date.now() + expiresInSec * 1000 }),
    )
  } catch {
    // ignore storage quota errors
  }
}

/**
 * 백엔드 API 응답에서 받은 signed URL을 세션 스토리지에 캐싱
 * 이미 유효한 캐시가 있으면 덮어쓰지 않음
 */
export const cacheSignedUrlFromApi = (materialId: string, url: string, expiresInSec = SIGNED_URL_EXPIRES_SEC) => {
  const existing = getCachedSignedUrl(materialId)
  if (existing) return // 유효한 캐시가 있으면 덮어쓰지 않음
  setCachedSignedUrl(materialId, url, expiresInSec)
}
