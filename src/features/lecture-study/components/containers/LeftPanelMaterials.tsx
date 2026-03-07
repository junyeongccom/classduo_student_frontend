/**
 * @file LeftPanelMaterials.tsx
 * @description 좌측 패널 - 연속 스크롤 이미지 뷰어 (다중 material 지원, lazy loading, 메모리 관리)
 * @module features/lecture-study/components/containers
 * @dependencies lectureService, useLectureStudyStore
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, FileText, Loader2, AlertTriangle } from 'lucide-react'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'
import { lectureService } from '../../services/lectureService'
import type { MaterialPageItem } from '../../services/lectureService'

/** 성공적으로 로딩된 페이지 */
interface LoadedPage {
  type: 'page'
  materialId: string
  pageIndex: number
  imageUrl: string | null
}

/** 로딩 실패한 material placeholder */
interface ErrorPage {
  type: 'error'
  materialId: string
}

type PageEntry = LoadedPage | ErrorPage

function isValidImageUrl(url: string): boolean {
  return url.startsWith('https://') || /^http:\/\/localhost(:\d+)?(\/|$)/.test(url)
}

/** 뷰포트 밖 이미지 unload 임계값 (±페이지 수) */
const UNLOAD_THRESHOLD = 15

export function LeftPanelMaterials() {
  const t = useTranslations()
  const lectureId = useLectureStudyStore((s) => s.lectureId)
  const targetPage = useLectureStudyStore((s) => s.targetPage)
  const setTargetPage = useLectureStudyStore((s) => s.setTargetPage)
  const setTotalMaterialPages = useLectureStudyStore((s) => s.setTotalMaterialPages)

  const [allPages, setAllPages] = useState<PageEntry[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /** 각 페이지 요소 ref 배열 */
  const pageRefs = useRef<(HTMLDivElement | null)[]>([])
  /** 스크롤 컨테이너 ref */
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  /** 프로그래밍적 스크롤 중 여부 (Observer 업데이트 억제용) */
  const isScrollingRef = useRef(false)
  /** 현재 페이지 ref (IntersectionObserver 콜백에서 최신 값 참조용) */
  const currentPageRef = useRef(1)
  /** 각 페이지의 이미지 로딩 상태 */
  const loadedImagesRef = useRef<Set<number>>(new Set())
  /** 이미지 에러로 retry한 material 추적 */
  const retriedMaterialsRef = useRef<Set<string>>(new Set())
  /** material별 원본 pages 데이터 (URL 재발급용) */
  const materialPagesMapRef = useRef<Map<string, MaterialPageItem[]>>(new Map())
  /** scrollToPage settle ID (R-AW3 fix: 연속 호출 시 이전 settle 무효화) */
  const settleIdRef = useRef(0)

  const totalPages = allPages.length

  // currentPageRef 동기화 (IntersectionObserver 콜백에서 최신 값 참조용)
  useEffect(() => {
    currentPageRef.current = currentPage
  }, [currentPage])

  // totalMaterialPages를 store에 반영 (SummaryTabContainer 출처 범위 검증용)
  useEffect(() => {
    setTotalMaterialPages(totalPages)
  }, [totalPages, setTotalMaterialPages])

  // ─── 다중 material 로딩 (Task 767) ───
  useEffect(() => {
    if (!lectureId) return
    let cancelled = false

    async function fetchAllMaterials() {
      setIsLoading(true)
      setError(null)
      setAllPages([])
      setCurrentPage(1)
      pageRefs.current = [] // R-AW4 fix: stale ref 방지
      loadedImagesRef.current.clear()
      retriedMaterialsRef.current.clear()
      materialPagesMapRef.current.clear()

      try {
        const snapshotResult = await lectureService.getSnapshotSelections(lectureId!)
        if (cancelled) return

        const materials = snapshotResult.data?.materials ?? []
        if (materials.length === 0) {
          setIsLoading(false)
          return
        }

        // Promise.allSettled로 부분 실패 허용
        const results = await Promise.allSettled(
          materials.map((mat) => lectureService.getMaterialPages(mat.material_id)),
        )
        if (cancelled) return

        const pages: PageEntry[] = []
        for (let i = 0; i < materials.length; i++) {
          const result = results[i]
          const materialId = materials[i].material_id

          if (result.status === 'fulfilled' && result.value.data?.pages) {
            const sorted = [...result.value.data.pages].sort(
              (a, b) => a.page_number - b.page_number,
            )
            materialPagesMapRef.current.set(materialId, sorted)
            for (let j = 0; j < sorted.length; j++) {
              pages.push({
                type: 'page',
                materialId,
                pageIndex: j,
                imageUrl: sorted[j].image_url,
              })
            }
          } else {
            // 로딩 실패 → 원래 페이지 수만큼 에러 placeholder 삽입 (인덱스 정합성 유지)
            const pageCount = materials[i].total_pages ?? 1
            for (let j = 0; j < pageCount; j++) {
              pages.push({ type: 'error', materialId })
            }
          }
        }

        setAllPages(pages)
        setIsLoading(false)
      } catch (err) {
        if (cancelled) return
        console.error('[LeftPanelMaterials] fetchAllMaterials failed')
        setError('MATERIALS_LOAD_ERROR')
        setIsLoading(false)
      }
    }

    fetchAllMaterials()
    return () => {
      cancelled = true
    }
  }, [lectureId])

  // ─── Intersection Observer: 현재 페이지 감지 (Task 764) ───
  useEffect(() => {
    if (allPages.length === 0 || !scrollContainerRef.current) return

    const ratioMap = new Map<number, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return

        for (const entry of entries) {
          const idx = Number(entry.target.getAttribute('data-page-index'))
          if (!Number.isNaN(idx)) {
            ratioMap.set(idx, entry.intersectionRatio)
          }
        }

        // 가장 많이 보이는 페이지를 currentPage로
        let maxRatio = 0
        let maxIdx = 0
        for (const [idx, ratio] of ratioMap) {
          if (ratio > maxRatio) {
            maxRatio = ratio
            maxIdx = idx
          }
        }
        if (maxRatio > 0) {
          setCurrentPage(maxIdx + 1) // 1-indexed
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
      },
    )

    for (let i = 0; i < pageRefs.current.length; i++) {
      const el = pageRefs.current[i]
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [allPages])

  // ─── Lazy loading (Task 769) ───
  useEffect(() => {
    if (allPages.length === 0 || !scrollContainerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue

          const img = entry.target.querySelector('img[data-lazy]') as HTMLImageElement | null
          if (!img) continue

          // 뷰포트 진입 → 이미지 로딩
          const realSrc = img.getAttribute('data-src')
          if (realSrc && img.src !== realSrc) {
            img.src = realSrc
          }
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '600px 0px',
        threshold: [0],
      },
    )

    for (let i = 0; i < pageRefs.current.length; i++) {
      const el = pageRefs.current[i]
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [allPages])

  // ─── 메모리 관리: 뷰포트 바깥 이미지 unload (Task 770, R-AW2 fix: 별도 debounce) ───
  useEffect(() => {
    if (allPages.length === 0) return

    let timerId: ReturnType<typeof setTimeout> | null = null
    const runMemoryCleanup = () => {
      for (let i = 0; i < pageRefs.current.length; i++) {
        const el = pageRefs.current[i]
        if (!el) continue

        const img = el.querySelector('img[data-lazy]') as HTMLImageElement | null
        if (!img) continue

        if (Math.abs(i - (currentPageRef.current - 1)) > UNLOAD_THRESHOLD) {
          if (img.src && img.getAttribute('data-src')) {
            img.removeAttribute('src')
          }
        }
      }
    }

    const handleScroll = () => {
      if (timerId) clearTimeout(timerId)
      // 프로그래밍적 스크롤(페이지 점프) 중에는 cleanup 건너뛰기
      if (isScrollingRef.current) return
      timerId = setTimeout(runMemoryCleanup, 500)
    }

    const container = scrollContainerRef.current
    container?.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container?.removeEventListener('scroll', handleScroll)
      if (timerId) clearTimeout(timerId)
    }
  }, [allPages])

  // ─── 화살표 클릭 → 스크롤 이동 (Task 765) ───
  const scrollToPage = useCallback(
    (pageIdx: number) => {
      const el = pageRefs.current[pageIdx]
      if (!el || !scrollContainerRef.current) return

      isScrollingRef.current = true
      setCurrentPage(pageIdx + 1)

      // 목적지 주변 이미지를 미리 로딩 (깜박임 방지)
      const preloadRange = UNLOAD_THRESHOLD
      for (let i = Math.max(0, pageIdx - preloadRange); i < Math.min(pageRefs.current.length, pageIdx + preloadRange + 1); i++) {
        const pageEl = pageRefs.current[i]
        if (!pageEl) continue
        const img = pageEl.querySelector('img[data-lazy]') as HTMLImageElement | null
        if (img) {
          const realSrc = img.getAttribute('data-src')
          if (realSrc && img.src !== realSrc) {
            img.src = realSrc
          }
        }
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'start' })

      // R-AW3 fix: settleId로 연속 호출 시 이전 settle 무효화
      const mySettleId = ++settleIdRef.current
      const container = scrollContainerRef.current
      let settled = false
      const settle = () => {
        if (settled || mySettleId !== settleIdRef.current) return
        settled = true
        isScrollingRef.current = false
        container.removeEventListener('scrollend', settle)
      }
      container.addEventListener('scrollend', settle, { once: true })
      setTimeout(settle, 1000) // fallback (긴 점프 대비 여유 확보)
    },
    [],
  )

  // 수동 스크롤 감지 → 프로그래밍적 스크롤 중단
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let lastTouchY = 0
    const handleWheel = () => {
      if (isScrollingRef.current) {
        isScrollingRef.current = false
      }
    }
    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? 0
    }
    const handleTouchMove = (e: TouchEvent) => {
      const dy = Math.abs((e.touches[0]?.clientY ?? 0) - lastTouchY)
      if (dy > 5 && isScrollingRef.current) {
        isScrollingRef.current = false
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: true })
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: true })
    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
    }
  }, [allPages])

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 2) // 0-indexed
    }
  }, [currentPage, scrollToPage])

  const handleNextPage = useCallback(() => {
    if (currentPage < allPages.length) {
      scrollToPage(currentPage) // currentPage는 1-indexed, 다음 = currentPage (0-indexed)
    }
  }, [currentPage, allPages.length, scrollToPage])

  // ─── Store targetPage 소비 (Task 782) ───
  useEffect(() => {
    if (targetPage == null || allPages.length === 0) return

    // targetPage는 0-indexed 배열 인덱스
    if (targetPage >= 0 && targetPage < allPages.length) {
      requestAnimationFrame(() => {
        scrollToPage(targetPage)
        setTargetPage(null)
      })
    } else {
      setTargetPage(null)
    }
  }, [targetPage, allPages.length, scrollToPage, setTargetPage])

  /** 언마운트 추적 (R-AW5 fix) */
  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // ─── 이미지 로딩 에러 시 URL 재발급 (Task 771) ───
  const handleImageError = useCallback(
    async (pageIdx: number, entry: LoadedPage) => {
      const key = `${entry.materialId}-${entry.pageIndex}`
      if (retriedMaterialsRef.current.has(key)) return
      retriedMaterialsRef.current.add(key)

      try {
        // S-AW3 fix: 이미 재발급된 material의 캐시가 있으면 API 재호출 없이 재사용
        let sorted = materialPagesMapRef.current.get(entry.materialId)
        if (!sorted) {
          const result = await lectureService.getMaterialPages(entry.materialId)
          if (!isMountedRef.current) return // R-AW5 fix: 언마운트 가드
          if (result.data?.pages) {
            sorted = [...result.data.pages].sort((a, b) => a.page_number - b.page_number)
            materialPagesMapRef.current.set(entry.materialId, sorted)
          }
        }

        if (!isMountedRef.current || !sorted) return

        if (entry.pageIndex >= 0 && entry.pageIndex < sorted.length) {
          const newPage = sorted[entry.pageIndex]
          // S-AW1 fix: 재발급 URL에도 isValidImageUrl 검증 적용
          if (newPage?.image_url && isValidImageUrl(newPage.image_url)) {
            const img = pageRefs.current[pageIdx]?.querySelector('img[data-lazy]') as HTMLImageElement | null
            if (img) {
              img.setAttribute('data-src', newPage.image_url)
              img.src = newPage.image_url
            }
          }
        }
      } catch {
        // 재시도 실패 — 무시
      }
    },
    [],
  )

  // ─── 렌더링 ───

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

  if (allPages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
        <FileText className="h-10 w-10" />
        <p className="text-sm">{t('lectureStudy.leftPanel.materialsEmpty')}</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 연속 스크롤 컨테이너 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto bg-gray-100"
      >
        <div className="flex flex-col">
          {allPages.map((entry, idx) => (
            <div
              key={idx}
              ref={(el) => { pageRefs.current[idx] = el }}
              data-page-index={idx}
              className="relative w-full"
              style={{ minHeight: 200 }}
            >
              {entry.type === 'error' ? (
                /* 에러 placeholder (Task 768) */
                <div className="flex h-[400px] flex-col items-center justify-center gap-2 bg-gray-50 text-gray-400">
                  <AlertTriangle className="h-8 w-8" />
                  <p className="text-sm">{t('lectureStudy.error.materialsLoadError')}</p>
                </div>
              ) : entry.imageUrl && isValidImageUrl(entry.imageUrl) ? (
                <>
                  {/* placeholder 오버레이 — onLoad에서 imperative하게 hidden 처리 */}
                  <div className="placeholder-overlay absolute inset-0 flex items-center justify-center">
                    <div className="h-full w-full animate-pulse rounded-lg bg-gray-200" />
                  </div>
                  <img
                    data-lazy="true"
                    src={idx < 3 ? entry.imageUrl ?? undefined : undefined}
                    data-src={entry.imageUrl}
                    alt={t('lectureStudy.leftPanel.pageAlt', { page: idx + 1 })}
                    className="w-full object-contain"
                    onLoad={(e) => {
                      loadedImagesRef.current.add(idx)
                      // placeholder를 imperative하게 숨김 (ref 기반 상태라 리렌더링 없이 처리)
                      const placeholder = (e.target as HTMLElement).parentElement?.querySelector('.placeholder-overlay')
                      if (placeholder) (placeholder as HTMLElement).classList.add('hidden')
                    }}
                    onError={() => {
                      handleImageError(idx, entry)
                    }}
                  />
                </>
              ) : (
                <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">
                  {t('lectureStudy.leftPanel.materialsPreparing')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2">
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <span className="text-sm text-gray-600 dark:text-gray-400">
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPage >= allPages.length}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
