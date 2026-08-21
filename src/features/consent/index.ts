/**
 * @file index.ts
 * @description features/consent 공개 API 경계
 * @module features/consent
 * @dependencies 내부 모듈
 */
export * from './types'
export {
  REQUIRED_CONSENT_CODES,
  buildConsentPayload,
  findMissingRequired,
  isAllChecked,
  setAllChecked,
  sortDocuments,
} from './domain/resolveConsentState'
export { consentService } from './services/consentService'
export { useConsentStore } from './store/useConsentStore'
export { useConsent } from './hooks/useConsent'
export { ConsentCheckboxGroup } from './components/ui/ConsentCheckboxGroup'
export { ConsentGateModal } from './components/containers/ConsentGateModal'
