/**
 * @file FeedbackModal.tsx
 * @description 새 UI 피드백 모달 — 발생항목/시각/연락처/내용/첨부파일
 * @module features/error-report/components/ui
 * @dependencies lucide-react, types
 */

'use client'

import { useState, useRef } from 'react'
import { X, MessageSquareText, Upload, FileText, Trash2, Loader2, ChevronDown, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { FeedbackCategory } from '../../types'
import { FEEDBACK_CATEGORY_LABELS } from '../../types'
import { DateTimePicker } from '@/shared/components/ui/DateTimePicker'

export interface FeedbackFormData {
  content: string
  occurrence_time?: string
  occurrence_context?: string
  contact?: string
}

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FeedbackFormData, attachmentFile?: File) => Promise<void>
  isSubmitting?: boolean
  error?: string | null
}

const MAX_CONTENT_LENGTH = 1000
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export function FeedbackModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  error = null,
}: FeedbackModalProps) {
  const t = useTranslations('feedbackModal')
  const [category, setCategory] = useState<FeedbackCategory | ''>('')
  const [occurrenceTime, setOccurrenceTime] = useState('')
  const [contact, setContact] = useState('')
  const [content, setContent] = useState('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setCategory('')
    setOccurrenceTime('')
    setContact('')
    setContent('')
    setAttachmentFile(null)
    setFileError(null)
    setIsDragOver(false)
  }

  const validateFile = (file: File): boolean => {
    setFileError(null)
    if (file.size > MAX_FILE_SIZE) {
      setFileError(t('fileError.tooLarge'))
      return false
    }
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      setFileError(t('fileError.unsupportedType'))
      return false
    }
    return true
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (validateFile(file)) {
      setAttachmentFile(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (validateFile(file)) {
      setAttachmentFile(file)
    }
  }

  const handleRemoveFile = () => {
    setAttachmentFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    const formData: FeedbackFormData = {
      content: content.trim(),
    }
    if (occurrenceTime) {
      formData.occurrence_time = new Date(occurrenceTime).toISOString()
    }
    if (category) {
      formData.occurrence_context = category
    }
    if (contact.trim()) {
      formData.contact = contact.trim()
    }

    try {
      await onSubmit(formData, attachmentFile || undefined)
      resetForm()
    } catch {
      // Container handles error display
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) handleClose()
      }}
    >
      <div className="flex w-full max-w-[calc(100vw-1rem)] sm:max-w-[640px] flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl" style={{ maxHeight: 'calc(100dvh - 2rem)' }}>
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
              <MessageSquareText className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">{t('title')}</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content — Scrollable */}
        <div className="flex-1 space-y-5 overflow-y-auto px-8 py-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Row: 발생 항목 + 발생시각 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 발생 항목 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('category')}</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackCategory | '')}
                  disabled={isSubmitting}
                  className="h-12 w-full appearance-none rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 pl-4 pr-10 text-sm text-gray-900 dark:text-gray-100 outline-none transition-all focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">{t('categoryPlaceholder')}</option>
                  {(Object.keys(FEEDBACK_CATEGORY_LABELS) as FeedbackCategory[]).map((key) => (
                    <option key={key} value={key}>
                      {t(`categoryLabel.${key}`)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            {/* 발생시각 */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('occurrenceTime')}</label>
              <DateTimePicker
                value={occurrenceTime}
                onChange={setOccurrenceTime}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* 연락처 정보 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700">{t('contactInfo')}</label>
            <div className="relative">
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t('contactPlaceholder')}
                disabled={isSubmitting}
                className="h-12 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 pl-11 pr-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none transition-all focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
              />
              <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            </div>
          </div>

          {/* 내용 */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('content')} <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-gray-400">
                {content.length} / {MAX_CONTENT_LENGTH}
              </span>
            </div>
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= MAX_CONTENT_LENGTH) {
                  setContent(e.target.value)
                }
              }}
              placeholder={t('contentPlaceholder')}
              rows={5}
              disabled={isSubmitting}
              className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-4 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 outline-none transition-all focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 disabled:cursor-not-allowed disabled:bg-gray-100"
            />
          </div>

          {/* 첨부 파일 */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('attachment')}</label>

            {!attachmentFile ? (
              <label
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
                  isDragOver
                    ? 'border-[#6366F1] bg-[#6366F1]/5'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-[#6366F1]'
                } ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm transition-colors ${
                  isDragOver ? 'text-[#6366F1]' : 'text-gray-400 group-hover:text-[#6366F1]'
                }`}>
                  <Upload className="h-6 w-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-700">
                    {t('dragOrClick')}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('fileLimit')}
                  </p>
                </div>
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
              <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{attachmentFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(attachmentFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  disabled={isSubmitting}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {fileError && (
              <p className="text-sm text-red-500">{fileError}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-8 py-6">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="h-12 rounded-lg px-6 font-bold text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="h-12 rounded-lg bg-[#6366F1] px-8 font-bold text-white shadow-lg shadow-[#6366F1]/20 transition-all hover:-translate-y-0.5 hover:bg-[#6366F1]/90 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('submitting')}
              </span>
            ) : (
              t('submit')
            )}
          </button>
        </footer>
      </div>
    </div>
  )
}
