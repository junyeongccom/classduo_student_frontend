"use client"

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { X } from "lucide-react"
import { createPortal } from "react-dom"
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist"

type PdfAnnotationPath = {
  id?: string
  points: Array<{ x: number; y: number }>
  color: string
  width: number
  opacity?: number
  kind?: "pen" | "highlighter"
}

type PdfAnnotationText = {
  id: string
  x: number
  y: number
  w?: number
  h?: number
  text: string
  color: string
  fontSize: number
  backgroundColor?: string
}

export type PdfAnnotationData = {
  paths: PdfAnnotationPath[]
  texts?: PdfAnnotationText[]
}

type PdfAnnotationMap = Record<number, PdfAnnotationData>

type ExamPrepPdfViewerProps = {
  url: string
  annotations: PdfAnnotationMap
  onAnnotationChange: (pageNumber: number, data: PdfAnnotationData) => void
  onPageCountChange?: (pageCount: number) => void
  currentPage?: number
  onPageChange?: (pageNumber: number) => void
  hideToolbars?: boolean
}

const DEFAULT_COLOR = "#111827"
const DEFAULT_WIDTH = 2
const TEXT_WIDTH_FACTOR = 0.6
const DEFAULT_TEXT_BOX_W = 0.22
const DEFAULT_TEXT_BOX_H = 0.07
const MIN_TEXT_BOX_W = 0.06
const MIN_TEXT_BOX_H = 0.04

const annotationClipboard: { paths: PdfAnnotationPath[]; texts: PdfAnnotationText[] } = {
  paths: [],
  texts: [],
}

export function ExamPrepPdfViewer({
  url,
  annotations,
  onAnnotationChange,
  onPageCountChange,
  currentPage,
  onPageChange,
  hideToolbars = false,
}: ExamPrepPdfViewerProps) {
  const t = useTranslations("examPrep.pdf")
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const isProgrammaticScroll = useRef(false)
  const settleIdRef = useRef(0)
  const ignoreExternalPageSync = useRef(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loadError, setLoadError] = useState<{ key: string; params?: Record<string, string> } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [internalPage, setInternalPage] = useState(1)
  const [tool, setTool] = useState<"none" | "draw" | "erase" | "text">("none")
  const [penKind, setPenKind] = useState<"pen" | "highlighter">("pen")
  const [penColor, setPenColor] = useState("#111827")
  const [penWidth, setPenWidth] = useState(2)
  const [eraserMode, setEraserMode] = useState<"object" | "area">("object")
  const [eraserSize, setEraserSize] = useState(6)
  const [textColor, setTextColor] = useState("#111827")
  const [textBgColor, setTextBgColor] = useState("#ffffff")
  const [textSize, setTextSize] = useState(16)
  const [rotation, setRotation] = useState(0)
  const [isSpreadView, setIsSpreadView] = useState(false)
  const [isToolbarHidden, setIsToolbarHidden] = useState(false)
  const [zoomInput, setZoomInput] = useState("100")
  const zoomTimer = useRef<number | null>(null)

  const applyZoom = useCallback(
    (nextZoom: number) => {
      const container = listRef.current
      if (!container || nextZoom === zoom) {
        setZoom(nextZoom)
        return
      }
      const prevZoom = zoom
      const scale = nextZoom / prevZoom
      const centerX = container.scrollLeft + container.clientWidth / 2
      const centerY = container.scrollTop + container.clientHeight / 2
      setZoom(nextZoom)
      requestAnimationFrame(() => {
        const current = listRef.current
        if (!current) return
        current.scrollLeft = Math.max(0, centerX * scale - current.clientWidth / 2)
        current.scrollTop = Math.max(0, centerY * scale - current.clientHeight / 2)
      })
    },
    [zoom]
  )

  const handleFitToWidth = useCallback(() => {
    // In this viewer, zoom=1 maps page width to the container width
    // (or half-width for spread view), which removes horizontal scrollbars.
    applyZoom(1)
  }, [applyZoom])

  useEffect(() => {
    GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString()
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadPdf = async () => {
      if (!url || url.trim() === '') {
        if (isMounted) {
          setLoadError({ key: 'errorNoUrl' })
          setIsLoading(false)
        }
        return
      }
      try {
        setIsLoading(true)
        setLoadError(null)
        const loadingTask = getDocument({ url })
        const doc = await loadingTask.promise
        if (!isMounted) return
        setPdfDoc(doc)
        setPageCount(doc.numPages)
        onPageCountChange?.(doc.numPages)
        setInternalPage(1)
      } catch (error) {
        if (!isMounted) return
        setPdfDoc(null)
        setPageCount(0)
        onPageCountChange?.(0)
        const errObj = (error ?? null) as any
        const errName = typeof errObj?.name === 'string' ? errObj.name : null
        const errMessage = typeof errObj?.message === 'string' ? errObj.message : null
        const errStatus =
          typeof errObj?.status === 'number'
            ? errObj.status
            : typeof errObj?.status === 'string'
              ? errObj.status
              : typeof errObj?.response?.status === 'number'
                ? errObj.response.status
                : null

        const derivedMessage = (() => {
          if (error instanceof Error) return error.message || error.name || t("unknownError")
          if (errMessage) return errName ? `${errName}: ${errMessage}` : errMessage
          if (errName) return errName
          if (typeof error === 'string') return error
          if (error && typeof error === 'object') {
            try {
              // pdf.js 예외 객체는 own enumerable이 비어있는 경우가 있어, 가능한 속성을 넓게 직렬화 시도
              return JSON.stringify(error, Object.getOwnPropertyNames(error))
            } catch {
              return String(error)
            }
          }
          return String(error)
        })()

        const loadErrorInfo = ((): { key: string; params?: Record<string, string> } => {
          if (errName === 'InvalidPDFException') return { key: 'errorInvalidPdf' }
          if (errName === 'MissingPDFException') return { key: 'errorMissingPdf' }
          if (errName === 'PasswordException') return { key: 'errorPasswordPdf' }
          if (errName === 'UnexpectedResponseException' && errStatus) return { key: 'errorRequestFailed', params: { status: String(errStatus) } }
          return { key: 'errorLoadFailed', params: { message: derivedMessage } }
        })()

        setLoadError(loadErrorInfo)

        const errorInfo: Record<string, unknown> = {
          url: url || 'undefined',
          derivedMessage,
          errName,
          errMessage,
          errStatus,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          errorString: String(error),
        }

        if (error instanceof Error) {
          errorInfo.errorStack = error.stack
        }
        try {
          errorInfo.errorJson = JSON.stringify(error, Object.getOwnPropertyNames(error))
        } catch {
          // ignore
        }

        // error 자체도 함께 넘겨 devtools에서 prototype/message 확인 가능하게 함
        console.error('PDF load failed:', errorInfo, error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }
    loadPdf()
    return () => {
      isMounted = false
    }
  }, [onPageCountChange, url])

  useEffect(() => {
    if (!containerRef.current) return
    const element = containerRef.current
    const updateSize = () => {
      setContainerWidth(element.getBoundingClientRect().width)
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const activePage = currentPage ?? internalPage
  const pageNumbers = useMemo(() => {
    if (!pageCount) return []
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }, [pageCount])

  useEffect(() => {
    // Sync external page changes (e.g., "출처" jump) with actual scroll position.
    if (!currentPage) return
    if (!pageCount) return
    const bounded = Math.min(Math.max(currentPage, 1), pageCount || 1)
    setInternalPage(bounded)
    if (ignoreExternalPageSync.current) {
      ignoreExternalPageSync.current = false
      return
    }
    const target = pageRefs.current[bounded]
    if (target) {
      isProgrammaticScroll.current = true
      target.scrollIntoView({ behavior: "smooth", block: "start" })
      const mySettleId = ++settleIdRef.current
      const container = listRef.current
      let settled = false
      const settle = () => {
        if (settled || mySettleId !== settleIdRef.current) return
        settled = true
        isProgrammaticScroll.current = false
        container?.removeEventListener("scrollend", settle)
      }
      container?.addEventListener("scrollend", settle, { once: true })
      window.setTimeout(settle, 600)
    }
  }, [currentPage, pageCount, pageNumbers])

  useEffect(() => {
    if (!pageCount) return
    if (activePage > pageCount) {
      const nextPage = pageCount
      setInternalPage(nextPage)
      onPageChange?.(nextPage)
    }
  }, [activePage, onPageChange, pageCount])

  useEffect(() => {
    setZoomInput(String(Math.round(zoom * 100)))
  }, [zoom])

  useEffect(() => {
    if (zoomTimer.current) {
      window.clearTimeout(zoomTimer.current)
    }
    const parsed = Number(zoomInput)
    if (!Number.isFinite(parsed)) return
    zoomTimer.current = window.setTimeout(() => {
      applyZoom(Math.min(2.5, Math.max(0.5, parsed / 100)))
    }, 150)
    return () => {
      if (zoomTimer.current) {
        window.clearTimeout(zoomTimer.current)
      }
    }
  }, [applyZoom, zoomInput])

  const handlePageChange = (nextPage: number) => {
    const bounded = Math.min(Math.max(nextPage, 1), pageCount || 1)
    setInternalPage(bounded)
    // We already scroll here; don't snap again when parent echoes `currentPage` back.
    ignoreExternalPageSync.current = true
    onPageChange?.(bounded)
    const target = pageRefs.current[bounded]
    if (target) {
      isProgrammaticScroll.current = true
      target.scrollIntoView({ behavior: "smooth", block: "start" })
      const mySettleId = ++settleIdRef.current
      const container = listRef.current
      let settled = false
      const settle = () => {
        if (settled || mySettleId !== settleIdRef.current) return
        settled = true
        isProgrammaticScroll.current = false
        container?.removeEventListener("scrollend", settle)
      }
      container?.addEventListener("scrollend", settle, { once: true })
      window.setTimeout(settle, 600)
    }
  }

  useEffect(() => {
    const container = listRef.current
    if (!container) return
    let raf = 0
    const onScroll = () => {
      if (isProgrammaticScroll.current) return
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (isProgrammaticScroll.current) return
        const scrollTop = container.scrollTop
        let closestPage = activePage
        let closestDistance = Number.POSITIVE_INFINITY
        pageNumbers.forEach(pageNumber => {
          const node = pageRefs.current[pageNumber]
          if (!node) return
          const distance = Math.abs(node.offsetTop - scrollTop)
          if (distance < closestDistance) {
            closestDistance = distance
            closestPage = pageNumber
          }
        })
        if (closestPage !== activePage) {
          setInternalPage(closestPage)
          // This change originated from user scrolling; do NOT snap-scroll to page top.
          ignoreExternalPageSync.current = true
          onPageChange?.(closestPage)
        }
      })
    }
    container.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [activePage, onPageChange, pageNumbers])

  if (!url) {
    return null
  }

  return (
    <div ref={containerRef} className="flex h-full w-full flex-col overflow-hidden">
      {!hideToolbars && (
        <div className="flex items-center justify-between border-b border-gray-900 bg-gray-900 px-3 py-2 text-white">
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => handlePageChange(activePage - 1)}
            disabled={activePage <= 1}
            className="rounded border border-gray-700 px-2 py-1 disabled:opacity-40"
          >
            {t("prev")}
          </button>
          <span>
            {activePage}/{pageCount || 1}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(activePage + 1)}
            disabled={activePage >= pageCount}
            className="rounded border border-gray-700 px-2 py-1 disabled:opacity-40"
          >
            {t("next")}
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyZoom(Math.max(0.6, Math.round((zoom - 0.1) * 10) / 10))}
            className="rounded border border-gray-700 px-2 py-1"
          >
            -
          </button>
          <input
            value={zoomInput}
            onChange={event => setZoomInput(event.target.value)}
            onBlur={() => {
              const parsed = Number(zoomInput)
              if (Number.isFinite(parsed)) {
                applyZoom(Math.min(2.5, Math.max(0.5, parsed / 100)))
              } else {
                setZoomInput(String(Math.round(zoom * 100)))
              }
            }}
            className="h-7 w-14 rounded border border-gray-700 bg-gray-800 px-1 text-center text-xs text-white"
          />
          <span>%</span>
          <button
            type="button"
            onClick={() => applyZoom(Math.min(2, Math.round((zoom + 0.1) * 10) / 10))}
            className="rounded border border-gray-700 px-2 py-1"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleFitToWidth}
            className="rounded border border-gray-700 px-2 py-1"
          >
            {t("fit")}
          </button>
          <button
            type="button"
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="rounded border border-gray-700 px-2 py-1"
          >
            {t("rotate")}
          </button>
          <button
            type="button"
            onClick={() => setIsSpreadView(prev => !prev)}
            className="rounded border border-gray-700 px-2 py-1"
          >
            {isSpreadView ? t("singleColumn") : t("splitView")}
          </button>
          <button
            type="button"
            onClick={() => setIsToolbarHidden(prev => !prev)}
            className="rounded border border-gray-700 px-2 py-1"
          >
            {t("hideTools")}
          </button>
        </div>
      </div>
      )}
      {!hideToolbars && !isToolbarHidden && (
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
          <button
            type="button"
            onClick={() => setTool("none")}
            className={`rounded border px-2 py-1 ${tool === "none" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}
          >
            {t("defaultTool")}
          </button>
          <button
            type="button"
            onClick={() => setTool("draw")}
            className={`rounded border px-2 py-1 ${tool === "draw" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}
          >
            {t("drawTool")}
          </button>
          <button
            type="button"
            onClick={() => setTool("erase")}
            className={`rounded border px-2 py-1 ${tool === "erase" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}
          >
            {t("eraserTool")}
          </button>
          <button
            type="button"
            onClick={() => setTool("text")}
            className={`rounded border px-2 py-1 ${tool === "text" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}
          >
            {t("textTool")}
          </button>
          {tool === "draw" && (
            <>
              <select
                value={penKind}
                onChange={event => setPenKind(event.target.value as "pen" | "highlighter")}
                className="rounded border border-gray-200 bg-white px-2 py-1"
              >
                <option value="pen">{t("pen")}</option>
                <option value="highlighter">{t("highlighter")}</option>
              </select>
              <label className="flex items-center gap-2">
                {t("color")}
                <input
                  type="color"
                  value={penColor}
                  onChange={event => setPenColor(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2">
                {t("thickness")}
                <input
                  type="range"
                  min={1}
                  max={14}
                  value={penWidth}
                  onChange={event => setPenWidth(Number(event.target.value))}
                />
              </label>
            </>
          )}
          {tool === "erase" && (
            <>
              <select
                value={eraserMode}
                onChange={event => setEraserMode(event.target.value as "object" | "area")}
                className="rounded border border-gray-200 bg-white px-2 py-1"
              >
                <option value="object">{t("objectEraser")}</option>
                <option value="area">{t("areaEraser")}</option>
              </select>
              <label className="flex items-center gap-2">
                {t("size")}
                <input
                  type="range"
                  min={2}
                  max={24}
                  value={eraserSize}
                  onChange={event => setEraserSize(Number(event.target.value))}
                />
                <span className="min-w-[32px] text-[10px] text-gray-600">{eraserSize}px</span>
              </label>
            </>
          )}
          {tool === "text" && (
            <>
              <label className="flex items-center gap-2">
                {t("textColor")}
                <input
                  type="color"
                  value={textColor}
                  onChange={event => setTextColor(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2">
                {t("background")}
                <input
                  type="color"
                  value={textBgColor}
                  onChange={event => setTextBgColor(event.target.value)}
                />
              </label>
              <select
                value={textSize}
                onChange={event => setTextSize(Number(event.target.value))}
                className="rounded border border-gray-200 bg-white px-2 py-1"
              >
                {[12, 14, 16, 18, 20, 24, 28].map(size => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      )}
      <div ref={listRef} className="flex-1 overflow-auto">
        <div className={isSpreadView ? "grid grid-cols-2 gap-0 px-0 py-0" : "flex flex-col gap-0 px-0 py-0"}>
          {loadError ? (
            <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white text-sm text-gray-400">
              {t(loadError.key, loadError.params)}
            </div>
          ) : isLoading ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center">
              <video
                className="w-full max-w-[240px] rounded-lg shadow-sm"
                src="/TEST.mp4"
                autoPlay
                muted
                loop
                playsInline
              />
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-700">{t("loadingTitle")}</p>
                <p className="text-xs text-gray-500">{t("loadingSubtitle")}</p>
              </div>
            </div>
          ) : (
            pdfDoc &&
            pageNumbers.map(pageNumber => (
              <div
                key={pageNumber}
                ref={node => {
                  pageRefs.current[pageNumber] = node
                }}
              >
                <PdfPage
                  pdfDoc={pdfDoc}
                  pageNumber={pageNumber}
                  containerWidth={(isSpreadView ? containerWidth / 2 : containerWidth) * zoom}
                  rotation={rotation}
                  tool={tool}
                  penKind={penKind}
                  penColor={penColor}
                  penWidth={penWidth}
                  eraserMode={eraserMode}
                  eraserSize={eraserSize}
                  textStyle={{ color: textColor, fontSize: textSize, backgroundColor: textBgColor }}
                  annotation={annotations[pageNumber]}
                  onAnnotationChange={onAnnotationChange}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

type PdfPageProps = {
  pdfDoc: import("pdfjs-dist").PDFDocumentProxy
  pageNumber: number
  containerWidth: number
  rotation: number
  tool: "none" | "draw" | "erase" | "text"
  penKind: "pen" | "highlighter"
  penColor: string
  penWidth: number
  eraserMode: "object" | "area"
  eraserSize: number
  textStyle: { color: string; fontSize: number; backgroundColor: string }
  annotation?: PdfAnnotationData
  onAnnotationChange: (pageNumber: number, data: PdfAnnotationData) => void
}

function PdfPage({
  pdfDoc,
  pageNumber,
  containerWidth,
  rotation,
  tool,
  penKind,
  penColor,
  penWidth,
  eraserMode,
  eraserSize,
  textStyle,
  annotation,
  onAnnotationChange,
}: PdfPageProps) {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<import("pdfjs-dist").RenderTask | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const currentPath = useRef<PdfAnnotationPath | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [selectedTextIds, setSelectedTextIds] = useState<string[]>([])
  const [selectedPathIndexes, setSelectedPathIndexes] = useState<number[]>([])
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const selectionStart = useRef<{ x: number; y: number } | null>(null)
  const eraserFrameRef = useRef<number | null>(null)
  const lastErasePointRef = useRef<{ x: number; y: number } | null>(null)
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null)
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    let isMounted = true
    const renderPage = async () => {
      const page = await pdfDoc.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1 })
      const nextScale = containerWidth ? containerWidth / viewport.width : 1
      if (!isMounted) return

      const scaledViewport = page.getViewport({ scale: nextScale, rotation })
      const canvas = pdfCanvasRef.current
      const overlay = overlayCanvasRef.current
      if (!canvas || !overlay) return

      canvas.width = scaledViewport.width
      canvas.height = scaledViewport.height
      overlay.width = scaledViewport.width
      overlay.height = scaledViewport.height
      setPageSize({ width: scaledViewport.width, height: scaledViewport.height })

      const ctx = canvas.getContext("2d")
      if (!ctx) return
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
      }
      const task = page.render({ canvasContext: ctx, viewport: scaledViewport })
      renderTaskRef.current = task
      try {
        await task.promise
      } catch (error) {
        if ((error as { name?: string })?.name !== "RenderingCancelledException") {
          throw error
        }
        return
      }
      drawAnnotations(overlay, annotation, null, selectedPathIndexes)
    }
    renderPage()

    return () => {
      isMounted = false
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel()
        renderTaskRef.current = null
      }
    }
  }, [containerWidth, pageNumber, pdfDoc, rotation])

  useEffect(() => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    drawAnnotations(overlay, annotation, null, selectedPathIndexes)
  }, [annotation, selectedPathIndexes])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (editingTextId) return
      if (!event.ctrlKey && !event.metaKey) return
      if (event.key !== "c" && event.key !== "x" && event.key !== "v") return

      const paths = annotation?.paths ?? []
      const texts = annotation?.texts ?? []

      if (event.key === "c" || event.key === "x") {
        const selectedPaths = selectedPathIndexes.map(index => paths[index]).filter(Boolean)
        const selectedTexts = texts.filter(text => selectedTextIds.includes(text.id))
        annotationClipboard.paths = selectedPaths.map(path => ({ ...path, points: [...path.points] }))
        annotationClipboard.texts = selectedTexts.map(text => ({ ...text }))
        try {
          navigator.clipboard?.writeText(
            JSON.stringify({ paths: annotationClipboard.paths, texts: annotationClipboard.texts })
          )
        } catch {}
        if (event.key === "x") {
          const remainingPaths = paths.filter((_, index) => !selectedPathIndexes.includes(index))
          const remainingTexts = texts.filter(text => !selectedTextIds.includes(text.id))
          onAnnotationChange(pageNumber, { paths: remainingPaths, texts: remainingTexts })
          setSelectedPathIndexes([])
          setSelectedTextIds([])
        }
      }

      if (event.key === "v") {
        const offset = 0.02
        const pastedPaths = annotationClipboard.paths.map(path => ({
          ...path,
          points: path.points.map(point => ({
            x: Math.min(Math.max(point.x + offset, 0), 1),
            y: Math.min(Math.max(point.y + offset, 0), 1),
          })),
        }))
        const pastedTexts = annotationClipboard.texts.map(text => ({
          ...text,
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          x: Math.min(Math.max(text.x + offset, 0), 1),
          y: Math.min(Math.max(text.y + offset, 0), 1),
        }))
        onAnnotationChange(pageNumber, {
          paths: [...paths, ...pastedPaths],
          texts: [...texts, ...pastedTexts],
        })
        setSelectedPathIndexes([])
        setSelectedTextIds(pastedTexts.map(text => text.id))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [annotation, editingTextId, onAnnotationChange, pageNumber, selectedPathIndexes, selectedTextIds])

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    if (tool === "none") {
      const point = getNormalizedPoint(event, overlay)
      selectionStart.current = point
      setSelectionRect({ x: point.x, y: point.y, w: 0, h: 0 })
      overlay.setPointerCapture(event.pointerId)
      return
    }

    if (tool === "text") {
      return
    }

    if (tool === "erase") {
      setIsDrawing(true)
      lastErasePointRef.current = getNormalizedPoint(event, overlay)
      scheduleErase(
        overlay,
        annotation,
        pageNumber,
        onAnnotationChange,
        eraserMode,
        eraserSize,
        eraserFrameRef,
        lastErasePointRef
      )
      return
    }

    overlay.setPointerCapture(event.pointerId)
    setIsDrawing(true)
    const point = getNormalizedPoint(event, overlay)
    currentPath.current = {
      points: [point],
      color: penColor,
      width: penWidth,
      opacity: penKind === "highlighter" ? 0.35 : 1,
      kind: penKind,
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "erase") {
      const overlay = overlayCanvasRef.current
      if (overlay) {
        const point = getNormalizedPoint(event, overlay)
        setEraserCursor(point)
      }
    } else if (eraserCursor) {
      setEraserCursor(null)
    }
    if (tool === "none") {
      const overlay = overlayCanvasRef.current
      if (!overlay || !selectionStart.current) return
      const point = getNormalizedPoint(event, overlay)
      const start = selectionStart.current
      const x = Math.min(start.x, point.x)
      const y = Math.min(start.y, point.y)
      const w = Math.abs(start.x - point.x)
      const h = Math.abs(start.y - point.y)
      setSelectionRect({ x, y, w, h })
      return
    }
    if (tool === "erase") {
      if (!isDrawing) return
      const overlay = overlayCanvasRef.current
      if (!overlay) return
      lastErasePointRef.current = getNormalizedPoint(event, overlay)
      scheduleErase(
        overlay,
        annotation,
        pageNumber,
        onAnnotationChange,
        eraserMode,
        eraserSize,
        eraserFrameRef,
        lastErasePointRef
      )
      return
    }
    if (!isDrawing || !currentPath.current) return
    const overlay = overlayCanvasRef.current
    if (!overlay) return
    const point = getNormalizedPoint(event, overlay)
    currentPath.current.points.push(point)
    drawAnnotations(overlay, annotation, currentPath.current, selectedPathIndexes)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const overlay = overlayCanvasRef.current
    if (tool === "none") {
      if (!overlay) return
      overlay.releasePointerCapture(event.pointerId)
      const rect = selectionRect
      selectionStart.current = null
      if (rect && rect.w > 0.01 && rect.h > 0.01) {
        const { selectedPaths, selectedTexts } = getSelectionFromRect(rect, annotation)
        setSelectedPathIndexes(selectedPaths)
        setSelectedTextIds(selectedTexts)
      } else {
        setSelectedPathIndexes([])
        setSelectedTextIds([])
      }
      setSelectionRect(null)
      return
    }
    if (tool === "erase") {
      setIsDrawing(false)
      setEraserCursor(null)
      if (eraserFrameRef.current) {
        cancelAnimationFrame(eraserFrameRef.current)
        eraserFrameRef.current = null
      }
      return
    }
    if (!overlay || !currentPath.current) return
    overlay.releasePointerCapture(event.pointerId)
    setIsDrawing(false)
    const next = {
      paths: [...(annotation?.paths ?? []), currentPath.current],
      texts: [...(annotation?.texts ?? [])],
    }
    currentPath.current = null
    onAnnotationChange(pageNumber, next)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="relative">
        <canvas
          ref={pdfCanvasRef}
          style={{
            width: pageSize?.width ? `${pageSize.width}px` : "100%",
            height: pageSize?.height ? `${pageSize.height}px` : "auto",
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute left-0 top-0 touch-none"
          style={{
            width: pageSize?.width ? `${pageSize.width}px` : "100%",
            height: pageSize?.height ? `${pageSize.height}px` : "auto",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            setIsDrawing(false)
            setEraserCursor(null)
          }}
        />
        <TextLayer
          texts={annotation?.texts ?? []}
          editingTextId={editingTextId}
          onEdit={setEditingTextId}
          selectedTextIds={selectedTextIds}
          onSelect={setSelectedTextIds}
          textStyle={textStyle}
          enableInteraction={tool === "text"}
          onUpdate={texts =>
            onAnnotationChange(pageNumber, {
              paths: [...(annotation?.paths ?? [])],
              texts,
            })
          }
        />
        {tool === "erase" && eraserCursor && pageSize && (
          <div
            className="pointer-events-none absolute rounded-full border border-blue-400/70"
            style={{
              width: `${eraserSize}px`,
              height: `${eraserSize}px`,
              left: `${eraserCursor.x * pageSize.width - eraserSize / 2}px`,
              top: `${eraserCursor.y * pageSize.height - eraserSize / 2}px`,
            }}
          />
        )}
        {selectionRect && (
          <div
            className="absolute border border-dashed border-blue-400 bg-blue-100/20"
            style={{
              left: `${selectionRect.x * 100}%`,
              top: `${selectionRect.y * 100}%`,
              width: `${selectionRect.w * 100}%`,
              height: `${selectionRect.h * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  )
}

const getNormalizedPoint = (event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) => {
  const rect = canvas.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  return { x, y }
}

const getPathBounds = (path: PdfAnnotationPath) => {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  path.points.forEach(point => {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  })
  return { minX, minY, maxX, maxY }
}

const getTextBounds = (text: PdfAnnotationText) => {
  if (typeof text.w === "number" && typeof text.h === "number") {
    return {
      minX: text.x,
      minY: text.y,
      maxX: text.x + Math.max(0, text.w),
      maxY: text.y + Math.max(0, text.h),
    }
  }
  const width = (text.text?.length ?? 1) * text.fontSize * TEXT_WIDTH_FACTOR
  const height = text.fontSize * 1.2
  return {
    minX: text.x,
    minY: text.y,
    maxX: text.x + width / 1000,
    maxY: text.y + height / 1000,
  }
}

const rectIntersects = (
  rect: { x: number; y: number; w: number; h: number },
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
) => {
  const rectMaxX = rect.x + rect.w
  const rectMaxY = rect.y + rect.h
  return !(bounds.minX > rectMaxX || bounds.maxX < rect.x || bounds.minY > rectMaxY || bounds.maxY < rect.y)
}

const getSelectionFromRect = (
  rect: { x: number; y: number; w: number; h: number },
  annotation: PdfAnnotationData | undefined
) => {
  const selectedPaths: number[] = []
  const selectedTexts: string[] = []

  ;(annotation?.paths ?? []).forEach((path, index) => {
    const bounds = getPathBounds(path)
    if (rectIntersects(rect, bounds)) {
      selectedPaths.push(index)
    }
  })

  ;(annotation?.texts ?? []).forEach(text => {
    const bounds = getTextBounds(text)
    if (rectIntersects(rect, bounds)) {
      selectedTexts.push(text.id)
    }
  })

  return { selectedPaths, selectedTexts }
}

const drawAnnotations = (
  canvas: HTMLCanvasElement,
  annotation?: PdfAnnotationData,
  activePath?: PdfAnnotationPath | null,
  selectedPathIndexes: number[] = []
) => {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const drawPath = (path: PdfAnnotationPath) => {
    if (path.points.length < 2) return
    ctx.strokeStyle = path.color
    ctx.lineWidth = path.width
    ctx.globalAlpha = path.opacity ?? 1
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    path.points.forEach((point, index) => {
      const x = point.x * canvas.width
      const y = point.y * canvas.height
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  annotation?.paths?.forEach((path, index) => {
    drawPath(path)
    if (selectedPathIndexes.includes(index)) {
      ctx.save()
      ctx.strokeStyle = "#2563eb"
      ctx.lineWidth = Math.max(1, path.width + 1)
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      path.points.forEach((point, pointIndex) => {
        const x = point.x * canvas.width
        const y = point.y * canvas.height
        if (pointIndex === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.restore()
    }
  })
  ctx.globalAlpha = 1
  if (activePath) {
    drawPath(activePath)
  }
}

const eraseAtPoint = (
  point: { x: number; y: number },
  canvas: HTMLCanvasElement,
  annotation: PdfAnnotationData | undefined,
  pageNumber: number,
  onAnnotationChange: (pageNumber: number, data: PdfAnnotationData) => void,
  mode: "object" | "area",
  radius: number
) => {
  const erasePathArea = (path: PdfAnnotationPath) => {
    const segments: PdfAnnotationPath[] = []
    let current: Array<{ x: number; y: number }> = []
    path.points.forEach(p => {
      const dx = p.x - point.x
      const dy = p.y - point.y
      const isInside = Math.sqrt(dx * dx + dy * dy) <= radius
      if (isInside) {
        if (current.length > 1) {
          segments.push({ ...path, points: current })
        }
        current = []
      } else {
        current.push(p)
      }
    })
    if (current.length > 1) {
      segments.push({ ...path, points: current })
    }
    return segments
  }

  const nextPaths =
    mode === "object"
      ? (annotation?.paths ?? []).filter(path => {
          return !path.points.some(p => {
            const dx = p.x - point.x
            const dy = p.y - point.y
            return Math.sqrt(dx * dx + dy * dy) <= radius
          })
        })
      : (annotation?.paths ?? []).flatMap(path => erasePathArea(path))
  onAnnotationChange(pageNumber, {
    paths: nextPaths.filter(path => path.points.length > 1),
    texts: annotation?.texts ?? [],
  })
}

const scheduleErase = (
  canvas: HTMLCanvasElement,
  annotation: PdfAnnotationData | undefined,
  pageNumber: number,
  onAnnotationChange: (pageNumber: number, data: PdfAnnotationData) => void,
  mode: "object" | "area",
  size: number,
  frameRef: React.MutableRefObject<number | null>,
  pointRef: React.MutableRefObject<{ x: number; y: number } | null>
) => {
  if (frameRef.current) return
  frameRef.current = requestAnimationFrame(() => {
    frameRef.current = null
    const point = pointRef.current
    if (!point) return
    const minDimension = Math.max(1, Math.min(canvas.width, canvas.height))
    const radius = Math.max(0.002, Math.min(0.2, (size / 2) / minDimension))
    eraseAtPoint(point, canvas, annotation, pageNumber, onAnnotationChange, mode, radius)
  })
}

const TextLayer = ({
  texts,
  editingTextId,
  onEdit,
  selectedTextIds,
  onSelect,
  textStyle,
  enableInteraction,
  onUpdate,
}: {
  texts: PdfAnnotationText[]
  editingTextId: string | null
  onEdit: (id: string | null) => void
  selectedTextIds: string[]
  onSelect: (ids: string[]) => void
  textStyle: { color: string; fontSize: number; backgroundColor: string }
  enableInteraction: boolean
  onUpdate: (texts: PdfAnnotationText[]) => void
}) => {
  const t = useTranslations("examPrep.pdf")
  const layerRef = useRef<HTMLDivElement>(null)
  const textsRef = useRef<PdfAnnotationText[]>(texts)
  const deleteButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const draggingId = useRef<string | null>(null)
  const dragStartClient = useRef<{ x: number; y: number } | null>(null)
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null)
  const didDrag = useRef(false)
  const suppressNextClick = useRef(false)
  const suppressCreateOnce = useRef(false)
  const creatingId = useRef<string | null>(null)
  const creatingStart = useRef<{ x: number; y: number } | null>(null)
  const resizingId = useRef<string | null>(null)
  const [expandedTextIds, setExpandedTextIds] = useState<Set<string>>(() => new Set())
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [pendingDeleteAnchor, setPendingDeleteAnchor] = useState<DOMRect | null>(null)
  const toggleTimerRef = useRef<number | null>(null)
  const toggleTimerTextIdRef = useRef<string | null>(null)

  const autosizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return
    // This viewer uses the parent container's scroll. The textarea must expand to its content height
    // even before the user types (otherwise scroll can be "randomly" unavailable).
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }

  const clearToggleTimer = () => {
    if (!toggleTimerRef.current) return
    window.clearTimeout(toggleTimerRef.current)
    toggleTimerRef.current = null
    toggleTimerTextIdRef.current = null
  }

  const normalizePointFromLayer = (clientX: number, clientY: number) => {
    const layer = layerRef.current
    if (!layer) return null
    const rect = layer.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const x = (clientX - rect.left) / rect.width
    const y = (clientY - rect.top) / rect.height
    return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) }
  }

  const clampBox = (box: { x: number; y: number; w: number; h: number }) => {
    const w = Math.min(Math.max(box.w, MIN_TEXT_BOX_W), 1)
    const h = Math.min(Math.max(box.h, MIN_TEXT_BOX_H), 1)
    const x = Math.min(Math.max(box.x, 0), Math.max(0, 1 - w))
    const y = Math.min(Math.max(box.y, 0), Math.max(0, 1 - h))
    return { x, y, w: Math.min(w, 1 - x), h: Math.min(h, 1 - y) }
  }

  const getBoxSize = (text: PdfAnnotationText) => {
    const w = typeof text.w === "number" ? text.w : DEFAULT_TEXT_BOX_W
    const h = typeof text.h === "number" ? text.h : DEFAULT_TEXT_BOX_H
    return clampBox({ x: text.x, y: text.y, w, h })
  }

  const getCollapsedPreview = (value: string) => {
    const firstLine = (value ?? "").split("\n")[0] ?? ""
    const hasMore = (value ?? "").includes("\n") || firstLine.length > 5 || (value ?? "").length > firstLine.length
    if (!hasMore) return firstLine
    const prefix = firstLine.length > 5 ? firstLine.slice(0, 5) : firstLine
    return `${prefix}...`
  }

  const commitTextEdit = (id: string, value: string, options?: { collapseAfter?: boolean }) => {
    const next = textsRef.current.map(item => (item.id === id ? { ...item, text: value } : item))
    onUpdate(next)
    onEdit(null)

    if (options?.collapseAfter) {
      setExpandedTextIds(prev => {
        if (!prev.has(id)) return prev
        const nextSet = new Set(prev)
        nextSet.delete(id)
        return nextSet
      })
    } else {
      setExpandedTextIds(prev => {
        if (prev.has(id)) return prev
        const nextSet = new Set(prev)
        nextSet.add(id)
        return nextSet
      })
    }

    if (options?.collapseAfter) {
      // Prevent the click that caused blur from immediately toggling expand/collapse,
      // or creating a new text box.
      suppressNextClick.current = true
      suppressCreateOnce.current = true
      window.setTimeout(() => {
        suppressNextClick.current = false
        suppressCreateOnce.current = false
      }, 0)
    }
  }

  useEffect(() => {
    textsRef.current = texts
  }, [texts])

  useEffect(() => {
    // Keep expansion state consistent with the current text list.
    setExpandedTextIds(prev => {
      if (prev.size === 0) return prev
      const ids = new Set(texts.map(item => item.id))
      let hasChange = false
      const next = new Set<string>()
      prev.forEach(id => {
        if (ids.has(id)) {
          next.add(id)
        } else {
          hasChange = true
        }
      })
      return hasChange ? next : prev
    })
  }, [texts])

  useEffect(() => {
    // Close delete confirm when leaving expanded/reading mode or when the target disappears.
    if (!pendingDeleteId) return
    const exists = texts.some(item => item.id === pendingDeleteId)
    if (!exists) {
      setPendingDeleteId(null)
      setPendingDeleteAnchor(null)
      return
    }
  }, [pendingDeleteId, texts])

  useEffect(() => {
    if (!pendingDeleteId) return
    const handlePointerDown = (event: PointerEvent) => {
      // Use composedPath to reliably detect clicks inside the confirm UI
      // (event.target can be an SVG child, where closest() checks may fail in some browsers).
      const path = typeof event.composedPath === "function" ? event.composedPath() : []
      for (const node of path) {
        if (!(node instanceof Element)) continue
        if (node.getAttribute?.("data-text-delete-confirm") === "true") return
      }
      setPendingDeleteId(null)
      setPendingDeleteAnchor(null)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return
      setPendingDeleteId(null)
      setPendingDeleteAnchor(null)
    }
    window.addEventListener("pointerdown", handlePointerDown, { capture: true })
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, { capture: true } as AddEventListenerOptions)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [pendingDeleteId])

  const DeleteConfirmPortal = ({
    open,
    anchor,
    onYes,
    onNo,
  }: {
    open: boolean
    anchor: DOMRect | null
    onYes: () => void
    onNo: () => void
  }) => {
    const popoverRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

    const updatePos = useCallback(() => {
      if (!anchor) return
      const popover = popoverRef.current
      const width = popover?.offsetWidth ?? 180
      const height = popover?.offsetHeight ?? 74

      const margin = 8
      const gap = 6
      const viewportW = window.innerWidth
      const viewportH = window.innerHeight

      // Prefer below the X button, right-aligned to it.
      let left = anchor.right - width
      left = Math.min(Math.max(left, margin), Math.max(margin, viewportW - width - margin))

      const belowTop = anchor.bottom + gap
      const aboveTop = anchor.top - gap - height
      const canFitBelow = belowTop + height <= viewportH - margin
      const top = canFitBelow ? belowTop : Math.max(margin, aboveTop)

      setPos({ top, left })
    }, [anchor])

    useLayoutEffect(() => {
      if (!open || !anchor) return
      updatePos()

      let raf = 0
      const schedule = () => {
        if (raf) return
        raf = window.requestAnimationFrame(() => {
          raf = 0
          updatePos()
        })
      }

      window.addEventListener("resize", schedule)
      // Capture all scrolls (including nested containers) so the anchored portal follows the X button.
      window.addEventListener("scroll", schedule, true)
      return () => {
        if (raf) window.cancelAnimationFrame(raf)
        window.removeEventListener("resize", schedule)
        window.removeEventListener("scroll", schedule, true)
      }
    }, [anchor, open, updatePos])

    if (!open || !anchor) return null
    if (typeof document === "undefined") return null

    return createPortal(
      <div
        ref={popoverRef}
        data-text-delete-confirm="true"
        className="fixed z-[120] w-[180px] rounded-lg border border-gray-200 bg-white p-2 text-[11px] text-gray-900 shadow-lg"
        style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
      >
        <div className="mb-2 leading-snug">{t("textDeleteConfirm")}</div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
            onMouseDown={event => {
              event.preventDefault()
            }}
            onPointerDown={event => {
              event.stopPropagation()
              event.preventDefault()
            }}
            onClick={event => {
              event.stopPropagation()
              event.preventDefault()
              onNo()
            }}
          >
            {t("no")}
          </button>
          <button
            type="button"
            className="rounded bg-gray-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-gray-800"
            onMouseDown={event => {
              event.preventDefault()
            }}
            onPointerDown={event => {
              event.stopPropagation()
              event.preventDefault()
            }}
            onClick={event => {
              event.stopPropagation()
              event.preventDefault()
              onYes()
            }}
          >
            {t("yes")}
          </button>
        </div>
      </div>,
      document.body
    )
  }

  useEffect(() => {
    if (!editingTextId) return
    // Ensure the full content is visible while editing (or right after creation).
    setExpandedTextIds(prev => {
      if (prev.has(editingTextId)) return prev
      const next = new Set(prev)
      next.add(editingTextId)
      return next
    })
  }, [editingTextId])

  useEffect(() => {
    if (selectedTextIds.length === 0 || editingTextId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return
      const next = texts.filter(item => !selectedTextIds.includes(item.id))
      onUpdate(next)
      onSelect([])
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [editingTextId, onSelect, onUpdate, selectedTextIds, texts])

  return (
    <div
      ref={layerRef}
      className={`absolute inset-0 ${enableInteraction ? "pointer-events-auto" : "pointer-events-none"}`}
      onPointerDown={event => {
        if (!enableInteraction) return
        if (event.button !== 0) return
        if (event.target !== event.currentTarget) return
        if (suppressCreateOnce.current) return
        if (editingTextId) return
        if (resizingId.current) return

        const point = normalizePointFromLayer(event.clientX, event.clientY)
        if (!point) return

        // Double-click + drag: create and resize while dragging, then enter edit on pointer up.
        if (event.detail >= 2) {
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
          creatingId.current = id
          creatingStart.current = point
          const initial = clampBox({ x: point.x, y: point.y, w: MIN_TEXT_BOX_W, h: MIN_TEXT_BOX_H })
          const newText: PdfAnnotationText = {
            id,
            x: initial.x,
            y: initial.y,
            w: initial.w,
            h: initial.h,
            text: "",
            color: textStyle.color,
            fontSize: textStyle.fontSize,
            backgroundColor: textStyle.backgroundColor,
          }
          onUpdate([...textsRef.current, newText])
          onSelect([id])
          setExpandedTextIds(prev => {
            const next = new Set(prev)
            next.add(id)
            return next
          })
          event.currentTarget.setPointerCapture(event.pointerId)
          return
        }

        // Single click: create a default-sized box and immediately enter edit.
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
        const base = clampBox({ x: point.x, y: point.y, w: DEFAULT_TEXT_BOX_W, h: DEFAULT_TEXT_BOX_H })
        const newText: PdfAnnotationText = {
          id,
          x: base.x,
          y: base.y,
          w: base.w,
          h: base.h,
          text: "",
          color: textStyle.color,
          fontSize: textStyle.fontSize,
          backgroundColor: textStyle.backgroundColor,
        }
        onUpdate([...textsRef.current, newText])
        onSelect([id])
        setExpandedTextIds(prev => {
          const next = new Set(prev)
          next.add(id)
          return next
        })
        onEdit(id)
      }}
      onPointerMove={event => {
        if (!enableInteraction) return
        const id = creatingId.current
        const start = creatingStart.current
        if (!id || !start) return
        const point = normalizePointFromLayer(event.clientX, event.clientY)
        if (!point) return

        const x = Math.min(start.x, point.x)
        const y = Math.min(start.y, point.y)
        const w = Math.abs(point.x - start.x)
        const h = Math.abs(point.y - start.y)
        const nextBox = clampBox({ x, y, w, h })

        const next = textsRef.current.map(item =>
          item.id === id ? { ...item, x: nextBox.x, y: nextBox.y, w: nextBox.w, h: nextBox.h } : item
        )
        onUpdate(next)
      }}
      onPointerUp={event => {
        const id = creatingId.current
        if (!id) return
        event.currentTarget.releasePointerCapture(event.pointerId)
        creatingId.current = null
        creatingStart.current = null
        // Enter edit mode after finishing the drag-resize creation.
        onEdit(id)
      }}
    >
      {texts.map(text => {
        const isExpanded = expandedTextIds.has(text.id)
        const box = getBoxSize(text)
        const preview = getCollapsedPreview(text.text)
        const displayText = isExpanded ? text.text : preview
        const isEditing = editingTextId === text.id
        return (
          <div
            key={text.id}
            className={[
              "pointer-events-auto absolute rounded border",
              isEditing ? "border-dashed border-blue-400" : "border-solid border-gray-300",
              selectedTextIds.includes(text.id) ? "ring-1 ring-blue-400 ring-offset-2 ring-offset-white" : "",
            ].join(" ")}
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: isExpanded ? `${box.h * 100}%` : `${Math.min(24, Math.max(18, text.fontSize * 1.4))}px`,
              color: text.color,
              fontSize: text.fontSize,
              backgroundColor: text.backgroundColor ?? "transparent",
              transform: "translate(-0%, -0%)",
              overflow: "hidden",
            }}
            onClick={event => {
              if (editingTextId === text.id) return
              const canToggle = (text.text ?? "").includes("\n") || (text.text?.length ?? 0) > 5
              if (!canToggle) return
              // Prevent toggling from the 2nd click of a double-click.
              if (event.detail !== 1) return
              if (suppressNextClick.current) return
              if (creatingId.current) return
              if (resizingId.current) return
              // If this pointer sequence was a drag, ignore the click.
              if (didDrag.current) {
                didDrag.current = false
                return
              }
              clearToggleTimer()
              toggleTimerTextIdRef.current = text.id
              toggleTimerRef.current = window.setTimeout(() => {
                setExpandedTextIds(prev => {
                  const next = new Set(prev)
                  if (next.has(text.id)) next.delete(text.id)
                  else next.add(text.id)
                  return next
                })
                toggleTimerRef.current = null
                toggleTimerTextIdRef.current = null
              }, 220)
            }}
            onPointerDown={event => {
              if (event.button !== 0) return
              if (editingTextId === text.id) return
              if (creatingId.current) return
              if (resizingId.current) return
              draggingId.current = text.id
              didDrag.current = false
              dragStartClient.current = { x: event.clientX, y: event.clientY }
              const point = normalizePointFromLayer(event.clientX, event.clientY)
              if (point) {
                dragOffset.current = { dx: point.x - box.x, dy: point.y - box.y }
              } else {
                dragOffset.current = { dx: 0, dy: 0 }
              }
              onSelect([text.id])
              event.currentTarget.setPointerCapture(event.pointerId)
            }}
            onPointerMove={event => {
              const layer = layerRef.current
              if (!layer || draggingId.current !== text.id || event.buttons !== 1) return
              if (resizingId.current) return
              const start = dragStartClient.current
              if (start && !didDrag.current) {
                const dx = event.clientX - start.x
                const dy = event.clientY - start.y
                if (dx * dx + dy * dy >= 9) {
                  didDrag.current = true
                }
              }
              const point = normalizePointFromLayer(event.clientX, event.clientY)
              if (!point) return
              const offset = dragOffset.current ?? { dx: 0, dy: 0 }
              const nextX = point.x - offset.dx
              const nextY = point.y - offset.dy
              const clamped = clampBox({ x: nextX, y: nextY, w: box.w, h: box.h })
              const next = textsRef.current.map(item =>
                item.id === text.id
                  ? { ...item, x: clamped.x, y: clamped.y, w: clamped.w, h: clamped.h }
                  : item
              )
              onUpdate(next)
            }}
            onPointerUp={event => {
              event.currentTarget.releasePointerCapture(event.pointerId)
              draggingId.current = null
              dragStartClient.current = null
              dragOffset.current = null
            }}
            onPointerLeave={() => {
              draggingId.current = null
              dragStartClient.current = null
              dragOffset.current = null
            }}
            onDoubleClick={event => {
              event.stopPropagation()
              if (editingTextId === text.id) return
              if (toggleTimerTextIdRef.current === text.id) {
                clearToggleTimer()
              }
              setExpandedTextIds(prev => {
                if (prev.has(text.id)) return prev
                const next = new Set(prev)
                next.add(text.id)
                return next
              })
              onEdit(text.id)
            }}
          >
            {/* Delete button (expanded, read/edit) */}
            {isExpanded && (
              <div className="absolute right-1 top-1 z-10" data-text-delete-confirm="true">
                <button
                  type="button"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black text-white shadow-sm hover:bg-black/90"
                  ref={node => {
                    deleteButtonRefs.current[text.id] = node
                  }}
                  onMouseDown={event => {
                    // Prevent focusing/blur side-effects.
                    event.preventDefault()
                  }}
                  onPointerDown={event => {
                    event.stopPropagation()
                    event.preventDefault()
                  }}
                  onClick={event => {
                    event.stopPropagation()
                    event.preventDefault()
                    setPendingDeleteId(prev => {
                      const next = prev === text.id ? null : text.id
                      if (next) {
                        const rect = deleteButtonRefs.current[text.id]?.getBoundingClientRect() ?? null
                        setPendingDeleteAnchor(rect)
                      } else {
                        setPendingDeleteAnchor(null)
                      }
                      return next
                    })
                  }}
                  aria-label={t("deleteAria")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <DeleteConfirmPortal
              open={pendingDeleteId === text.id}
              anchor={pendingDeleteId === text.id ? pendingDeleteAnchor : null}
              onNo={() => {
                setPendingDeleteId(null)
                setPendingDeleteAnchor(null)
              }}
              onYes={() => {
                const next = textsRef.current.filter(item => item.id !== text.id)
                onUpdate(next)
                onSelect([])
                onEdit(null)
                setPendingDeleteId(null)
                setPendingDeleteAnchor(null)
                setExpandedTextIds(prev => {
                  if (!prev.has(text.id)) return prev
                  const nextSet = new Set(prev)
                  nextSet.delete(text.id)
                  return nextSet
                })
              }}
            />
            {editingTextId === text.id ? (
              <div
                className={[
                  "px-1 pb-1 leading-[1.2]",
                  isExpanded ? "h-full" : "h-full",
                ].join(" ")}
                style={{
                  overflowY: isExpanded ? "scroll" : "hidden",
                  scrollbarGutter: isExpanded ? "stable" : undefined,
                  paddingRight: "10px",
                }}
              >
                <textarea
                  className="block w-full bg-transparent text-xs text-gray-900 whitespace-pre-wrap break-words outline-none"
                  defaultValue={text.text}
                  autoFocus
                  ref={node => {
                    // Ensure scroll works immediately on entering edit mode (no typing required).
                    requestAnimationFrame(() => autosizeTextarea(node))
                  }}
                  style={{
                    minHeight: "100%",
                    resize: "none",
                    overflow: "hidden",
                    fontSize: text.fontSize,
                    lineHeight: 1.2,
                    padding: 0,
                    border: "none",
                    borderRadius: 0,
                  }}
                  onFocus={event => {
                    autosizeTextarea(event.currentTarget)
                  }}
                  onPointerDown={event => {
                    // Don't let the box-level drag handler steal pointer capture while editing.
                    event.stopPropagation()
                  }}
                  onWheel={event => {
                    // Ensure scrolling works the same when the pointer is over the textarea.
                    const container = event.currentTarget.parentElement
                    if (!container) return
                    if (container.scrollHeight <= container.clientHeight) return
                    container.scrollTop += event.deltaY
                    event.preventDefault()
                  }}
                  onKeyDown={event => {
                    if (event.key !== "Enter") return
                    if (event.shiftKey) return
                    event.preventDefault()
                    commitTextEdit(text.id, event.currentTarget.value, { collapseAfter: false })
                  }}
                  onInput={event => {
                    autosizeTextarea(event.currentTarget)
                  }}
                  onBlur={event => {
                    commitTextEdit(text.id, event.currentTarget.value, { collapseAfter: true })
                  }}
                />
              </div>
            ) : (
              <div
                className={[
                  "px-1 pb-1 leading-[1.2]",
                  isExpanded ? "h-full" : "h-full",
                ].join(" ")}
                style={{
                  overflowY: isExpanded ? "scroll" : "hidden",
                  scrollbarGutter: isExpanded ? "stable" : undefined,
                  paddingRight: "10px",
                }}
              >
                <span className="whitespace-pre-wrap break-words">{displayText}</span>
              </div>
            )}
            {/* Resize handle (bottom-right) */}
            {isExpanded && selectedTextIds.includes(text.id) && (
              <div
                className="absolute bottom-0 right-0 h-3 w-3 cursor-se-resize rounded-sm bg-gray-900/30"
                onMouseDown={event => {
                  // Prevent textarea blur when resizing while editing.
                  event.preventDefault()
                }}
                onPointerDown={event => {
                  event.stopPropagation()
                  event.preventDefault()
                  if (event.button !== 0) return
                  resizingId.current = text.id
                  didDrag.current = true
                  event.currentTarget.setPointerCapture(event.pointerId)
                }}
                onPointerMove={event => {
                  if (resizingId.current !== text.id) return
                  const point = normalizePointFromLayer(event.clientX, event.clientY)
                  if (!point) return
                  const w = point.x - box.x
                  const h = point.y - box.y
                  const nextBox = clampBox({ x: box.x, y: box.y, w, h })
                  const next = textsRef.current.map(item =>
                    item.id === text.id ? { ...item, w: nextBox.w, h: nextBox.h } : item
                  )
                  onUpdate(next)
                }}
                onPointerUp={event => {
                  if (resizingId.current !== text.id) return
                  event.currentTarget.releasePointerCapture(event.pointerId)
                  resizingId.current = null
                }}
              />
            )}
          </div>
        )
      })}
      {selectedTextIds.length > 0 && (
        <div className="pointer-events-none absolute right-3 top-3 rounded border border-transparent bg-transparent px-0 py-0 text-[10px] text-transparent" />
      )}
    </div>
  )
}

