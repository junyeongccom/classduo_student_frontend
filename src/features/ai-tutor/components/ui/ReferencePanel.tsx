/**
 * 참고자료 패널 - 수업녹음본과 강의자료 표시
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, FileText, Mic, ChevronDown, ChevronUp, Highlighter } from 'lucide-react'
import { Reference } from '@/features/ai-tutor/types'

interface ReferencePanelProps {
  allReferences: Map<number, Reference[]>
  variant: 'notes' | 'materials'
  onClose: () => void
  messages: Array<{ role: 'user' | 'assistant'; content: string; summary_keywords?: string | null }>
  isRecordingSourceDisabled?: boolean
  className?: string
}

interface RecordingReference {
  type: 'recording'
  source_id: string
  content: string
  reference_index?: number
  metadata: {
    job_id?: string
    chunk_id?: number
    chunk_index?: number
    start_time?: number
    end_time?: number
    score?: number
  }
  citations: Array<{
    text: string
    start_idx?: number
    end_idx?: number
  }>
}

interface MaterialReference {
  type: 'material'
  source_id: string
  content: string
  metadata: {
    material_id?: string
    original_filename?: string
    page_number?: number
    image_path?: string
    image_url?: string
    image_width?: number
    image_height?: number
    score?: number
  }
  citations: Array<{
    text: string
    start_idx?: number
    end_idx?: number
  }>
}

export function ReferencePanel({ allReferences, variant, onClose, messages, isRecordingSourceDisabled, className }: ReferencePanelProps) {
  const t = useTranslations('aiTutorReference')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [scrollPositions, setScrollPositions] = useState({ notes: 0, materials: 0 })
  const notesContainerRef = useRef<HTMLDivElement>(null)
  const materialsContainerRef = useRef<HTMLDivElement>(null)

  // 메시지에서 키워드 가져오기 (DB에서 저장된 summary_keywords 사용)
  const getKeywords = (messageIndex: number): string => {
    const message = messages[messageIndex]
    if (!message) return t('answer')
    
    // assistant 메시지이고 summary_keywords가 있으면 사용
    if (message.role === 'assistant' && message.summary_keywords) {
      const keywords = message.summary_keywords.trim()
      if (keywords) {
        return keywords
      }
    }
    
    return t('answer')
  }

  // 메시지 인덱스별로 그룹화 (인용이 있는 레퍼런스만 표시)
  const referencesByMessage = new Map<number, { recordings: RecordingReference[]; materials: MaterialReference[] }>()

  const getRecordingSortIndex = (ref: RecordingReference) => {
    const refIndex = typeof ref.reference_index === 'number' ? ref.reference_index : undefined
    const chunkIndex = typeof ref.metadata?.chunk_index === 'number' ? ref.metadata.chunk_index : undefined
    return refIndex ?? chunkIndex ?? Number.POSITIVE_INFINITY
  }
  
  allReferences.forEach((references, messageIndex) => {
    const recordings: RecordingReference[] = []
    const materials: MaterialReference[] = []
    
    references.forEach(ref => {
      // 인용이 있는 레퍼런스만 포함 (citations가 있고 비어있지 않은 경우)
      // 답변에 출처 표기가 있으면 백엔드에서 반드시 citation을 찾도록 수정했으므로,
      // citations가 없으면 표시하지 않음
      const hasCitations = ref.citations && Array.isArray(ref.citations) && ref.citations.length > 0
      if (!hasCitations) {
        return // 인용이 없으면 표시하지 않음
      }
      
      if (ref.type === 'recording') {
        recordings.push(ref as RecordingReference)
      } else if (ref.type === 'material') {
        materials.push(ref as MaterialReference)
      }
    })
    
    if (recordings.length > 0 || materials.length > 0) {
      recordings.sort((a, b) => getRecordingSortIndex(a) - getRecordingSortIndex(b))
      referencesByMessage.set(messageIndex, { recordings, materials })
    }
  })

  // variant에 따라 필터링
  const recordingRefs = variant === 'notes' 
    ? Array.from(referencesByMessage.entries()).flatMap(([msgIndex, refs]) => 
        refs.recordings.map(ref => ({ messageIndex: msgIndex, ref }))
      )
    : []
  const materialRefs = variant === 'materials'
    ? Array.from(referencesByMessage.entries()).flatMap(([msgIndex, refs]) => 
        refs.materials.map(ref => ({ messageIndex: msgIndex, ref }))
      )
    : []

  const handleScroll =
    (tab: 'notes' | 'materials') =>
    (event: React.UIEvent<HTMLDivElement, UIEvent>) => {
      const nextScrollTop = event.currentTarget?.scrollTop ?? 0
      setScrollPositions(prev => ({
        ...prev,
        [tab]: nextScrollTop,
      }))
    }

  const scrollPositionsRef = useRef(scrollPositions)

  useEffect(() => {
    scrollPositionsRef.current = scrollPositions
  }, [scrollPositions])

  useEffect(() => {
    if (variant === 'notes' && notesContainerRef.current) {
      notesContainerRef.current.scrollTop = scrollPositionsRef.current.notes
    }
    if (variant === 'materials' && materialsContainerRef.current) {
      materialsContainerRef.current.scrollTop = scrollPositionsRef.current.materials
    }
  }, [variant])

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // 강의자료 텍스트 파싱 및 가독성 개선
  const parseMaterialContent = (content: string): { text: string; visualDescription: string } => {
    if (!content) return { text: '', visualDescription: '' }
    
    // 여러 마커 형식 지원: [강의자료 텍스트], [시각자료 설명], ---텍스트---, ---시각자료 설명---
    const textMarkers = ['[강의자료 텍스트]', '---텍스트---']
    const visualMarkers = ['[시각자료 설명]', '---시각자료 설명---']
    
    let text = ''
    let visualDescription = ''
    
    // 마커 찾기
    let textMarker = ''
    let visualMarker = ''
    let textIndex = -1
    let visualIndex = -1
    
    // 텍스트 마커 찾기
    for (const marker of textMarkers) {
      const index = content.indexOf(marker)
      if (index !== -1) {
        textMarker = marker
        textIndex = index
        break
      }
    }
    
    // 시각자료 마커 찾기
    for (const marker of visualMarkers) {
      const index = content.indexOf(marker)
      if (index !== -1) {
        visualMarker = marker
        visualIndex = index
        break
      }
    }
    
    // 마커가 있는 경우 파싱
    if (textIndex !== -1 || visualIndex !== -1) {
      if (textIndex !== -1) {
        const textEnd = visualIndex !== -1 ? visualIndex : content.length
        text = content.substring(textIndex + textMarker.length, textEnd).trim()
      }
      
      if (visualIndex !== -1) {
        visualDescription = content.substring(visualIndex + visualMarker.length).trim()
      }
    } else {
      // 마커가 없으면 전체를 텍스트로 처리
      text = content.trim()
    }
    
    return { text, visualDescription }
  }

  // 인용 부분 하이라이트 처리
  const highlightCitations = (content: string, citations: Array<{ text: string }>, originalContent?: string) => {
    if (!citations || citations.length === 0) return content

    let highlightedContent = content
    citations.forEach((citation, citationIndex) => {
      if (citation.text) {
        // 인용 텍스트 정규화 (공백, 줄바꿈 통일)
        const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim()
        const normalizedCitation = normalizeText(citation.text)
        const normalizedContent = normalizeText(content)
        
        // 정규화된 텍스트에서 인용 부분 찾기
        if (normalizedContent.includes(normalizedCitation)) {
          // 원본 텍스트에서 인용 부분 찾기 (공백 차이 허용)
          const escapedText = citation.text
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // 정규식 특수문자 이스케이프
            .replace(/\s+/g, '\\s+')  // 공백을 유연하게 매칭 (1개 이상의 공백 허용)
          
          const regex = new RegExp(`(${escapedText})`, 'gi')
          const matches = content.match(regex)
          
          if (matches && matches.length > 0) {
            // 첫 번째 매칭만 하이라이트 (중복 방지)
            let replaced = false
            highlightedContent = highlightedContent.replace(regex, (match) => {
              if (replaced) return match
              replaced = true
              return `<mark class="bg-yellow-200 px-0.5 rounded">${match}</mark>`
            })
          } else {
            // 정확한 매칭 실패 시 부분 매칭 시도 (공백 무시)
            const citationWords = normalizedCitation.split(' ').filter(w => w.length > 1)
            if (citationWords.length > 0) {
              // 핵심 단어들로 구성된 패턴 생성 (최소 3개 단어)
              const minWords = Math.min(3, citationWords.length)
              const pattern = citationWords.slice(0, minWords).join('\\s+')
              const flexibleRegex = new RegExp(`(${pattern})`, 'gi')
              
              if (normalizedContent.match(flexibleRegex)) {
                let replaced = false
                highlightedContent = highlightedContent.replace(flexibleRegex, (match) => {
                  if (replaced) return match
                  replaced = true
                  return `<mark class="bg-yellow-200 px-0.5 rounded">${match}</mark>`
                })
              }
            }
          }
        } else if (originalContent) {
          // 원본 content에서 찾기 (parseMaterialContent로 분리되기 전)
          const normalizedOriginal = normalizeText(originalContent)
          if (normalizedOriginal.includes(normalizedCitation)) {
            // 원본에서 찾았지만 현재 content에 없으면 시각자료 설명 부분일 수 있음
            // 이 경우는 하이라이트하지 않음 (텍스트 내용 섹션에만 표시)
          }
        }
      }
    })
    return highlightedContent
  }

  // 시간 포맷팅 (초 -> MM:SS)
  const formatTime = (seconds?: number) => {
    if (seconds === undefined) return ''
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const recordingsContent = (
    <div className="space-y-6">
      {recordingRefs.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <Mic className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4">{isRecordingSourceDisabled ? t('disabledNotes') : t('empty.notes')}</p>
        </div>
      ) : (
        Array.from(referencesByMessage.entries())
          .filter(([_, refs]) => refs.recordings.length > 0)
          .map(([messageIndex, refs]) => (
            <div key={`message-${messageIndex}`} className="space-y-3">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
                <span className="text-sm font-semibold text-gray-900">
                  {t('answer')} {Math.floor(messageIndex / 2) + 1}:{' '}
                  <span className="text-gray-600">{getKeywords(messageIndex)}</span>
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-500 whitespace-nowrap">
                  {t('recordingSegmentsBadge', { count: String(refs.recordings.length) })}
                </span>
              </div>
              {refs.recordings.map((ref, index) => {
                const itemId = `recording-${messageIndex}-${index}`
                const isExpanded = expandedItems.has(itemId)
                const sortIndex = getRecordingSortIndex(ref)
                const displayIndex = Number.isFinite(sortIndex) ? sortIndex : index
                return (
                  <div
                    key={itemId}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <button
                      onClick={() => toggleExpand(itemId)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
                          <Mic className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900">
                            {t('recordingSegmentLabel')}{displayIndex}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            {ref.metadata.start_time !== undefined && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium text-gray-600">
                                  {formatTime(ref.metadata.start_time)}
                                </span>
                                <span className="text-xs text-gray-400">-</span>
                                <span className="text-xs font-medium text-gray-600">
                                  {formatTime(ref.metadata.end_time)}
                                </span>
                              </div>
                            )}
                            {ref.metadata.score && (
                              <>
                                {ref.metadata.start_time !== undefined && (
                                  <span className="text-xs text-gray-300">•</span>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-gray-900" />
                                  <p className="text-xs text-gray-500">
                                    {t('relevance')} {(ref.metadata.score * 100).toFixed(0)}%
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ref.citations && ref.citations.length > 0 && (
                          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 shadow-sm">
                            <Highlighter className="h-3.5 w-3.5" />
                            {ref.citations.length}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                        <div className="p-4">
                          <div className="flex gap-2.5">
                            <div className="h-full w-1 flex-shrink-0 rounded-full bg-gradient-to-b from-gray-700 to-gray-900" />
                            <div className="min-w-0 flex-1">
                              {(ref as any).summary ? (
                                <div className="space-y-3">
                                  <h3 className="text-base font-bold text-gray-900">
                                    {(ref as any).summary.title}
                                  </h3>
                                  <p
                                    className="text-sm leading-relaxed text-gray-700"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightCitations(
                                        (ref as any).summary.content,
                                        ref.citations || [],
                                        (ref as any).summary.content
                                      ),
                                    }}
                                  />
                                </div>
                              ) : (
                                <p
                                  className="text-sm leading-relaxed text-gray-700"
                                  dangerouslySetInnerHTML={{
                                    __html: highlightCitations(ref.content, ref.citations || [], ref.content),
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
      )}
    </div>
  )

  const materialsContent = (
    <div className="space-y-6">
      {materialRefs.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          <FileText className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4">{t('empty.materials')}</p>
        </div>
      ) : (
        Array.from(referencesByMessage.entries())
          .filter(([_, refs]) => refs.materials.length > 0)
          .map(([messageIndex, refs]) => (
            <div key={`materials-${messageIndex}`} className="space-y-3">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
                <span className="text-sm font-semibold text-gray-900">
                  {t('answer')} {Math.floor(messageIndex / 2) + 1}:{' '}
                  <span className="text-gray-600">{getKeywords(messageIndex)}</span>
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-500 whitespace-nowrap">
                  {t('materialCountBadge', { count: String(refs.materials.length) })}
                </span>
              </div>
              {refs.materials.map((ref, index) => {
                const itemId = `material-${messageIndex}-${index}`
                const isExpanded = expandedItems.has(itemId)
                const { text, visualDescription } = parseMaterialContent(ref.content)
                const highlightedText = highlightCitations(text, ref.citations || [], ref.content)
                const highlightedVisualDescription = highlightCitations(visualDescription, ref.citations || [], ref.content)
                const hasImage = Boolean(ref.metadata.image_url)

                return (
                  <div
                    key={itemId}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <button
                      onClick={() => toggleExpand(itemId)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {ref.metadata.original_filename || `${t('materialFallback')} ${index + 1}`}
                          </p>
                          {ref.metadata.page_number && (
                            <p className="text-xs text-gray-500">
                              {t('page')} {ref.metadata.page_number}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {ref.citations && ref.citations.length > 0 && (
                          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 shadow-sm">
                            <Highlighter className="h-3.5 w-3.5" />
                            {ref.citations.length}
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                        <div className="space-y-4 p-4">
                          {hasImage && (
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                              <img
                                src={ref.metadata.image_url}
                                alt={ref.metadata.original_filename || `강의자료 ${index + 1}`}
                                className="w-full object-contain"
                                style={{ maxHeight: 360 }}
                              />
                            </div>
                          )}

                          {highlightedText && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                강의자료 텍스트
                              </h4>
                              <p
                                className="rounded-lg bg-white/80 p-3 text-sm leading-relaxed text-gray-800"
                                dangerouslySetInnerHTML={{ __html: highlightedText }}
                              />
                            </div>
                          )}

                          {visualDescription && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                시각자료 설명
                              </h4>
                              <p 
                                className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700"
                                dangerouslySetInnerHTML={{ __html: highlightedVisualDescription }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))
      )}
    </div>
  )

  return (
    <div className={`flex h-full flex-col bg-white ${className ?? ''}`}>
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-2">
          {variant === 'notes' ? (
            <>
              <Mic className="h-5 w-5 text-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900">{t('title.notes')}</h2>
              <span className="ml-2 rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-700 whitespace-nowrap">
                {t('countBadge', { count: String(recordingRefs.length) })}
              </span>
            </>
          ) : (
            <>
              <FileText className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">{t('title.materials')}</h2>
              <span className="ml-2 rounded-full bg-gray-100 px-3 py-0.5 text-xs text-gray-700 whitespace-nowrap">
                {t('countBadge', { count: String(materialRefs.length) })}
              </span>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={notesContainerRef}
          onScroll={handleScroll('notes')}
          className={`absolute inset-0 overflow-y-auto p-6 transition-opacity duration-150 ${
            variant === 'notes' ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {recordingsContent}
        </div>

        <div
          ref={materialsContainerRef}
          onScroll={handleScroll('materials')}
          className={`absolute inset-0 overflow-y-auto p-6 transition-opacity duration-150 ${
            variant === 'materials' ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ overflowX: 'hidden' }}
        >
          <div className="w-full">{materialsContent}</div>
        </div>
      </div>
    </div>
  )
}


