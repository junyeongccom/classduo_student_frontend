/**
 * @file index.ts
 * @description 단어 솔리테어 게임 공개 경계 — 바깥에서는 이 파일만 import 한다
 * @module features/review/games/word-solitaire
 * @dependencies components/WordSolitaireGame, useWordSolitaire
 */
export { WordSolitaireGame } from './components/WordSolitaireGame'
export type { WordSolitaireGameProps } from './components/WordSolitaireGame'
export type { WordSolitaireResult } from './useWordSolitaire.ts'
