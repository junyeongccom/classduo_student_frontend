/**
 * Auth 도메인 타입 정의
 */

// ============ Request Types ============

export interface SignUpRequest {
  email: string
  password: string
  password_confirm: string
  full_name: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface ResendVerificationRequest {
  email: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
  new_password_confirm: string
}

export interface UpdateProfileRequest {
  full_name: string
}

export interface DeleteAccountRequest {
  password: string
  reason?: string
}

// ============ Response Types ============

export interface SignUpResponse {
  message: string
  user_id: string
  email: string
}

export interface AuthTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface UserProfileResponse {
  user_id: string
  email: string
  full_name: string
  school: string
  is_email_verified: boolean
  is_active: boolean
  role: string
  created_at: string
}

export interface ChangePasswordResponse {
  message: string
}

export interface UpdateProfileResponse {
  message: string
  full_name: string
}

export interface DeleteAccountResponse {
  message: string
}

// ============ Error Types ============

export interface AuthError {
  error_code: string
  message: string
  actions?: AuthErrorAction[]
}

export interface AuthErrorAction {
  type: 'login' | 'resend_verification'
  label: string
  description?: string
  endpoint?: string
  email?: string
}

// ============ Store Types ============

export interface AuthState {
  user: UserProfileResponse | null
  isAuthenticated: boolean
  isLoading: boolean
  error: AuthError | null
}

export interface AuthActions {
  setUser: (user: UserProfileResponse | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: AuthError | null) => void
  login: (tokens: AuthTokenResponse) => void
  logout: () => void
  clearError: () => void
}

// ============ Direct Signup (no email verification) ============

export interface DirectSignupResponse {
  message: string
  access_token: string
  refresh_token: string | null
  token_type: string
  expires_in: number
}

// ============ Signup with Verification Code ============

export type SignupStep = 'form' | 'verification' | 'success'

export interface SendSignupCodeRequest {
  email: string
  password: string
  password_confirm: string
  full_name: string
}

export interface SendSignupCodeResponse {
  message: string
  email_masked: string
  expires_in: number
}

export interface VerifySignupCodeRequest {
  email: string
  code: string
}

export interface VerifySignupCodeResponse {
  message: string
  access_token: string
  refresh_token: string | null
  token_type: string
  expires_in: number
}

// ============ Password Reset with Verification Code ============

export type ResetPasswordStep = 'email' | 'verify' | 'success'

export interface SendResetPasswordCodeRequest {
  email: string
}

export interface SendResetPasswordCodeResponse {
  message: string
  email_masked: string
  expires_in: number
}

export interface VerifyResetPasswordCodeRequest {
  email: string
  code: string
  new_password: string
  new_password_confirm: string
}

export interface VerifyResetPasswordCodeResponse {
  message: string
}


