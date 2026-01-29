'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface AddReviewWordModalProps {
  isOpen: boolean
  onClose: () => void
  isSubmitting?: boolean
  errorMessage?: string | null
  title: string
  submitLabel: string
  initialKeyword?: string
  initialDescription?: string
  onSubmit: (keyword: string, description: string) => Promise<boolean> | boolean
}

export function AddReviewWordModal({
  isOpen,
  onClose,
  isSubmitting = false,
  errorMessage = null,
  title,
  submitLabel,
  initialKeyword = '',
  initialDescription = '',
  onSubmit,
}: AddReviewWordModalProps) {
  const [keyword, setKeyword] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setKeyword(initialKeyword)
    setDescription(initialDescription)
  }, [isOpen, initialKeyword, initialDescription])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyword.trim() || !description.trim()) return
    const ok = await onSubmit(keyword.trim(), description.trim())
    if (ok) {
      handleClose()
    }
  }

  const handleClose = () => {
    setKeyword('')
    setDescription('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={handleClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        {/* 닫기 버튼 (X) */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          type="button"
        >
          <X className="h-5 w-5" />
        </button>

        {/* 제목 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 핵심 어휘 (짧은 빈칸) */}
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium text-slate-700 mb-2">
              핵심 어휘
            </label>
            <input
              id="keyword"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="핵심 어휘를 입력하세요"
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* 핵심 내용 (긴 빈칸) */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              핵심 내용
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="핵심 내용을 입력하세요"
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 resize-none"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* 단어 추가하기 버튼 */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 transition-colors"
          >
            {isSubmitting ? '처리 중...' : submitLabel}
          </button>
        </form>
      </div>
    </div>
  )
}

