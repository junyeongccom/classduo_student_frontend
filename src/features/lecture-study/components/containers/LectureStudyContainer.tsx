/**
 * @file LectureStudyContainer.tsx
 * @description 회차별 학습 메인 컨테이너 — 좌우 패널 + 리사이저 + 모바일 반응형
 * @module features/lecture-study/components/containers
 * @dependencies useLectureDetail, useLectureStudyStore, Tabs, Breadcrumb, LeftPanel*, RightPanelPlaceholder, useIsMobile
 */

'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, PanelRightOpen, X } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui'
import { useLectureDetail } from '../../hooks/useLectureDetail'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'
import { Breadcrumb } from '../ui/Breadcrumb'
import { LeftPanelMaterials } from '../ui/LeftPanelMaterials'
import { LeftPanelRecordings } from '../ui/LeftPanelRecordings'
import { RightPanelPlaceholder } from '../ui/RightPanelPlaceholder'
import { GameTabContainer } from './GameTabContainer'
import { AITutorTabContainer } from './AITutorTabContainer'
import type { LectureStudyTab, LeftPanelTab } from '../../types'

const DEFAULT_LEFT_WIDTH = 500
const MIN_LEFT_WIDTH = 320
const MIN_RIGHT_WIDTH = 300

const RIGHT_TAB_TITLE_KEYS: Record<LectureStudyTab, string> = {
  summary: 'lectureStudy.rightPanel.summaryTab',
  quiz: 'lectureStudy.rightPanel.quizTab',
  game: 'lectureStudy.rightPanel.gameTab',
  'ai-tutor': 'lectureStudy.rightPanel.aiTutorTab',
}

interface LectureStudyContainerProps {
  lectureId: string
  courseId?: string
  courseTitle?: string
  lectureTitle?: string
}

export function LectureStudyContainer({ lectureId, courseId, courseTitle, lectureTitle }: LectureStudyContainerProps) {
  const t = useTranslations()
  const isMobile = useIsMobile()
  const { recordings, isLoading, error, refresh } = useLectureDetail(lectureId)

  const leftTab = useLectureStudyStore(s => s.leftTab)
  const rightTab = useLectureStudyStore(s => s.rightTab)
  const setLeftTab = useLectureStudyStore(s => s.setLeftTab)
  const setRightTab = useLectureStudyStore(s => s.setRightTab)

  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [hasUserResized, setHasUserResized] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const breadcrumbItems = [
    { label: t('lectureStudy.breadcrumbHome'), href: '/studyspace/home' },
    ...(courseId
      ? [{ label: courseTitle ?? '...', href: `/studyspace/course/${courseId}` }]
      : []),
    { label: lectureTitle ?? `${lectureId.slice(0, 8)}...` },
  ]

  // Auto-size on initial render (desktop only)
  useLayoutEffect(() => {
    if (isMobile || !containerRef.current || hasUserResized) return
    const element = containerRef.current
    const updateWidth = () => {
      const rect = element.getBoundingClientRect()
      if (!rect.width) return
      const target = Math.floor(rect.width / 2)
      const max = rect.width - MIN_RIGHT_WIDTH
      setLeftWidth(Math.min(Math.max(target, MIN_LEFT_WIDTH), max))
    }
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasUserResized, isMobile])

  // Resize mouse events (desktop only)
  useEffect(() => {
    if (!isResizing || isMobile) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const next = e.clientX - rect.left
      const max = rect.width - MIN_RIGHT_WIDTH
      setLeftWidth(Math.min(Math.max(next, MIN_LEFT_WIDTH), max))
    }
    const handleMouseUp = () => setIsResizing(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, isMobile])

  // Window resize clamp (desktop only)
  useEffect(() => {
    if (isMobile) return
    const handleResize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const max = rect.width - MIN_RIGHT_WIDTH
      setLeftWidth(prev => Math.min(Math.max(prev, MIN_LEFT_WIDTH), max))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setHasUserResized(true)
    setIsResizing(true)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">{error}</p>
        <button
          onClick={refresh}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t('home.retry')}
        </button>
      </div>
    )
  }

  const rightPanelContent = (
    <Tabs
      value={rightTab}
      onValueChange={v => setRightTab(v as LectureStudyTab)}
      className="flex h-full flex-col"
    >
      <div className="shrink-0 border-b border-gray-100 px-3 pt-2">
        <TabsList className="h-9">
          <TabsTrigger value="summary" className="text-xs">
            {t('lectureStudy.rightPanel.summaryTab')}
          </TabsTrigger>
          <TabsTrigger value="quiz" className="text-xs">
            {t('lectureStudy.rightPanel.quizTab')}
          </TabsTrigger>
          <TabsTrigger value="game" className="text-xs">
            {t('lectureStudy.rightPanel.gameTab')}
          </TabsTrigger>
          <TabsTrigger value="ai-tutor" className="text-xs">
            {t('lectureStudy.rightPanel.aiTutorTab')}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="summary" className="flex-1 min-h-0 mt-0">
        <RightPanelPlaceholder tab="summary" />
      </TabsContent>
      <TabsContent value="quiz" className="flex-1 min-h-0 mt-0">
        <RightPanelPlaceholder tab="quiz" />
      </TabsContent>
      <TabsContent value="game" className="flex-1 min-h-0 mt-0">
        <GameTabContainer lectureId={lectureId} />
      </TabsContent>
      <TabsContent value="ai-tutor" className="flex-1 min-h-0 mt-0">
        <AITutorTabContainer lectureId={lectureId} />
      </TabsContent>
    </Tabs>
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header: Breadcrumb */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <Breadcrumb items={breadcrumbItems} />
        {isMobile && (
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="ml-2 rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Panels */}
      <div
        ref={containerRef}
        className="flex flex-1 min-h-0"
      >
        {/* Left Panel */}
        <section
          className="flex h-full min-h-0 flex-col border-r border-gray-200"
          style={isMobile ? { width: '100%' } : { width: leftWidth }}
        >
          <Tabs
            value={leftTab}
            onValueChange={v => setLeftTab(v as LeftPanelTab)}
            className="flex h-full flex-col"
          >
            <div className="shrink-0 border-b border-gray-100 px-3 pt-2">
              <TabsList className="h-9">
                <TabsTrigger value="materials" className="text-xs">
                  {t('lectureStudy.leftPanel.materialsTab')}
                </TabsTrigger>
                <TabsTrigger value="recordings" className="text-xs">
                  {t('lectureStudy.leftPanel.recordingsTab')}
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="materials" className="flex-1 min-h-0 mt-0">
              <LeftPanelMaterials />
            </TabsContent>
            <TabsContent value="recordings" className="flex-1 min-h-0 mt-0">
              <LeftPanelRecordings recordings={recordings} />
            </TabsContent>
          </Tabs>
        </section>

        {/* Desktop: Resizer + Right Panel */}
        {!isMobile && (
          <>
            <div
              className="relative flex w-px cursor-col-resize items-stretch justify-center bg-gray-300/80 hover:bg-blue-400 transition-colors"
              onMouseDown={handleResizeStart}
            >
              {isResizing && (
                <div className="fixed inset-0 z-50 cursor-col-resize" />
              )}
            </div>

            <section className="flex h-full min-h-0 flex-1 flex-col">
              {rightPanelContent}
            </section>
          </>
        )}
      </div>

      {/* Mobile: Drawer for Right Panel */}
      {isMobile && isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="flex h-full w-[85vw] max-w-md flex-col bg-white shadow-xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <span className="text-sm font-medium text-gray-900">
                {t(RIGHT_TAB_TITLE_KEYS[rightTab])}
              </span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {rightPanelContent}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
