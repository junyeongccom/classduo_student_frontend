/**
 * @file MaterialsModal.tsx
 * @description 강의자료 문서파일 목록 모달 — 백엔드 Signed URL 기반 다운로드
 * @module features/lecture-study/components/ui
 * @dependencies lectureService, lucide-react
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { X, FileText, Download, Loader2 } from 'lucide-react'
import {
  lectureService,
  type SnapshotMaterialItem,
} from '../../services/lectureService'
import { courseLectureAnalytics } from '@/shared/lib/analytics'

interface MaterialsModalProps {
  open: boolean
  onClose: () => void
  lectureId: string
}

async function downloadMaterial(material: SnapshotMaterialItem) {
  const result = await lectureService.getMaterialDownloadUrl(material.material_id)

  if (result.error || !result.data?.download_url) {
    console.error('[MaterialsModal] Failed to get download URL:', result.error)
    return
  }

  const filename = result.data.filename || material.original_filename || 'document.pdf'

  try {
    const response = await fetch(result.data.download_url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(blobUrl)
  } catch (e) {
    console.error('[MaterialsModal] Download failed, falling back to new tab:', e)
    window.open(result.data.download_url, '_blank')
  }
}

export function MaterialsModal({
  open,
  onClose,
  lectureId,
}: MaterialsModalProps) {
  const locale = useLocale()
  const [materials, setMaterials] = useState<SnapshotMaterialItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const result = await lectureService.getSnapshotSelections(lectureId)
    if (result.data) {
      setMaterials(result.data.materials)
    }
    setIsLoading(false)
  }, [lectureId])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])

  const handleDownload = async (material: SnapshotMaterialItem) => {
    courseLectureAnalytics.materialDownload(lectureId, {
      material_id: material.material_id,
      filename: material.original_filename ?? undefined,
    })
    setDownloadingId(material.material_id)
    try {
      await downloadMaterial(material)
    } finally {
      setDownloadingId(null)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-2xl"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[#6366F1]" />
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
              {locale === 'ko' ? '강의 자료' : 'Lecture Materials'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : materials.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              {locale === 'ko' ? '강의자료가 없습니다' : 'No materials available'}
            </div>
          ) : (
            <div className="space-y-1">
              {materials.map(material => (
                <div
                  key={material.material_id}
                  className="group flex items-center justify-between rounded-lg border border-transparent p-4 transition-all hover:border-gray-100 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#6366F1]/10 text-[#6366F1]">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {material.original_filename}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(material)}
                    disabled={downloadingId === material.material_id}
                    className="ml-3 flex shrink-0 items-center gap-2 rounded-lg bg-[#6366F1] px-4 py-2 text-sm font-medium text-white shadow-sm shadow-[#6366F1]/20 transition-colors hover:bg-[#6366F1]/90 disabled:opacity-50"
                  >
                    {downloadingId === material.material_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    <span>{locale === 'ko' ? '다운로드' : 'Download'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-6">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-200 dark:bg-gray-700 px-6 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-all hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {locale === 'ko' ? '닫기' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
