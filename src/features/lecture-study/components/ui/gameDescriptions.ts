/**
 * @file gameDescriptions.ts
 * @description 게임별 설명 데이터 상수 맵 (목표, 조작법, 썸네일, 색상 테마)
 * @module features/lecture-study/components/ui
 */

export interface GameControl {
  iconType: 'keyboard' | 'mouse' | 'text'
  keyLabel?: string
  descriptionKey: string
}

export interface GameDescriptionData {
  goalKey: string
  controls: GameControl[]
  thumbnail?: string
  colorTheme: 'orange' | 'blue' | 'violet' | 'emerald' | 'pink'
}

export const GAME_DESCRIPTIONS: Record<string, GameDescriptionData> = {
  running: {
    goalKey: 'running.goal',
    controls: [
      { iconType: 'keyboard', keyLabel: '↑ / Space', descriptionKey: 'running.control1' },
      { iconType: 'keyboard', keyLabel: '↓', descriptionKey: 'running.control2' },
    ],
    colorTheme: 'orange',
  },
  deck: {
    goalKey: 'deck.goal',
    controls: [
      { iconType: 'mouse', keyLabel: 'Click', descriptionKey: 'deck.control1' },
    ],
    colorTheme: 'blue',
  },
  cardMatch: {
    goalKey: 'cardMatch.goal',
    controls: [
      { iconType: 'mouse', keyLabel: 'Click', descriptionKey: 'cardMatch.control1' },
    ],
    thumbnail: '/matching_thumbnail.png',
    colorTheme: 'violet',
  },
  definitionBuilder: {
    goalKey: 'definitionBuilder.goal',
    controls: [
      { iconType: 'mouse', keyLabel: 'Click', descriptionKey: 'definitionBuilder.control1' },
    ],
    thumbnail: '/definition_building.png',
    colorTheme: 'emerald',
  },
  guessTheTerm: {
    goalKey: 'guessTheTerm.goal',
    controls: [
      { iconType: 'text', descriptionKey: 'guessTheTerm.control1' },
      { iconType: 'mouse', keyLabel: 'Click', descriptionKey: 'guessTheTerm.control2' },
    ],
    colorTheme: 'pink',
  },
}
