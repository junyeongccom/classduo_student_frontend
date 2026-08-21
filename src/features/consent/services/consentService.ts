/**
 * @file consentService.ts
 * @description 개인정보 동의 REAL API 호출
 * @module features/consent
 * @dependencies shared/lib/api, shared/constants/api
 */
import { apiRequest } from '@/shared/lib/api'
import { API_ENDPOINTS } from '@/shared/constants/api'
import type { ConsentAnswer, ConsentDocument, ConsentSource, ConsentStatus } from '../types'

export const consentService = {
  /** 현행 동의 문서 목록 (무인증) */
  getDocuments: () =>
    apiRequest<{ documents: ConsentDocument[] }>(API_ENDPOINTS.CONSENT.DOCUMENTS, {
      method: 'GET',
    }),

  /** 현재 사용자의 동의 상태 */
  getStatus: () =>
    apiRequest<ConsentStatus>(API_ENDPOINTS.CONSENT.STATUS, {
      method: 'GET',
      auth: true,
    }),

  /** 동의 기록 (게이트·마이페이지) */
  record: (source: ConsentSource, consents: ConsentAnswer[]) =>
    apiRequest<{ message: string; recorded: string[] }>(API_ENDPOINTS.CONSENT.RECORD, {
      method: 'POST',
      body: { source, consents },
      auth: true,
    }),
}
