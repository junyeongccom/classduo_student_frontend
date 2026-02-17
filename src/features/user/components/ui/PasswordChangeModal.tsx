'use client'

import { useRef, useEffect } from 'react'
import { X, Eye, EyeOff, Check, AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { PasswordChangeModalStep } from '../../types'

interface PasswordChangeModalProps {
  isOpen: boolean
  onClose: () => void
  step: PasswordChangeModalStep
  // Form state
  currentPassword: string
  newPassword: string
  newPasswordConfirm: string
  verificationCode: string[]
  maskedEmail: string
  expiresIn: number
  // Password visibility
  showCurrentPassword: boolean
  showNewPassword: boolean
  showNewPasswordConfirm: boolean
  // Loading & error
  isLoading: boolean
  error: string | null
  // Handlers
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onNewPasswordConfirmChange: (value: string) => void
  onVerificationCodeChange: (index: number, value: string) => void
  onToggleCurrentPassword: () => void
  onToggleNewPassword: () => void
  onToggleNewPasswordConfirm: () => void
  onSendVerificationCode: () => void
  onVerifyCode: () => void
  onChangePassword: () => void
  onCancel: () => void
}

export function PasswordChangeModal({
  isOpen,
  onClose,
  step,
  currentPassword,
  newPassword,
  newPasswordConfirm,
  verificationCode,
  maskedEmail,
  expiresIn,
  showCurrentPassword,
  showNewPassword,
  showNewPasswordConfirm,
  isLoading,
  error,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onNewPasswordConfirmChange,
  onVerificationCodeChange,
  onToggleCurrentPassword,
  onToggleNewPassword,
  onToggleNewPasswordConfirm,
  onSendVerificationCode,
  onVerifyCode,
  onChangePassword,
  onCancel,
}: PasswordChangeModalProps) {
  const t = useTranslations('profile.passwordChange')
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (step === 'verification' && inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [step])

  if (!isOpen) return null

  const formatExpiresIn = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes}${t('minutesUnit')}`
  }

  const handleCodeInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    onVerificationCodeChange(index, digit)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    pastedData.split('').forEach((digit, index) => {
      onVerificationCodeChange(index, digit)
    })
    const focusIndex = Math.min(pastedData.length, 5)
    inputRefs.current[focusIndex]?.focus()
  }

  const isCodeComplete = verificationCode.every(digit => digit !== '')

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && step === 'idle') {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 'idle' && t('title')}
            {step === 'form' && t('title')}
            {step === 'verification' && t('verificationTitle')}
            {step === 'newPassword' && t('newPasswordTitle')}
            {step === 'success' && t('successTitle')}
          </h2>
          {step === 'idle' && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step: idle - placeholder, usually shown from form step */}
          {step === 'idle' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('description')}
              </p>
              <button
                onClick={onSendVerificationCode}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                {t('startButton')}
              </button>
            </div>
          )}

          {/* Step: form - current password input */}
          {step === 'form' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('formDescription')}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('currentPasswordLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => onCurrentPasswordChange(e.target.value)}
                    placeholder={t('currentPasswordPlaceholder')}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={onToggleCurrentPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  {t('cancelButton')}
                </button>
                <button
                  type="button"
                  onClick={onSendVerificationCode}
                  disabled={isLoading || !currentPassword}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('sendingCode') : t('sendCodeButton')}
                </button>
              </div>
            </div>
          )}

          {/* Step: verification - 6-digit code input */}
          {step === 'verification' && (
            <div className="space-y-6">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm text-center">
                <strong>{maskedEmail}</strong>{t('codeSentTo')}
                <br />
                <span className="text-blue-600">{t('validFor')}: {formatExpiresIn(expiresIn)}</span>
              </div>

              {/* 6-digit OTP input */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3 text-center">
                  {t('enterCodeLabel')}
                </label>
                <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={verificationCode[index] || ''}
                      onChange={(e) => handleCodeInput(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      disabled={isLoading}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  {t('cancelButton')}
                </button>
                <button
                  type="button"
                  onClick={onVerifyCode}
                  disabled={isLoading || !isCodeComplete}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('verifyingCode') : t('nextButton')}
                </button>
              </div>
            </div>
          )}

          {/* Step: newPassword - new password input */}
          {step === 'newPassword' && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm text-center">
                {t('verifiedMessage')}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('newPasswordLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => onNewPasswordChange(e.target.value)}
                    placeholder={t('newPasswordPlaceholder')}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={onToggleNewPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {t('passwordRequirements')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  {t('confirmPasswordLabel')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPasswordConfirm ? 'text' : 'password'}
                    value={newPasswordConfirm}
                    onChange={(e) => onNewPasswordConfirmChange(e.target.value)}
                    placeholder={t('confirmPasswordPlaceholder')}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={onToggleNewPasswordConfirm}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPasswordConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                >
                  {t('cancelButton')}
                </button>
                <button
                  type="button"
                  onClick={onChangePassword}
                  disabled={isLoading || !newPassword || !newPasswordConfirm}
                  className="flex-1 px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? t('changingPassword') : t('changePasswordButton')}
                </button>
              </div>
            </div>
          )}

          {/* Step: success - completion */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <Check className="w-8 h-8" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {t('successMessage')}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {t('successDescription')}
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                {t('confirmButton')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
