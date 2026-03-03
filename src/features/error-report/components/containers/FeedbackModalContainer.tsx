/**
 * @file FeedbackModalContainer.tsx
 * @description 피드백 모달 컨테이너 — API 호출 + 첨부파일 업로드 연결
 * @module features/error-report/components/containers
 * @dependencies errorReportService, uploadAttachment, FeedbackModal, useAuthStore
 */

'use client'

import { useState } from 'react'
import { useToast } from '@/shared/hooks/useToast'
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
  const { toasts, success: showSuccess } = useToast()

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
      showSuccess('소중한 의견 감사합니다! 빠르게 검토하겠습니다.')
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
    <>
      <FeedbackModal
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        error={error}
      />
      {toasts.length > 0 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-1">
          {toasts.map(toast => (
            <div key={toast.id} className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
