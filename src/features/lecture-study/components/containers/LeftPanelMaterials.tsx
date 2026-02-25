/**
 * @file LeftPanelMaterials.tsx
 * @description 좌측 패널 - 이미지 기반 PDF 뷰어 (materials/{materialId}/page_NNNN.jpg)
 * @module features/lecture-study/components/containers
 * @dependencies lectureService, useLectureStudyStore
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, FileText, Loader2 } from 'lucide-react'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'
import { lectureService } from '../../services/lectureService'
import type { MaterialPageItem } from '../../services/lectureService'

interface PageCache {
  [pageNumber: number]: string | null
}

function isValidImageUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://localhost')
}

export function LeftPanelMaterials() {
  const t = useTranslations()
  const lectureId = useLectureStudyStore((s) => s.lectureId)

  const [materialId, setMaterialId] = useState<string | null>(null)
  const [pages, setPages] = useState<MaterialPageItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageCache = useRef<PageCache>({})

  // 1) lecture → material (input_snapshot_id 기반)
  useEffect(() => {
    if (!lectureId) return
    let cancelled = false

    async function fetchMaterial() {
      setIsLoading(true)
      setError(null)
      setMaterialId(null)
      setPages([])

      try {
        const snapshotResult = await lectureService.getSnapshotSelections(lectureId!)
        if (cancelled) return

        const materials = snapshotResult.data?.materials ?? []
        if (materials.length === 0) {
          setIsLoading(false)
          return
        }

        const firstMaterialId = materials[0].material_id
        setMaterialId(firstMaterialId)

        const pagesResult = await lectureService.getMaterialPages(firstMaterialId)
        if (cancelled) return

        if (pagesResult.error || !pagesResult.data) {
          console.error('[LeftPanelMaterials] Failed to load pages:', pagesResult.error)
          setError('MATERIALS_LOAD_ERROR')
          setIsLoading(false)
          return
        }

        const sortedPages = [...(pagesResult.data.pages ?? [])].sort(
          (a, b) => a.page_number - b.page_number,
        )
        setPages(sortedPages)
        setTotalPages(pagesResult.data.total_count || sortedPages.length)
        setCurrentPage(1)
        setIsLoading(false)

        // cache first page URL
        if (sortedPages.length > 0 && sortedPages[0].image_url) {
          imageCache.current[sortedPages[0].page_number] = sortedPages[0].image_url
        }
      } catch (err) {
        if (cancelled) return
        console.error('[LeftPanelMaterials] fetchMaterial error:', err)
        setError('MATERIALS_LOAD_ERROR')
        setIsLoading(false)
      }
    }

    fetchMaterial()
    return () => { cancelled = true }
  }, [lectureId])

  // Current page image URL
  const currentPageData = useMemo(
    () => pages.find((p) => p.page_number === currentPage),
    [pages, currentPage],
  )

  const currentImageUrl = useMemo(() => {
    const url = currentPageData?.image_url ?? null
    if (url && !isValidImageUrl(url)) return null
    return url
  }, [currentPageData])

  // Preload adjacent pages
  useEffect(() => {
    if (pages.length === 0) return

    const pagesToPreload = [currentPage - 1, currentPage - 2, currentPage + 1, currentPage + 2]
    for (const pn of pagesToPreload) {
      if (pn < 1 || pn > totalPages) continue
      const page = pages.find((p) => p.page_number === pn)
      if (page?.image_url && isValidImageUrl(page.image_url) && !imageCache.current[pn]) {
        imageCache.current[pn] = page.image_url
        const img = new Image()
        img.src = page.image_url
      }
    }
  }, [currentPage, pages, totalPages])

  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setImageLoaded(false)
        setCurrentPage(page)
      }
    },
    [totalPages],
  )

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <p className="text-sm">{t('lectureStudy.error.materialsLoadError')}</p>
      </div>
    )
  }

  if (!materialId || pages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <FileText className="h-10 w-10" />
        <p className="text-sm">{t('lectureStudy.leftPanel.materialsEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable content: image + text/visual summary */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-100 flex flex-col">
        {/* Page image */}
        <div className="relative flex flex-1 items-center justify-center p-2" style={{ minHeight: 200 }}>
          {currentImageUrl ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
                </div>
              )}
              <img
                key={currentPage}
                src={currentImageUrl}
                alt={`Page ${currentPage}`}
                className="max-w-full object-contain"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="flex items-center justify-center text-sm text-gray-400">
              {t('lectureStudy.leftPanel.materialsPreparing')}
            </div>
          )}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-4 py-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="text-sm text-gray-600">
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
