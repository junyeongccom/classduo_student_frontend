/**
 * User 도메인 타입 정의
 */

// ============ Password Change Types ============

export type PasswordChangeModalStep = 'idle' | 'form' | 'verification' | 'newPassword' | 'success'

export interface SendVerificationCodeRequest {
  current_password: string
}

export interface SendVerificationCodeResponse {
  message: string
  email_masked: string
  expires_in: number
}

export interface VerifyCodeRequest {
  code: string
}

export interface VerifyCodeResponse {
  message: string
  valid: boolean
}

export interface VerifyAndChangePasswordRequest {
  code: string
  new_password: string
  new_password_confirm: string
}

export interface VerifyAndChangePasswordResponse {
  message: string
}
