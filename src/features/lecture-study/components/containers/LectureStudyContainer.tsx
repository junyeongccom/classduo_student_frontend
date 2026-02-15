/**
 * @file LectureStudyContainer.tsx
 * @description 회차별 학습 메인 컨테이너 — 좌우 패널 + 리사이저
 * @module features/lecture-study/components/containers
 * @dependencies useLectureDetail, Tabs, Breadcrumb, LeftPanel*, RightPanelPlaceholder
 */

'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui'
import { useLectureDetail } from '../../hooks/useLectureDetail'
import { Breadcrumb } from '../ui/Breadcrumb'
import { LeftPanelMaterials } from '../ui/LeftPanelMaterials'
import { LeftPanelRecordings } from '../ui/LeftPanelRecordings'
import { RightPanelPlaceholder } from '../ui/RightPanelPlaceholder'
import type { LectureStudyTab, LeftPanelTab } from '../../types'

const DEFAULT_LEFT_WIDTH = 500
const MIN_LEFT_WIDTH = 320
const MIN_RIGHT_WIDTH = 300

interface LectureStudyContainerProps {
  lectureId: string
  courseId?: string
  courseTitle?: string
}

export function LectureStudyContainer({ lectureId, courseId, courseTitle }: LectureStudyContainerProps) {
  const t = useTranslations()
  const { recordings, isLoading, error } = useLectureDetail(lectureId)

  const [leftTab, setLeftTab] = useState<LeftPanelTab>('materials')
  const [rightTab, setRightTab] = useState<LectureStudyTab>('summary')
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [hasUserResized, setHasUserResized] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const breadcrumbItems = [
    { label: t('lectureStudy.breadcrumbHome'), href: '/studyspace/home' },
    ...(courseId
      ? [{ label: courseTitle ?? '...', href: `/studyspace/course/${courseId}` }]
      : []),
    { label: `${lectureId.slice(0, 8)}...` },
  ]

  // Auto-size on initial render
  useLayoutEffect(() => {
    if (!containerRef.current || hasUserResized) return
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
  }, [hasUserResized])

  // Resize mouse events
  useEffect(() => {
    if (!isResizing) return

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
  }, [isResizing])

  // Window resize clamp
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const max = rect.width - MIN_RIGHT_WIDTH
      setLeftWidth(prev => Math.min(Math.max(prev, MIN_LEFT_WIDTH), max))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: Breadcrumb */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3">
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {/* Panels */}
      <div
        ref={containerRef}
        className="flex flex-1 min-h-0"
      >
        {/* Left Panel */}
        <section className="flex h-full min-h-0 flex-col border-r border-gray-200" style={{ width: leftWidth }}>
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

        {/* Resizer */}
        <div
          className="relative flex w-px cursor-col-resize items-stretch justify-center bg-gray-300/80 hover:bg-blue-400 transition-colors"
          onMouseDown={handleResizeStart}
        >
          {isResizing && (
            <div className="fixed inset-0 z-50 cursor-col-resize" />
          )}
        </div>

        {/* Right Panel */}
        <section className="flex h-full min-h-0 flex-1 flex-col">
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
              <RightPanelPlaceholder tab="game" />
            </TabsContent>
            <TabsContent value="ai-tutor" className="flex-1 min-h-0 mt-0">
              <RightPanelPlaceholder tab="ai-tutor" />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  )
}
