/**
 * 참고자료 패널 - 수업노트(녹음본)와 강의자료 표시
 */
'use client'

import { useState } from 'react'
import { X, FileText, Mic, ChevronDown, ChevronUp, Highlighter } from 'lucide-react'
import { Reference } from '@/features/ai-tutor/api/chatApi'

interface ReferencePanelProps {
  references: Reference[]
  activeTab: 'answer' | 'notes' | 'materials'
  onClose: () => void
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
    page_number?: number
    image_path?: string
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

export function ReferencePanel({ references, activeTab, onClose }: ReferencePanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 참고자료를 타입별로 분류
  const recordingRefs = references.filter(ref => ref.type === 'recording') as RecordingReference[]
  const materialRefs = references.filter(ref => ref.type === 'material') as MaterialReference[]

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

  // 인용 부분 하이라이트 처리
  const highlightCitations = (content: string, citations: Array<{ text: string }>) => {
    if (!citations || citations.length === 0) return content

    let highlightedContent = content
    citations.forEach(citation => {
      if (citation.text) {
        // 인용 텍스트를 하이라이트로 감싸기
        const escapedText = citation.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`(${escapedText})`, 'gi')
        highlightedContent = highlightedContent.replace(
          regex,
          '<mark class="bg-yellow-200 px-0.5 rounded">$1</mark>'
        )
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            {activeTab === 'notes' ? (
              <>
                <Mic className="h-5 w-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-gray-900">수업노트</h2>
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
        <div className="max-h-[calc(80vh-80px)] overflow-y-auto p-6">
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {recordingRefs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <Mic className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4">참고한 녹음본이 없습니다</p>
                </div>
              ) : (
                recordingRefs.map((ref, index) => {
                  const itemId = `recording-${index}`
                  const isExpanded = expandedItems.has(itemId)
                  
                  return (
                    <div
                      key={itemId}
                      className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
                    >
                      {/* 헤더 */}
                      <button
                        onClick={() => toggleExpand(itemId)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100">
                            <Mic className="h-4 w-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              녹음 구간 #{index + 1}
                            </p>
                            {ref.metadata.start_time !== undefined && (
                              <p className="text-xs text-gray-500">
                                {formatTime(ref.metadata.start_time)} - {formatTime(ref.metadata.end_time)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ref.citations && ref.citations.length > 0 && (
                            <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                              <Highlighter className="h-3 w-3" />
                              인용 {ref.citations.length}개
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
                        <div className="border-t border-gray-200 bg-white px-4 py-3">
                          <p
                            className="text-sm leading-relaxed text-gray-700"
                            dangerouslySetInnerHTML={{
                              __html: highlightCitations(ref.content, ref.citations || [])
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-4">
              {materialRefs.length === 0 ? (
                <div className="py-12 text-center text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-4">참고한 강의자료가 없습니다</p>
                </div>
              ) : (
                materialRefs.map((ref, index) => {
                  const itemId = `material-${index}`
                  const isExpanded = expandedItems.has(itemId)
                  
                  return (
                    <div
                      key={itemId}
                      className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden"
                    >
                      {/* 헤더 */}
                      <button
                        onClick={() => toggleExpand(itemId)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              강의자료 페이지 {ref.metadata.page_number || index + 1}
                            </p>
                            {ref.metadata.score && (
                              <p className="text-xs text-gray-500">
                                관련도: {(ref.metadata.score * 100).toFixed(0)}%
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {ref.citations && ref.citations.length > 0 && (
                            <span className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                              <Highlighter className="h-3 w-3" />
                              인용 {ref.citations.length}개
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
                        <div className="border-t border-gray-200 bg-white p-4">
                          {/* 이미지가 있으면 표시 */}
                          {ref.metadata.image_path && (
                            <div className="mb-4">
                              <img
                                src={ref.metadata.image_path}
                                alt={`강의자료 페이지 ${ref.metadata.page_number}`}
                                className="max-h-64 w-full rounded-lg border border-gray-200 object-contain"
                              />
                            </div>
                          )}
                          
                          {/* 텍스트 내용 */}
                          <p
                            className="text-sm leading-relaxed text-gray-700"
                            dangerouslySetInnerHTML={{
                              __html: highlightCitations(ref.content, ref.citations || [])
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

