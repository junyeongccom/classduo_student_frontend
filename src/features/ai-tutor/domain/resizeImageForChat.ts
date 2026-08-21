/**
 * @file resizeImageForChat.ts
 * @description 첨부한 문제 사진을 전송용 JPEG data URL 로 리사이즈 (긴 변 1568px, 재압축 폴백)
 * @module features/ai-tutor
 * @dependencies 없음 (Canvas API)
 *
 * 서버(chat_image_service)의 상한은 8MB — 정상 경로에선 여기서 이미 그 아래로 줄어든다.
 * 1568px 은 vision 모델 입력 타일 기준으로 충분한 해상도(촬영 열화 견고성 실측 완료).
 */

const MAX_DIMENSION = 1568
const JPEG_QUALITY = 0.85
const RETRY_QUALITY = 0.7
/** base64 문자열 길이 상한 (~4MB 바이너리) — 초과 시 재압축, 그래도 넘으면 실패 */
const MAX_BASE64_LENGTH = 5_600_000

export async function resizeImageForChat(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) return null
  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // 투명 PNG 를 JPEG 로 바꿀 때 검은 배경이 되지 않게 흰 바탕을 깐다
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    let dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    if (dataUrl.length > MAX_BASE64_LENGTH) {
      dataUrl = canvas.toDataURL('image/jpeg', RETRY_QUALITY)
    }
    return dataUrl.length > MAX_BASE64_LENGTH ? null : dataUrl
  } finally {
    bitmap.close()
  }
}
