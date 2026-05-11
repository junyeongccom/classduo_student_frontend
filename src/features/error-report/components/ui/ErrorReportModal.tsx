'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { OccurrenceContext, OCCURRENCE_CONTEXT_LABELS } from '../../types';

export interface ErrorReportFormData {
  content: string;
  occurrence_time?: string;
  occurrence_context?: OccurrenceContext;
  related_filename?: string;
  contact?: string;
  attachment_url?: string;
}

export interface ErrorReportPrefillData {
  content?: string;
  occurrenceContext?: OccurrenceContext;
  occurrenceTime?: string; // ISO 8601 형식
  courseName?: string;
  lectureDate?: string;
  errorMessage?: string;
  systemErrorMessage?: string; // 시스템 에러 로그 (상세 로그)
}

interface ErrorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ErrorReportFormData, attachmentFile?: File) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
  prefill?: ErrorReportPrefillData | null;
  onPrefillApplied?: () => void;
}

export function ErrorReportModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  error = null,
  prefill = null,
  onPrefillApplied
}: ErrorReportModalProps) {
  const t = useTranslations('errorReport');

  // 필수 입력
  const [content, setContent] = useState('');

  // 선택 입력
  const [occurrenceTime, setOccurrenceTime] = useState('');
  const [occurrenceContext, setOccurrenceContext] = useState<OccurrenceContext | ''>('');
  const [relatedFilename, setRelatedFilename] = useState('');
  const [contact, setContact] = useState('');

  // 첨부파일
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  // prefill이 있을 때 내용 자동 채우기
  useEffect(() => {
    if (isOpen && prefill) {
      // 에러 정보를 기반으로 content 생성
      const parts: string[] = [];

      if (prefill.courseName) {
        parts.push(`${t('prefixCourse')} ${prefill.courseName}`);
      }
      if (prefill.lectureDate) {
        parts.push(`${t('prefixLecture')} ${prefill.lectureDate}`);
      }
      if (prefill.errorMessage) {
        parts.push(`${t('prefixError')} ${prefill.errorMessage}`);
      }
      if (prefill.content) {
        parts.push(prefill.content);
      }

      if (parts.length > 0) {
        setContent(parts.join('\n') + '\n\n');
      }

      if (prefill.occurrenceContext) {
        setOccurrenceContext(prefill.occurrenceContext);
      }

      // 발생시각 설정 (ISO 8601 → datetime-local 형식으로 변환)
      if (prefill.occurrenceTime) {
        const date = new Date(prefill.occurrenceTime);
        // datetime-local 형식: YYYY-MM-DDTHH:mm
        const localDateTime = date.getFullYear() + '-' +
          String(date.getMonth() + 1).padStart(2, '0') + '-' +
          String(date.getDate()).padStart(2, '0') + 'T' +
          String(date.getHours()).padStart(2, '0') + ':' +
          String(date.getMinutes()).padStart(2, '0');
        setOccurrenceTime(localDateTime);
      }

      // prefill 적용 완료 콜백
      onPrefillApplied?.();
    }
  }, [isOpen, prefill, onPrefillApplied, t]);

  const resetForm = () => {
    setContent('');
    setOccurrenceTime('');
    setOccurrenceContext('');
    setRelatedFilename('');
    setContact('');
    setAttachmentFile(null);
    setFileError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError(null);

    if (!file) {
      setAttachmentFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(t('fileError.tooLarge'));
      setAttachmentFile(null);
      return;
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedTypes.includes(file.type)) {
      setFileError(t('fileError.unsupportedType'));
      setAttachmentFile(null);
      return;
    }

    setAttachmentFile(file);
  };

  const handleRemoveFile = () => {
    setAttachmentFile(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    const formData: ErrorReportFormData = {
      content: content.trim(),
    };

    if (occurrenceTime) {
      formData.occurrence_time = new Date(occurrenceTime).toISOString();
    }
    if (occurrenceContext) {
      formData.occurrence_context = occurrenceContext;
    }
    if (relatedFilename.trim()) {
      formData.related_filename = relatedFilename.trim();
    }
    if (contact.trim()) {
      formData.contact = contact.trim();
    }

    try {
      await onSubmit(formData, attachmentFile || undefined);
      resetForm();
    } catch (error) {
      console.error('오류 신고 제출 실패:', error);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  // 라벨 스타일 헬퍼
  const sharedLabel = (label: string, required?: boolean) => (
    <label className="text-sm font-semibold text-gray-700 mb-2 block">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[calc(100vw-1rem)] sm:max-w-[520px] max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="px-8 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
              <p className="mt-2 text-sm text-gray-500">
                {t('subtitle')}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 본문 - 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto px-8 py-5 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 발생시점 (기능) + 발생시각 */}
          <div className="flex gap-4">
            <div className="flex-1">
              {sharedLabel(t('occurrenceContext'))}
              <div className="relative">
                <select
                  value={occurrenceContext}
                  onChange={(e) => setOccurrenceContext(e.target.value as OccurrenceContext | '')}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 appearance-none bg-white disabled:bg-gray-50 disabled:cursor-not-allowed text-sm text-gray-900"
                >
                  <option value="">{t('selectPlaceholder')}</option>
                  {(Object.keys(OCCURRENCE_CONTEXT_LABELS) as OccurrenceContext[]).map((key) => (
                    <option key={key} value={key}>
                      {t(`context.${key}`)}
                    </option>
                  ))}
                </select>
                <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              {sharedLabel(t('occurrenceTime'))}
              <input
                type="datetime-local"
                value={occurrenceTime}
                onChange={(e) => setOccurrenceTime(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                disabled={isSubmitting}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 disabled:bg-gray-50 disabled:cursor-not-allowed cursor-pointer text-sm text-gray-900"
              />
            </div>
          </div>

          {/* 관련파일명 */}
          <div>
            {sharedLabel(t('relatedFile'))}
            <input
              type="text"
              value={relatedFilename}
              onChange={(e) => setRelatedFilename(e.target.value)}
              placeholder={t('placeholder.filename')}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 disabled:bg-gray-50 disabled:cursor-not-allowed text-sm text-gray-900 placeholder:text-gray-400"
            />
          </div>

          {/* 문의사항 (필수) */}
          <div>
            {sharedLabel(t('content'), true)}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('placeholder.content')}
              rows={4}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 resize-none disabled:bg-gray-50 disabled:cursor-not-allowed text-sm text-gray-900 placeholder:text-gray-400"
            />
            <p className="mt-2 text-xs text-gray-500">
              {t('hint.content')}
            </p>
          </div>

          {/* 연락처 정보 */}
          <div>
            {sharedLabel(t('contactInfo'))}
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={t('placeholder.contact')}
              disabled={isSubmitting}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 disabled:bg-gray-50 disabled:cursor-not-allowed text-sm text-gray-900 placeholder:text-gray-400"
            />
            <p className="mt-2 text-xs text-gray-500">
              {t('hint.contact')}
            </p>
          </div>

          {/* 첨부파일 */}
          <div>
            {sharedLabel(t('attachment'))}

            {!attachmentFile ? (
              <label
                className={`flex flex-col items-center justify-center w-full py-8 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors ${
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-gray-400" />
                </div>
                <span className="text-sm font-semibold text-gray-700">{t('dragOrClick')}</span>
                <span className="text-xs text-gray-500 mt-1">{t('attachmentTypes')}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  disabled={isSubmitting}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                />
              </label>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-300">
                <FileText className="w-8 h-8 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachmentFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachmentFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isSubmitting}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            )}

            {fileError && (
              <p className="mt-2 text-sm text-red-500">{fileError}</p>
            )}

            <p className="mt-2 text-xs text-gray-500">
              {t('hint.fileSize')}
            </p>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-8 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-colors ${
              !content.trim() || isSubmitting
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
