/**
 * @file useTranscriptPrint.ts
 * @description 대화 기록 인쇄 트리거 — 인쇄 뷰 마운트 → document.title 교체(PDF 기본 파일명) → window.print() → 원복
 * @module features/ai-tutor/hooks
 * @dependencies components/ui/ChatTranscriptPrintView (TranscriptPrintData)
 */
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { TranscriptPrintData } from '../components/ui/ChatTranscriptPrintView'

/**
 * 인쇄 요청을 받으면 인쇄 뷰를 먼저 마운트하고, 페인트 이후에 window.print() 를 부른다.
 *
 * 브라우저는 PDF 저장 시 document.title 을 기본 파일명으로 쓰므로 인쇄 직전에 갈아끼우고
 * 인쇄가 끝나면 되돌린다. 정리 시점은 `afterprint` 와 `window.print()` 반환 중 먼저 오는 쪽
 * (Chrome 은 print() 가 대화상자 종료까지 블로킹, Safari 는 afterprint 가 먼저 온다) —
 * 중복 실행돼도 무해하도록 플래그로 한 번만 처리한다.
 */
export function useTranscriptPrint() {
  const [printData, setPrintData] = useState<TranscriptPrintData | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!printData || typeof window === 'undefined') return

    const previousTitle = document.title
    document.title = printData.filename

    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      document.title = previousTitle
      window.removeEventListener('afterprint', finish)
      if (isMountedRef.current) setPrintData(null)
    }

    window.addEventListener('afterprint', finish)
    // 인쇄 뷰가 실제로 페인트된 다음 프레임에 인쇄 대화상자를 연다.
    const rafId = window.requestAnimationFrame(() => {
      window.print()
      finish()
    })

    return () => {
      window.cancelAnimationFrame(rafId)
      window.removeEventListener('afterprint', finish)
      if (!finished) document.title = previousTitle
    }
  }, [printData])

  const requestPrint = useCallback((data: TranscriptPrintData) => {
    setPrintData(data)
  }, [])

  return { printData, requestPrint }
}
