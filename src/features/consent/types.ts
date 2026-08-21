/**
 * @file types.ts
 * @description 개인정보 동의 도메인 타입
 * @module features/consent
 * @dependencies 없음
 */

export type ConsentCode =
  | 'terms_of_service'
  | 'privacy'
  | 'overseas_transfer'
  | 'age_14'
  | 'research_use'

export type ConsentSource = 'signup' | 'gate' | 'mypage'

export interface ConsentDocument {
  code: ConsentCode
  version: string
  title_ko: string
  title_en: string
  is_required: boolean
  display_order: number
  document_path: string | null
}

export interface ConsentAnswer {
  code: ConsentCode
  agreed: boolean
}

export type ConsentChecked = Partial<Record<ConsentCode, boolean>>

export interface ConsentOptionalState {
  code: ConsentCode
  version: string
  agreed: boolean | null
}

export interface ConsentStatus {
  missing_required: ConsentCode[]
  optional: ConsentOptionalState[]
}
