/**
 * @file useConsent.ts
 * @description 동의 문서 조회·상태 조회·동의 제출을 store 와 연결
 * @module features/consent
 * @dependencies consentService, useConsentStore, resolveConsentState
 */
'use client'

import { useCallback } from 'react'
import { consentService } from '../services/consentService'
import { useConsentStore } from '../store/useConsentStore'
import { buildConsentPayload } from '../domain/resolveConsentState'
import type { ConsentChecked, ConsentCode, ConsentSource } from '../types'

export function useConsent() {
  const { documents, status, isLoading, setDocuments, setStatus, setLoading } = useConsentStore()

  const loadDocuments = useCallback(async () => {
    const result = await consentService.getDocuments()
    if (result.data?.documents) {
      setDocuments(result.data.documents)
      return result.data.documents
    }
    return []
  }, [setDocuments])

  /**
   * 동의 상태 조회. 실패하면 null 을 넣는다 —
   * 백엔드 장애가 앱 전면 차단(게이트 상시 노출)으로 번지면 안 된다.
   */
  const loadStatus = useCallback(async () => {
    const result = await consentService.getStatus()
    if (result.error || !result.data) {
      setStatus(null)
      return null
    }
    setStatus(result.data)
    return result.data
  }, [setStatus])

  const submitConsents = useCallback(
    async (source: ConsentSource, checked: ConsentChecked, onlyCodes?: ConsentCode[]) => {
      setLoading(true)
      try {
        // onlyCodes 가 주어지면 그 코드만 보낸다.
        // (마이페이지에서 선택 항목 하나만 뒤집을 때, 화면에 없던 필수 항목이
        //  agreed:false 로 덮여 기존 동의가 철회되는 사고를 막는다)
        const target = onlyCodes
          ? documents.filter((d) => onlyCodes.includes(d.code))
          : documents
        const payload = buildConsentPayload(target, checked)
        const result = await consentService.record(source, payload)
        if (result.error) {
          return { success: false as const, error: result.error }
        }
        await loadStatus()
        return { success: true as const }
      } finally {
        setLoading(false)
      }
    },
    [documents, loadStatus, setLoading]
  )

  return { documents, status, isLoading, loadDocuments, loadStatus, submitConsents }
}
