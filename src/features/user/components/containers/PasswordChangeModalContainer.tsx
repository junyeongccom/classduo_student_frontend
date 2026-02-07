'use client'

import { useState, useCallback, useEffect } from 'react'
import { PasswordChangeModal } from '../ui/PasswordChangeModal'
import { sendVerificationCode, verifyCode, verifyAndChangePassword } from '../../services/profileService'
import type { PasswordChangeModalStep } from '../../types'

interface PasswordChangeModalContainerProps {
  isOpen: boolean
  onClose: () => void
  onLogout?: () => void
}

export function PasswordChangeModalContainer({
  isOpen,
  onClose,
  onLogout,
}: PasswordChangeModalContainerProps) {
  const [step, setStep] = useState<PasswordChangeModalStep>('form')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [verificationCode, setVerificationCode] = useState<string[]>(['', '', '', '', '', ''])
  const [maskedEmail, setMaskedEmail] = useState('')
  const [expiresIn, setExpiresIn] = useState(600)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showNewPasswordConfirm, setShowNewPasswordConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('form')
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      setVerificationCode(['', '', '', '', '', ''])
      setMaskedEmail('')
      setExpiresIn(600)
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowNewPasswordConfirm(false)
      setError(null)
    }
  }, [isOpen])

  const handleSendVerificationCode = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await sendVerificationCode({ current_password: currentPassword })

      if (response.error) {
        setError('오류가 발생했습니다.')
        return
      }

      if (response.data) {
        setMaskedEmail(response.data.email_masked)
        setExpiresIn(response.data.expires_in)
        setStep('verification')
      }
    } catch (err) {
      setError('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [currentPassword])

  const handleVerificationCodeChange = useCallback((index: number, value: string) => {
    setVerificationCode(prev => {
      const newCode = [...prev]
      newCode[index] = value
      return newCode
    })
    setError(null)
  }, [])

  const handleVerifyCode = useCallback(async () => {
    const code = verificationCode.join('')
    if (code.length !== 6) {
      setError('6자리 인증 코드를 입력해주세요')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await verifyCode({ code })

      if (response.error) {
        setError('오류가 발생했습니다.')
        return
      }

      if (response.data?.valid) {
        setStep('newPassword')
      }
    } catch (err) {
      setError('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [verificationCode])

  const handleChangePassword = useCallback(async () => {
    if (newPassword !== newPasswordConfirm) {
      setError('새 비밀번호가 일치하지 않습니다')
      return
    }

    const code = verificationCode.join('')

    setIsLoading(true)
    setError(null)

    try {
      const response = await verifyAndChangePassword({
        code,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      })

      if (response.error) {
        setError('오류가 발생했습니다.')
        return
      }

      setStep('success')
    } catch (err) {
      setError('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [verificationCode, newPassword, newPasswordConfirm])

  const handleCancel = useCallback(() => {
    setStep('form')
    setCurrentPassword('')
    setNewPassword('')
    setNewPasswordConfirm('')
    setVerificationCode(['', '', '', '', '', ''])
    setError(null)
    onClose()
  }, [onClose])

  const handleClose = useCallback(() => {
    if (step === 'success' && onLogout) {
      onLogout()
    }
    onClose()
  }, [step, onLogout, onClose])

  return (
    <PasswordChangeModal
      isOpen={isOpen}
      onClose={handleClose}
      step={step}
      currentPassword={currentPassword}
      newPassword={newPassword}
      newPasswordConfirm={newPasswordConfirm}
      verificationCode={verificationCode}
      maskedEmail={maskedEmail}
      expiresIn={expiresIn}
      showCurrentPassword={showCurrentPassword}
      showNewPassword={showNewPassword}
      showNewPasswordConfirm={showNewPasswordConfirm}
      isLoading={isLoading}
      error={error}
      onCurrentPasswordChange={setCurrentPassword}
      onNewPasswordChange={setNewPassword}
      onNewPasswordConfirmChange={setNewPasswordConfirm}
      onVerificationCodeChange={handleVerificationCodeChange}
      onToggleCurrentPassword={() => setShowCurrentPassword(!showCurrentPassword)}
      onToggleNewPassword={() => setShowNewPassword(!showNewPassword)}
      onToggleNewPasswordConfirm={() => setShowNewPasswordConfirm(!showNewPasswordConfirm)}
      onSendVerificationCode={handleSendVerificationCode}
      onVerifyCode={handleVerifyCode}
      onChangePassword={handleChangePassword}
      onCancel={handleCancel}
    />
  )
}
