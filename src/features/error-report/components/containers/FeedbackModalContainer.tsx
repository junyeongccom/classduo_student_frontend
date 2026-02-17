/**
 * @file FeedbackModalContainer.tsx
 * @description 피드백 모달 컨테이너 — API 호출 + 첨부파일 업로드 연결
 * @module features/error-report/components/containers
 * @dependencies errorReportService, uploadAttachment, FeedbackModal, useAuthStore
 */

'use client'

import { useState } from 'react'
import { useAuthStore } from '@/features/auth'
import { createErrorReport } from '../../services/errorReportService'
import { uploadErrorReportAttachment } from '../../services/uploadAttachment'
import { FeedbackModal, type FeedbackFormData } from '../ui/FeedbackModal'

interface FeedbackModalContainerProps {
  isOpen: boolean
  onClose: () => void
}

export function FeedbackModalContainer({ isOpen, onClose }: FeedbackModalContainerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (formData: FeedbackFormData, attachmentFile?: File) => {
    setIsSubmitting(true)
    setError(null)

    try {
      let attachmentUrl: string | undefined
      if (attachmentFile) {
        const userId = useAuthStore.getState().user?.user_id ?? 'anonymous_' + Date.now()
        const uploadResult = await uploadErrorReportAttachment(attachmentFile, userId)

        if (!uploadResult.success) {
          setError(uploadResult.error || '파일 업로드에 실패했습니다.')
          setIsSubmitting(false)
          return
        }
        attachmentUrl = uploadResult.url
      }

      await createErrorReport({
        content: formData.content,
        occurrence_time: formData.occurrence_time,
        occurrence_context: formData.occurrence_context,
        contact: formData.contact,
        attachment_url: attachmentUrl,
      })

      onClose()
      alert('소중한 의견 감사합니다! 빠르게 검토하겠습니다.')
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || '의견 제출에 실패했습니다.')
      } else {
        setError('의견 제출에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null)
      onClose()
    }
  }

  return (
    <FeedbackModal
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
    />
  )
}
