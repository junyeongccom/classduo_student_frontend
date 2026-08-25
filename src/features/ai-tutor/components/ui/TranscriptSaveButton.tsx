/**
 * @file TranscriptSaveButton.tsx
 * @description 대화 내역을 PDF(브라우저 인쇄)로 저장하는 조용한 아이콘 버튼 (Pure UI)
 * @module features/ai-tutor/components/ui
 * @dependencies lucide-react
 */
'use client'

import { FileDown } from 'lucide-react'

interface Props {
  onClick: () => void
  disabled?: boolean
  /** 툴팁 + 스크린리더 라벨 */
  label: string
}

export default function TranscriptSaveButton({ onClick, disabled, label }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-500 dark:text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
    >
      <FileDown className="h-4 w-4" aria-hidden="true" />
    </button>
  )
}
