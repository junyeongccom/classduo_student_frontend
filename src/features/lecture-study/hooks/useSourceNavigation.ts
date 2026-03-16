/**
 * @file useSourceNavigation.ts
 * @description 출처 클릭 시 좌측 패널 네비게이션 훅 (cycling 포함)
 * @module features/lecture-study/hooks
 * @dependencies useLectureStudyStore, useIsMobile
 */

'use client'

import { useCallback, useRef } from 'react'
import { useLectureStudyStore } from '../store/useLectureStudyStore'
import { useIsMobile } from './useMediaQuery'
import { sourceAnalytics } from '@/shared/lib/analytics'

export function useSourceNavigation(lectureId: string) {
  const isMobile = useIsMobile()

  const materialsCursorRef = useRef<Record<string, number>>({})
  const recordingsCursorRef = useRef<Record<string, number>>({})

  const setTargetPage = useLectureStudyStore((s) => s.setTargetPage)
  const setTargetChunkIndex = useLectureStudyStore((s) => s.setTargetChunkIndex)
  const setLeftTab = useLectureStudyStore((s) => s.setLeftTab)
  const isLeftPanelOpen = useLectureStudyStore((s) => s.isLeftPanelOpen)
  const toggleLeftPanel = useLectureStudyStore((s) => s.toggleLeftPanel)
  const totalMaterialPages = useLectureStudyStore((s) => s.totalMaterialPages)
  const totalRecordingChunks = useLectureStudyStore((s) => s.totalRecordingChunks)

  const handleMaterialSourceClick = useCallback(
    (sectionKey: string, sourcePages: number[], totalPageCount: number) => {
      if (isMobile || sourcePages.length === 0) return

      const cursor = materialsCursorRef.current[sectionKey] ?? 0
      const safeCursor = cursor >= 0 && cursor < sourcePages.length ? cursor : 0

      const shouldSkipRangeCheck = totalPageCount <= 0
      let attempts = 0
      let current = safeCursor
      while (attempts < sourcePages.length) {
        const page = sourcePages[current]
        const targetIdx = page - 1
        if (shouldSkipRangeCheck || (targetIdx >= 0 && targetIdx < totalPageCount)) {
          materialsCursorRef.current[sectionKey] = (current + 1) % sourcePages.length

          if (!isLeftPanelOpen) toggleLeftPanel()
          setLeftTab('materials')
          setTargetPage(targetIdx)
          sourceAnalytics.click(lectureId, { source_type: 'material', section_key: sectionKey })
          return
        }
        current = (current + 1) % sourcePages.length
        attempts++
      }
      materialsCursorRef.current[sectionKey] = (safeCursor + 1) % sourcePages.length
    },
    [isMobile, isLeftPanelOpen, toggleLeftPanel, setLeftTab, setTargetPage, lectureId],
  )

  const handleRecordingSourceClick = useCallback(
    (sectionKey: string, sourceChunks: number[], totalChunkCount: number) => {
      if (isMobile || sourceChunks.length === 0) return

      const cursor = recordingsCursorRef.current[sectionKey] ?? 0
      const safeCursor = cursor >= 0 && cursor < sourceChunks.length ? cursor : 0

      let attempts = 0
      let current = safeCursor
      while (attempts < sourceChunks.length) {
        const chunkIdx = sourceChunks[current]
        if (chunkIdx >= 0 && chunkIdx < totalChunkCount) {
          recordingsCursorRef.current[sectionKey] = (current + 1) % sourceChunks.length

          if (!isLeftPanelOpen) toggleLeftPanel()
          setLeftTab('recordings')
          setTargetChunkIndex(chunkIdx)
          sourceAnalytics.click(lectureId, { source_type: 'recording', section_key: sectionKey })
          return
        }
        current = (current + 1) % sourceChunks.length
        attempts++
      }
      recordingsCursorRef.current[sectionKey] = (safeCursor + 1) % sourceChunks.length
    },
    [isMobile, isLeftPanelOpen, toggleLeftPanel, setLeftTab, setTargetChunkIndex, lectureId],
  )

  const resetCursors = useCallback(() => {
    materialsCursorRef.current = {}
    recordingsCursorRef.current = {}
  }, [])

  return {
    isMobile,
    handleMaterialSourceClick,
    handleRecordingSourceClick,
    totalMaterialPages,
    totalRecordingChunks,
    resetCursors,
  }
}
