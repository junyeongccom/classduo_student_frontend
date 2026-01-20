/**
 * 로딩 화면에 표시될 재미있는 메시지 모음 (i18n 기반)
 */

import type { useTranslations } from 'next-intl'

export type LoadingMessageCategory = 'general' | 'aiTutor' | 'review' | 'game'

/**
 * 카테고리별 랜덤 메시지 선택 (i18n 사용)
 * @param t - useTranslations 훅에서 반환된 번역 함수
 * @param category - 메시지 카테고리
 */
export function getRandomMessage(
  t: ReturnType<typeof useTranslations<'loadingMessages'>>,
  category: LoadingMessageCategory = 'general'
): string {
  const messages = t.raw(category) as string[]
  if (!Array.isArray(messages) || messages.length === 0) {
    return t('general.0') // 폴백
  }
  const randomIndex = Math.floor(Math.random() * messages.length)
  return messages[randomIndex]
}

/**
 * 모든 카테고리에서 랜덤 메시지 선택 (i18n 사용)
 * @param t - useTranslations 훅에서 반환된 번역 함수
 */
export function getRandomMessageFromAll(
  t: ReturnType<typeof useTranslations<'loadingMessages'>>
): string {
  const allCategories: LoadingMessageCategory[] = ['general', 'aiTutor', 'review', 'game']
  const randomCategory = allCategories[Math.floor(Math.random() * allCategories.length)]
  return getRandomMessage(t, randomCategory)
}

