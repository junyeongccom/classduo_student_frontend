/**
 * @file LectureStudyContainer.tsx
 * @description 회차별 학습 메인 컨테이너 — 좌우 패널 + 리사이저 + 모바일 반응형
 * @module features/lecture-study/components/containers
 * @dependencies useLectureDetail, useLectureStudyStore, Tabs, Breadcrumb, LeftPanel*, RightPanelPlaceholder, useIsMobile
 */

'use client'

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, PanelRightOpen, X } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui'
import { useLectureDetail } from '../../hooks/useLectureDetail'
import { useLectures } from '../../hooks/useLectures'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'
import { Breadcrumb } from '../ui/Breadcrumb'
import { LeftPanelMaterials } from './LeftPanelMaterials'
import { LeftPanelRecordings } from '../ui/LeftPanelRecordings'
import { RightPanelPlaceholder } from '../ui/RightPanelPlaceholder'
import { GameTabContainer } from './GameTabContainer'
import { AITutorTabContainer } from './AITutorTabContainer'
import type { LectureStudyTab, LeftPanelTab } from '../../types'

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
  const { lectures, courseTitle: fetchedCourseTitle } = useLectures(courseId ?? '')

  const currentLecture = useMemo(
    () => lectures.find((l) => l.id === lectureId),
    [lectures, lectureId],
  )

  const leftTab = useLectureStudyStore(s => s.leftTab)
  const rightTab = useLectureStudyStore(s => s.rightTab)
  const setLeftTab = useLectureStudyStore(s => s.setLeftTab)
  const setRightTab = useLectureStudyStore(s => s.setRightTab)
  const setStoreLectureId = useLectureStudyStore(s => s.setLectureId)
  const setGameWords = useLectureStudyStore(s => s.setGameWords)

  useEffect(() => {
    setStoreLectureId(lectureId)
    setGameWords([])
  }, [lectureId, setStoreLectureId, setGameWords])

  const [leftWidth, setLeftWidth] = useState<number | null>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [hasUserResized, setHasUserResized] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const resolveLectureLabel = (): string => {
    if (lectureTitle) return lectureTitle
    if (currentLecture) {
      const wn = currentLecture.week_number
      const sn = currentLecture.session_number
      const title = currentLecture.title
      if (wn != null && sn != null) {
        return title
          ? t('lectureStudy.breadcrumb.weekSessionTitle', { week: wn, session: sn, title })
          : t('lectureStudy.breadcrumb.weekSession', { week: wn, session: sn })
      }
      if (currentLecture.lecture_number != null) {
        return title
          ? t('lectureStudy.breadcrumb.lectureNumberTitle', { number: currentLecture.lecture_number, title })
          : t('lectureStudy.breadcrumb.lectureNumber', { number: currentLecture.lecture_number })
      }
      if (title) return title
    }
    return t('lectureStudy.breadcrumb.lectureFallback')
  }

  const breadcrumbItems = [
    { label: t('lectureStudy.breadcrumbHome'), href: '/studyspace/home' },
    ...(courseId
      ? [{ label: courseTitle ?? fetchedCourseTitle ?? t('lectureStudy.breadcrumb.courseLoading'), href: `/studyspace/course/${courseId}` }]
      : []),
    { label: resolveLectureLabel() },
  ]

  // Auto-size: 정중앙 50/50 분할 (desktop only)
  useLayoutEffect(() => {
    if (isMobile || !containerRef.current) return
    const element = containerRef.current
    const updateWidth = () => {
      if (hasUserResized) return
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
      setLeftWidth(prev => {
        if (prev == null) return Math.floor(rect.width / 2)
        return Math.min(Math.max(prev, MIN_LEFT_WIDTH), max)
      })
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
        <p className="text-sm text-gray-500">{t('lectureStudy.error.loadFailed')}</p>
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
          style={isMobile ? { width: '100%' } : { width: leftWidth ?? '50%' }}
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
              <LeftPanelRecordings
                recordings={recordings}
                essence7Words={currentLecture?.essence_7words}
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* Desktop: Resizer + Right Panel */}
        {!isMobile && (
          <>
            <div
              className="group relative flex w-1 cursor-col-resize items-center justify-center bg-gray-200 hover:bg-blue-400 transition-colors"
              onMouseDown={handleResizeStart}
            >
              <div className="h-8 w-1 rounded-full bg-gray-400 group-hover:bg-white transition-colors" />
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
