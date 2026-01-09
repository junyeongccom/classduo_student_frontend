/**
 * 로딩 화면에 표시될 재미있는 메시지 모음
 */

export type LoadingMessageCategory = 'general' | 'ai-tutor' | 'review' | 'game'

interface LoadingMessagesMap {
  general: string[]
  'ai-tutor': string[]
  review: string[]
  game: string[]
}

export const LOADING_MESSAGES: LoadingMessagesMap = {
  general: [
    '잠시만 기다려주세요! 🎯',
    '곧 준비될 거예요! ⏰',
    '열심히 준비 중이에요! 💪',
    '거의 다 됐어요! 🚀',
    '조금만 더 기다려주세요! ⏳',
    '마법을 부리는 중... ✨',
    '데이터를 불러오는 중... 📦',
    '준비 완료까지 조금만요! 🎨',
  ],
  'ai-tutor': [
    'AI 교수님이 커피 마시는 중... ☕',
    '똑똑한 답변 준비 중... 🧠',
    'AI가 책을 뒤적이는 중... 📚',
    '강의 자료를 찾고 있어요... 🔍',
    'AI 두뇌가 작동 중... 🤖',
    '최고의 답변을 고민하는 중... 💡',
    '강의 노트를 정리하는 중... 📝',
    'AI 교수님이 생각에 잠겨있어요... 🤔',
    '지식 데이터베이스 검색 중... 🗄️',
    '똑똑한 대답을 위해 공부 중... 📖',
  ],
  review: [
    '복습 카드뉴스 꾸미는 중... 🎨',
    '지식을 예쁘게 포장 중... 🎁',
    '복습 자료를 준비하는 중... 📋',
    '카드뉴스가 로딩되는 중... 🖼️',
    '복습 콘텐츠 준비 완료까지 조금만... ⏱️',
    '중요한 내용을 정리하는 중... 📌',
    '핵심만 쏙쏙 뽑아내는 중... 🎯',
    '기억에 남을 복습 준비 중... 🧠',
    '복습 마법을 걸고 있어요... ✨',
  ],
  game: [
    'OX 퀴즈 문제 섞는 중... 🎲',
    '캐릭터가 준비운동 중... 🏃',
    '게임 시작 준비 중... 🎮',
    '문제를 꺼내는 중... 📝',
    '캐릭터가 긴장하고 있어요... 😤',
    '퀴즈 무대를 꾸미는 중... 🎪',
    '게임 규칙을 확인하는 중... 📜',
    '보물상자를 준비하는 중... 💎',
    '도전 과제 로딩 중... 🏆',
  ],
}

/**
 * 카테고리별 랜덤 메시지 선택
 */
export function getRandomMessage(category: LoadingMessageCategory = 'general'): string {
  const messages = LOADING_MESSAGES[category]
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}

/**
 * 모든 카테고리에서 랜덤 메시지 선택
 */
export function getRandomMessageFromAll(): string {
  const allCategories: LoadingMessageCategory[] = ['general', 'ai-tutor', 'review', 'game']
  const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)]
  return getRandomMessage(randomCategory)
}

