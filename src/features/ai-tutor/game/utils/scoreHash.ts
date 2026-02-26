/**
 * HMAC-SHA256 score hash utility for game score submission
 * Uses Web Crypto API for secure hashing
 */

const SECRET = process.env.NEXT_PUBLIC_GAME_SCORE_SECRET ?? ''

interface ScoreHashParams {
  lectureId: string
  score: number
  correctCount: number
  wrongCount: number
  skippedCount: number
  elapsedMs: number
  nonce: string
  timestamp: number
}

export async function computeScoreHmac(params: ScoreHashParams): Promise<string> {
  const message = [
    params.lectureId,
    params.score,
    params.correctCount,
    params.wrongCount,
    params.skippedCount,
    params.elapsedMs,
    params.nonce,
    params.timestamp,
  ].join('|')

  const encoder = new TextEncoder()
  const keyData = encoder.encode(SECRET)
  const msgData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const hashArray = Array.from(new Uint8Array(signature))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export function generateNonce(): string {
  return crypto.randomUUID()
}
