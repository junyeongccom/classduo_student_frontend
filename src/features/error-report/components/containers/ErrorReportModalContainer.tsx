'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth';
import { createErrorReport } from '../../services/errorReportService';
import { uploadErrorReportAttachment } from '../../services/uploadAttachment';
import { ErrorReportModal, ErrorReportFormData, ErrorReportPrefillData } from '../ui/ErrorReportModal';

interface ErrorReportModalContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthError?: () => void;
  prefill?: ErrorReportPrefillData | null;
  onPrefillApplied?: () => void;
}

export function ErrorReportModalContainer({
  isOpen,
  onClose,
  onAuthError,
  prefill,
  onPrefillApplied,
}: ErrorReportModalContainerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // systemErrorMessage를 prefill이 clear되기 전에 저장
  const systemErrorMessageRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen && prefill?.systemErrorMessage) {
      systemErrorMessageRef.current = prefill.systemErrorMessage;
    }
  }, [isOpen, prefill?.systemErrorMessage]);

  // 모달이 닫힐 때 ref 초기화
  useEffect(() => {
    if (!isOpen) {
      systemErrorMessageRef.current = undefined;
    }
  }, [isOpen]);

  const handleSubmit = async (formData: ErrorReportFormData, attachmentFile?: File) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // 첨부파일이 있으면 먼저 업로드
      let attachmentUrl: string | undefined;
      if (attachmentFile) {
        const userId = useAuthStore.getState().user?.user_id ?? 'anonymous_' + Date.now();
        const uploadResult = await uploadErrorReportAttachment(attachmentFile, userId);

        if (!uploadResult.success) {
          setError(uploadResult.error || '파일 업로드에 실패했습니다.');
          setIsSubmitting(false);
          return;
        }

        attachmentUrl = uploadResult.url;
      }

      // 오류 신고 생성 (systemErrorMessage는 ref에서 가져옴 - prefill이 clear되어도 유지됨)
      await createErrorReport({
        ...formData,
        attachment_url: attachmentUrl,
        system_error_message: systemErrorMessageRef.current,
      });

      // 성공 시 모달 닫기
      onClose();
      alert('소중한 의견 감사합니다! 빠르게 검토하겠습니다.');
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('인증')) {
          setError('인증이 만료되었습니다. 다시 로그인해주세요.');
          onAuthError?.();
        } else {
          setError(err.message || '오류 신고 제출에 실패했습니다.');
        }
      } else {
        setError('오류 신고 제출에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      onClose();
    }
  };

  return (
    <ErrorReportModal
      isOpen={isOpen}
      onClose={handleClose}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      error={error}
      prefill={prefill}
      onPrefillApplied={onPrefillApplied}
    />
  );
}
