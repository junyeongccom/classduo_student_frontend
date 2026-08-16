/**
 * @file seed.ts
 * @description 일일 시드 소금 — 같은 날·같은 회차·같은 난이도면 모두가 같은 판을 푼다 (리더보드 공정성)
 * @module features/review/games/word-solitaire
 * @dependencies features/review/games/word-solitaire/engine
 */
import { deriveDealSeed, type SolitaireDifficulty } from './engine/index.ts'

/** 판이 갱신되는 기준 시간대 — 국내 사용자 기준으로 자정에 새 판이 열린다 */
export const DEAL_TIME_ZONE = 'Asia/Seoul'

/**
 * `YYYY-MM-DD` (Asia/Seoul). 브라우저 로컬 타임존이 달라도 같은 날짜 문자열이 나와야
 * 해외 접속자와 같은 판을 공유한다.
 */
export const dailySalt = (now: Date = new Date()): string => {
  if (Number.isNaN(now.getTime())) throw new Error('dailySalt: 유효하지 않은 날짜입니다')
  // en-CA 는 ISO 와 같은 YYYY-MM-DD 를 만든다.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** 계획서 §4-3: `seed = hash(lecture_id + difficulty + daily_salt)` */
export const dealSeedFor = (
  lectureId: string,
  difficulty: SolitaireDifficulty,
  now: Date = new Date(),
): number => deriveDealSeed(lectureId, difficulty, dailySalt(now))
