/**
 * @file useConsentStore.ts
 * @description 동의 문서·상태 도메인 store
 * @module features/consent
 * @dependencies zustand
 */
import { create } from 'zustand'
import type { ConsentDocument, ConsentStatus } from '../types'

interface ConsentState {
  documents: ConsentDocument[]
  status: ConsentStatus | null
  isLoading: boolean
  setDocuments: (documents: ConsentDocument[]) => void
  setStatus: (status: ConsentStatus | null) => void
  setLoading: (isLoading: boolean) => void
  reset: () => void
}

export const useConsentStore = create<ConsentState>((set) => ({
  documents: [],
  status: null,
  isLoading: false,
  setDocuments: (documents) => set({ documents }),
  setStatus: (status) => set({ status }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () => set({ documents: [], status: null, isLoading: false }),
}))
