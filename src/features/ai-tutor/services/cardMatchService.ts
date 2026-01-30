import { apiRequest } from '@/shared/lib/api'
import type { CardMatchSet } from '../types'

export const cardMatchService = {
  async getCardMatchSet(
    lectureId: string,
    locale?: 'ko' | 'en',
    fetchAll: boolean = false,
  ): Promise<{ data: CardMatchSet | null; error: any }> {
    const query = fetchAll ? '?fetch_all=true' : ''
    return apiRequest<CardMatchSet>(`/ai-tutor/lectures/${lectureId}/card-match${query}`, {
      auth: true,
      method: 'GET',
      headers: locale ? { 'Accept-Language': locale } : undefined,
    })
  },

  async submitCardMatchAttempt(
    lectureId: string,
    request: { correct: boolean }
  ): Promise<{ data: { success: boolean } | null; error: any }> {
    return apiRequest<{ success: boolean }>(`/ai-tutor/lectures/${lectureId}/card-match/attempts`, {
      auth: true,
      method: 'POST',
      body: request,
    })
  },
}

