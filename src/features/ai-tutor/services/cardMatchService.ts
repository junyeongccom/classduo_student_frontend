import { apiRequest } from '@/shared/lib/api'
import type { CardMatchSet } from '../types'

export const cardMatchService = {
  async getCardMatchSet(
    lectureId: string,
    locale?: 'ko' | 'en'
  ): Promise<{ data: CardMatchSet | null; error: any }> {
    return apiRequest<CardMatchSet>(`/card-match/lectures/${lectureId}`, {
      auth: true,
      method: 'GET',
      headers: locale ? { 'Accept-Language': locale } : undefined,
    })
  },
}

