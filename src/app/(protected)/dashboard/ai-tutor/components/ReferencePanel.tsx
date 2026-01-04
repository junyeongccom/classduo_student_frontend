/**
 * 참고자료 패널 - 수업녹음본과 강의자료 표시
 */
'use client'

import { useState } from 'react'
import { X, FileText, Mic, ChevronDown, ChevronUp, Highlighter } from 'lucide-react'
import { Reference } from '@/features/ai-tutor/api/chatApi'

interface ReferencePanelProps {
  allReferences: Map<number, Reference[]>
  activeTab: 'answer' | 'notes' | 'materials'
  onClose: () => void
  messages: Array<{ role: 'user' | 'assistant'; content: string; summary_keywords?: string | null }> // 메시지 배열 (summary_keywords 포함)
}

interface RecordingReference {
  type: 'recording'
  source_id: string
  content: string
  metadata: {
    job_id?: string
    chunk_id?: number
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

export function ReferencePanel({ allReferences, activeTab, onClose, messages }: ReferencePanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 메시지에서 키워드 가져오기 (DB에서 저장된 summary_keywords 사용)
  const getKeywords = (messageIndex: number): string => {
    const message = messages[messageIndex]
    if (!message) return '답변'
    
    // assistant 메시지이고 summary_keywords가 있으면 사용
    if (message.role === 'assistant' && message.summary_keywords) {
      const keywords = message.summary_keywords.trim()
      if (keywords) {
        return keywords
      }
    }
    
    return '답변'
  }

  // 메시지 인덱스별로 그룹화 (인용이 있는 레퍼런스만 표시)
  const referencesByMessage = new Map<number, { recordings: RecordingReference[]; materials: MaterialReference[] }>()
  
  allReferences.forEach((references, messageIndex) => {
    const recordings: RecordingReference[] = []
    const materials: MaterialReference[] = []
    
    references.forEach(ref => {
      // 인용이 있는 레퍼런스만 포함 (citations가 있고 비어있지 않은 경우)
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
      referencesByMessage.set(messageIndex, { recordings, materials })
    }
  })

  // activeTab에 따라 필터링
  const recordingRefs = activeTab === 'notes' 
    ? Array.from(referencesByMessage.entries()).flatMap(([msgIndex, refs]) => 
        refs.recordings.map(ref => ({ messageIndex: msgIndex, ref }))
      )
    : []
  const materialRefs = activeTab === 'materials'
    ? Array.from(referencesByMessage.entries()).flatMap(([msgIndex, refs]) => 
        refs.materials.map(ref => ({ messageIndex: msgIndex, ref }))
      )
    : []

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
    
    // '---텍스트---'와 '---시각자료 설명---' 마커 제거 및 파싱
    const textMarker = '---텍스트---'
    const visualMarker = '---시각자료 설명---'
    
    let text = ''
    let visualDescription = ''
    
    // 마커가 있는 경우 파싱
    if (content.includes(textMarker) || content.includes(visualMarker)) {
      const textIndex = content.indexOf(textMarker)
      const visualIndex = content.indexOf(visualMarker)
      
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
    citations.forEach(citation => {
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
            highlightedContent = highlightedContent.replace(
              regex,
              '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>'
            )
          } else {
            // 정확한 매칭 실패 시 부분 매칭 시도 (공백 무시)
            const citationWords = normalizedCitation.split(' ').filter(w => w.length > 1)
            if (citationWords.length > 0) {
              // 핵심 단어들로 구성된 패턴 생성 (최소 3개 단어)
              const minWords = Math.min(3, citationWords.length)
              const pattern = citationWords.slice(0, minWords).join('\\s+')
              const flexibleRegex = new RegExp(`(${pattern})`, 'gi')
              
              if (normalizedContent.match(flexibleRegex)) {
                highlightedContent = highlightedContent.replace(
                  flexibleRegex,
                  '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>'
                )
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

  if (activeTab === 'answer') {
    return null
  }

  return (
    <div className="flex h-full flex-col bg-white">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            {activeTab === 'notes' ? (
              <>
                <Mic className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">수업녹음본</h2>
                <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                  {recordingRefs.length}개
                </span>
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">강의자료</h2>
                <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs text-primary-700">
                  {materialRefs.length}개
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

        {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'notes' && (
          <div className="space-y-6">
              {recordingRefs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Mic className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4">참고한 녹음본이 없습니다</p>
                </div>
              ) : (
              Array.from(referencesByMessage.entries())
                .filter(([_, refs]) => refs.recordings.length > 0)
                .map(([messageIndex, refs]) => (
                  <div key={`message-${messageIndex}`} className="space-y-3">
                    {/* 답변별 헤더 */}
                    <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-4">
                      <span className="text-sm font-semibold text-gray-900">
                        답변 {Math.floor(messageIndex / 2) + 1}: <span className="text-primary-600">{getKeywords(messageIndex)}</span>
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {refs.recordings.length}개 구간
                      </span>
                    </div>
                    
                    {/* 해당 답변의 녹음본 구간들 */}
                    {refs.recordings.map((ref, index) => {
                      const itemId = `recording-${messageIndex}-${index}`
                  const isExpanded = expandedItems.has(itemId)
                  
                  return (
                    <div
                      key={itemId}
                      className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                    >
                      {/* 헤더 */}
                      <button
                        onClick={() => toggleExpand(itemId)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm flex-shrink-0">
                            <Mic className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              녹음 구간 #{index + 1}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
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
                                    <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                                    <p className="text-xs text-gray-500">
                                      관련도 {(ref.metadata.score * 100).toFixed(0)}%
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

                      {/* 내용 */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                          <div className="p-4">
                            <div className="flex gap-2.5">
                              <div className="flex-shrink-0 w-1 rounded-full bg-gradient-to-b from-primary-400 to-primary-600"></div>
                              <div className="flex-1 min-w-0">
                                {/* 인터뷰 형식 요약이 있으면 사용, 없으면 원문 사용 */}
                                {(ref as any).summary ? (
                                  <div className="space-y-3">
                                    {/* 제목 */}
                                    <h3 className="text-base font-bold text-gray-900">
                                      {(ref as any).summary.title}
                                    </h3>
                                    {/* 본문 - summary 기준으로 하이라이트 적용 (citations가 summary 기준으로 추출됨) */}
                                    <p
                                      className="text-sm leading-relaxed text-gray-700"
                                      dangerouslySetInnerHTML={{
                                        __html: highlightCitations((ref as any).summary.content, ref.citations || [], (ref as any).summary.content)
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <p
                                    className="text-sm leading-relaxed text-gray-700"
                                    dangerouslySetInnerHTML={{
                                      __html: highlightCitations(ref.content, ref.citations || [], ref.content)
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
          )}

          {activeTab === 'materials' && (
          <div className="space-y-6">
              {materialRefs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4">참고한 강의자료가 없습니다</p>
                </div>
              ) : (
              Array.from(referencesByMessage.entries())
                .filter(([_, refs]) => refs.materials.length > 0)
                .map(([messageIndex, refs]) => (
                  <div key={`message-${messageIndex}`} className="space-y-3">
                    {/* 답변별 헤더 */}
                    <div className="flex items-center gap-2 border-b border-gray-200 pb-3 mb-4">
                      <span className="text-sm font-semibold text-gray-900">
                        답변 {Math.floor(messageIndex / 2) + 1}: <span className="text-primary-600">{getKeywords(messageIndex)}</span>
                      </span>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {refs.materials.length}개 페이지
                      </span>
                    </div>
                    
                    {/* 해당 답변의 강의자료 페이지들 */}
                    {refs.materials.map((ref, index) => {
                      const itemId = `material-${messageIndex}-${index}`
                  const isExpanded = expandedItems.has(itemId)
                      const filename = ref.metadata.original_filename || '강의자료'
                      const pageNumber = ref.metadata.page_number || index + 1
                  
                  return (
                    <div
                      key={itemId}
                      className="rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                    >
                      {/* 헤더 */}
                      <button
                        onClick={() => toggleExpand(itemId)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm flex-shrink-0">
                            <FileText className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {filename} <span className="text-gray-500 font-normal">페이지 {pageNumber}</span>
                            </p>
                            {ref.metadata.score && (
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                                <p className="text-xs text-gray-500">
                                  관련도 {(ref.metadata.score * 100).toFixed(0)}%
                                </p>
                              </div>
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

                      {/* 내용 */}
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-white">
                          {(() => {
                            const { text, visualDescription } = parseMaterialContent(ref.content)
                            const hasImage = !!ref.metadata.image_url
                            const hasText = !!text && text.trim().length > 0
                            const hasVisualDesc = !!visualDescription && visualDescription.trim().length > 0
                            
                            // 텍스트가 너무 길면 요약 (첫 200자만 표시)
                            const truncateText = (str: string, maxLength: number = 200) => {
                              if (str.length <= maxLength) return str
                              return str.substring(0, maxLength) + '...'
                            }
                            
                            return (
                              <div className="p-4 space-y-3">
                                {/* 이미지가 있으면 상단에 표시 */}
                                {hasImage && (
                                  <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                    <img
                                      src={ref.metadata.image_url}
                                      alt={`${filename} 페이지 ${pageNumber}`}
                                      className="w-full object-contain"
                                      style={{ maxHeight: '350px' }}
                                    />
                                  </div>
                                )}
                                
                                {/* 시각자료 설명 - 이미지와 함께 표시 (컴팩트) */}
                                {hasVisualDesc && (
                                  <div className="flex gap-2.5">
                                    <div className="flex-shrink-0 w-1 rounded-full bg-gradient-to-b from-blue-400 to-blue-600"></div>
                                    <div className="flex-1 min-w-0">
                                      <p 
                                        className="text-sm leading-relaxed text-gray-700"
                                        dangerouslySetInnerHTML={{
                                          __html: highlightCitations(visualDescription, ref.citations || [], ref.content)
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                                
                                {/* 텍스트 내용 - 간결하게 (긴 텍스트는 요약) */}
                                {hasText && (
                                  <div className="flex gap-2.5">
                                    <div className="flex-shrink-0 w-1 rounded-full bg-gradient-to-b from-gray-300 to-gray-400"></div>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="text-sm leading-relaxed text-gray-600"
                                        dangerouslySetInnerHTML={{
                                          __html: highlightCitations(text, ref.citations || [], ref.content)
                                        }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  )
                    })}
                  </div>
                ))
              )}
            </div>
          )}
      </div>
    </div>
  )
}

