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
export { ResearchConsentToggle } from './components/containers/ResearchConsentToggle'
export { LegalDocument } from './components/legal/LegalDocument'
export type { LegalArticle, LegalDocumentProps, LegalTable } from './components/legal/LegalDocument'
export { PRIVACY_EN, PRIVACY_KO, PRIVACY_VERSION } from './content/privacyPolicy'
export { TERMS_EN, TERMS_KO, TERMS_VERSION } from './content/termsOfService'
