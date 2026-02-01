"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const isProgrammaticScroll = useRef(false)
  const [containerWidth, setContainerWidth] = useState(0)
  const [pdfDoc, setPdfDoc] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null)
  const [pageCount, setPageCount] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
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
          setLoadError('PDF URL이 제공되지 않았습니다.')
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
        let message = '알 수 없는 오류'
        if (error instanceof Error) {
          message = error.message || error.name || '알 수 없는 오류'
        } else if (typeof error === 'string') {
          message = error
        } else if (error && typeof error === 'object') {
          try {
            message = JSON.stringify(error)
          } catch {
            message = String(error)
          }
        } else {
          message = String(error)
        }
        setLoadError(`PDF를 불러오지 못했습니다. (${message})`)
        const errorInfo: Record<string, unknown> = {
          url: url || 'undefined',
          errorMessage: message,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        }
        if (error instanceof Error) {
          errorInfo.errorStack = error.stack
          errorInfo.errorName = error.name
          errorInfo.errorMessage = error.message
        }
        errorInfo.errorString = String(error)
        try {
          errorInfo.errorJson = JSON.stringify(error, Object.getOwnPropertyNames(error))
        } catch {
          // JSON.stringify 실패 시 무시
        }
        console.error("PDF load failed:", errorInfo)
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
    onPageChange?.(bounded)
    const target = pageRefs.current[bounded]
    if (target) {
      isProgrammaticScroll.current = true
      target.scrollIntoView({ behavior: "smooth", block: "start" })
      window.setTimeout(() => {
        isProgrammaticScroll.current = false
      }, 300)
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
            이전
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
            다음
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
            맞춤
          </button>
          <button
            type="button"
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            className="rounded border border-gray-700 px-2 py-1"
          >
            회전
          </button>
          <button
            type="button"
            onClick={() => setIsSpreadView(prev => !prev)}
            className="rounded border border-gray-700 px-2 py-1"
          >
            {isSpreadView ? "1열" : "2분할"}
          </button>
          <button
            type="button"
            onClick={() => setIsToolbarHidden(prev => !prev)}
            className="rounded border border-gray-700 px-2 py-1"
          >
            도구숨김
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
            기본
          </button>
          <button
            type="button"
            onClick={() => setTool("draw")}
            className={`rounded border px-2 py-1 ${tool === "draw" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}
          >
            그리기
          </button>
          <button
            type="button"
            onClick={() => setTool("erase")}
            className={`rounded border px-2 py-1 ${tool === "erase" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}
          >
            지우개
          </button>
          <button
            type="button"
            onClick={() => setTool("text")}
            className={`rounded border px-2 py-1 ${tool === "text" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white"}`}
          >
            텍스트
          </button>
          {tool === "draw" && (
            <>
              <select
                value={penKind}
                onChange={event => setPenKind(event.target.value as "pen" | "highlighter")}
                className="rounded border border-gray-200 bg-white px-2 py-1"
              >
                <option value="pen">펜</option>
                <option value="highlighter">형광펜</option>
              </select>
              <label className="flex items-center gap-2">
                색상
                <input
                  type="color"
                  value={penColor}
                  onChange={event => setPenColor(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2">
                두께
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
                <option value="object">개체 지우개</option>
                <option value="area">영역 지우개</option>
              </select>
              <label className="flex items-center gap-2">
                크기
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
                글자색
                <input
                  type="color"
                  value={textColor}
                  onChange={event => setTextColor(event.target.value)}
                />
              </label>
              <label className="flex items-center gap-2">
                배경
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
              {loadError}
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
                <p className="font-medium text-gray-700">자료를 준비하고 있어요</p>
                <p className="text-xs text-gray-500">잠시만 기다리면 PDF가 열립니다.</p>
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
          onCreate={(point) => {
            if (tool !== "text") return
            const newText: PdfAnnotationText = {
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              x: point.x,
              y: point.y,
              text: "텍스트",
              color: textStyle.color,
              fontSize: textStyle.fontSize,
              backgroundColor: textStyle.backgroundColor,
            }
            const next = {
              paths: [...(annotation?.paths ?? [])],
              texts: [...(annotation?.texts ?? []), newText],
            }
            onAnnotationChange(pageNumber, next)
            setEditingTextId(newText.id)
            setSelectedTextIds([newText.id])
          }}
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
  onCreate,
}: {
  texts: PdfAnnotationText[]
  editingTextId: string | null
  onEdit: (id: string | null) => void
  selectedTextIds: string[]
  onSelect: (ids: string[]) => void
  textStyle: { color: string; fontSize: number; backgroundColor: string }
  enableInteraction: boolean
  onUpdate: (texts: PdfAnnotationText[]) => void
  onCreate: (point: { x: number; y: number }) => void
}) => {
  const layerRef = useRef<HTMLDivElement>(null)
  const draggingId = useRef<string | null>(null)

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
      onDoubleClick={event => {
        const layer = layerRef.current
        if (!layer) return
        const rect = layer.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        onCreate({ x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) })
      }}
    >
      {texts.map(text => (
        <div
          key={text.id}
          className={`pointer-events-auto absolute rounded px-1 ${
            selectedTextIds.includes(text.id)
              ? "ring-1 ring-blue-400 ring-offset-2 ring-offset-white border border-dashed border-blue-300"
              : ""
          }`}
          style={{
            left: `${text.x * 100}%`,
            top: `${text.y * 100}%`,
            color: text.color,
            fontSize: text.fontSize,
            backgroundColor: text.backgroundColor ?? "transparent",
            transform: "translate(-0%, -0%)",
          }}
          onPointerDown={event => {
            if (event.button !== 0) return
            if (editingTextId === text.id) return
            draggingId.current = text.id
            onSelect([text.id])
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={event => {
            const layer = layerRef.current
            if (!layer || draggingId.current !== text.id || event.buttons !== 1) return
            const rect = layer.getBoundingClientRect()
            const x = (event.clientX - rect.left) / rect.width
            const y = (event.clientY - rect.top) / rect.height
            const next = texts.map(item =>
              item.id === text.id ? { ...item, x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) } : item
            )
            onUpdate(next)
          }}
          onPointerUp={event => {
            event.currentTarget.releasePointerCapture(event.pointerId)
            draggingId.current = null
          }}
          onPointerLeave={() => {
            draggingId.current = null
          }}
          onDoubleClick={() => onEdit(text.id)}
        >
          {editingTextId === text.id ? (
            <input
              className="rounded border border-gray-300 bg-white px-1 text-xs text-gray-900"
              defaultValue={text.text}
              autoFocus
              onBlur={event => {
                const next = texts.map(item =>
                  item.id === text.id ? { ...item, text: event.target.value } : item
                )
                onUpdate(next)
                onEdit(null)
              }}
            />
          ) : (
            <span>{text.text}</span>
          )}
        </div>
      ))}
      {selectedTextIds.length > 0 && (
        <div className="pointer-events-none absolute right-3 top-3 rounded border border-transparent bg-transparent px-0 py-0 text-[10px] text-transparent" />
      )}
    </div>
  )
}

