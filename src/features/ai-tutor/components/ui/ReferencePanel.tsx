/**
 * 참고자료 패널 - 수업녹음본과 강의자료 표시
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, FileText, Mic, ChevronDown, ChevronUp, Highlighter } from 'lucide-react'
import katex from 'katex'
import { Reference, SourceFocusTarget } from '@/features/ai-tutor/types'
import { splitMathSegments } from '@/shared/lib/math/splitMathSegments'

interface ReferencePanelProps {
  allReferences: Map<number, Reference[]>
  variant: 'notes' | 'materials'
  onClose: () => void
  messages: Array<{ role: 'user' | 'assistant'; content: string; summary_keywords?: string | null }>
  isRecordingSourceDisabled?: boolean
  className?: string
  /** 답변 본문 출처 버튼 클릭 시 스크롤·펼침할 대상 (variant 가 일치하는 패널만 반응) */
  focusTarget?: SourceFocusTarget | null
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
    lecture_label?: string | null
    lecture_no?: number | null
    lecture_title?: string | null
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
    lecture_label?: string | null
    lecture_no?: number | null
    lecture_title?: string | null
  }
  citations: Array<{
    text: string
    start_idx?: number
    end_idx?: number
  }>
}

export function ReferencePanel({ allReferences, variant, onClose, messages, isRecordingSourceDisabled, className, focusTarget }: ReferencePanelProps) {
  const t = useTranslations('aiTutorReference')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [scrollPositions, setScrollPositions] = useState({ notes: 0, materials: 0 })
  // 답변 본문 출처 버튼 클릭으로 포커스된 카드 — 잠시 링 하이라이트 표시.
  // nonce 를 함께 담아, 같은 카드를 다시 눌러도 스크롤 effect 가 재실행된다.
  const [focusedItem, setFocusedItem] = useState<{ id: string; nonce: number } | null>(null)
  const focusedItemId = focusedItem?.id ?? null
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 이미 처리한 focusTarget.nonce — 리렌더로 effect 가 재실행돼도 같은 클릭을 두 번 처리하지 않는다
  const handledNonceRef = useRef<number | null>(null)
  const notesContainerRef = useRef<HTMLDivElement>(null)
  const materialsContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => {
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
  }, [])

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

  // 답변 본문 출처 버튼 클릭 → 해당 카드 펼침 + 스크롤 + 링 하이라이트.
  // variant 가 일치하는 패널만 반응 (녹음본→notes, 페이지→materials).
  useEffect(() => {
    if (!focusTarget) return
    const expectedVariant = focusTarget.type === 'recording' ? 'notes' : 'materials'
    if (variant !== expectedVariant) return
    if (handledNonceRef.current === focusTarget.nonce) return
    handledNonceRef.current = focusTarget.nonce

    const group = referencesByMessage.get(focusTarget.messageIndex)
    let itemId: string | null = null
    if (group) {
      if (focusTarget.type === 'recording') {
        // 카드 표시 번호(displayIndex)와 동일한 규칙: (reference_index ?? chunk_index) + 1
        const idx = group.recordings.findIndex((ref, i) => {
          const sortIndex = getRecordingSortIndex(ref)
          const displayIndex = (Number.isFinite(sortIndex) ? sortIndex : i) + 1
          return displayIndex === focusTarget.sourceNo
        })
        if (idx !== -1) itemId = `recording-${focusTarget.messageIndex}-${idx}`
      } else {
        const idx = group.materials.findIndex((ref) => ref.metadata.page_number === focusTarget.sourceNo)
        if (idx !== -1) itemId = `material-${focusTarget.messageIndex}-${idx}`
      }
    }

    // 아직 refs 가 도착하지 않아 대상 카드를 못 찾았으면 처리 표시를 되돌려,
    // allReferences 가 채워진 뒤 이 effect 가 다시 시도할 수 있게 한다.
    if (!itemId) {
      handledNonceRef.current = null
      return
    }

    const finalItemId = itemId
    setExpandedItems((prev) => {
      const next = new Set(prev)
      next.add(finalItemId)
      return next
    })
    setFocusedItem({ id: finalItemId, nonce: focusTarget.nonce })
    if (focusTimerRef.current) clearTimeout(focusTimerRef.current)
    focusTimerRef.current = setTimeout(() => setFocusedItem(null), 2000)
    // referencesByMessage 는 렌더마다 재생성되므로 원본인 allReferences 를 dep 으로 쓴다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTarget?.nonce, variant, allReferences])

  // 포커스 카드가 정해지고 펼침까지 렌더된 뒤에 스크롤한다. 스크롤을 위 effect 안에서
  // 하면 카드가 아직 접힌 레이아웃이라 위치가 어긋난다 — 별도 effect 라야 커밋 이후가 보장된다.
  // 위치 계산은 scrollIntoView 에 맡기고, 상단 여백은 카드의 scroll-mt-3 로 준다.
  // behavior 는 'auto' — 이 패널의 absolute inset-0 스크롤 컨테이너에서는 'smooth' 가
  // 무시돼 아예 스크롤되지 않는다(콘솔에서 직접 호출해도 동일).
  useEffect(() => {
    if (!focusedItem) return
    const container = variant === 'notes' ? notesContainerRef.current : materialsContainerRef.current
    container
      ?.querySelector(`[data-ref-item="${focusedItem.id}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'auto' })
  }, [focusedItem, variant])

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
  // 수식이 섞인 자료 원문 렌더 — 텍스트 구간은 **볼드** 변환 + 인용 하이라이트,
  // 수식 구간($…$/$$…$$)은 KaTeX 로 렌더하고 인용에 걸린 수식이면 배경 하이라이트.
  // 원문을 그대로 뿌리면 수학 과목 출처 탭이 LaTeX 마킹 소스로 보인다 (2026-08-23 실측).
  const renderSourceRich = (raw: string, citations: Array<{ text: string }>, originalContent?: string) => {
    const segments = splitMathSegments(raw)
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
    const normCitations = (citations || []).map((c) => norm(c.text || '')).filter(Boolean)
    return segments.map((seg, i) => {
      if (seg.type === 'text') {
        // 짝 있는 **볼드**는 변환, 남는 홀수 ** (녹음 요약의 "-**" 구조 마킹)는 제거,
        // 추출기의 마크다운 이스케이프(\_ \* \# 등)는 원문 문자로 복원 — 빈칸 문제의
        // "\_\_\_\_" 가 백슬래시째 노출되던 실측(2026-08-24) 대응
        const bolded = seg.value
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/\*\*/g, '')
          // 줄머리 마크다운 마커(#·##·###, * / -)는 원문 그대로 두면 출처 패널에
          // "# 주요 한계 심화" · "* 독립변수 간에…" 로 노출된다 (2026-08-25 실측).
          // 이스케이프 복원 **전에** 처리해야 원문의 리터럴 별표(\*)를 리스트로 오인하지 않는다.
          .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
          .replace(/^([ \t]*)[*-][ \t]+/gm, '$1• ')
          .replace(/\\([_*$#[\](){}!.+\-`>~\\])/g, '$1')
        return (
          <span
            key={i}
            dangerouslySetInnerHTML={{ __html: highlightCitations(bolded, citations || [], originalContent) }}
          />
        )
      }
      const html = katex.renderToString(seg.value, {
        throwOnError: false,
        strict: 'ignore',
        displayMode: seg.type === 'block',
        output: 'htmlAndMathml',
      })
      const normSeg = norm(seg.value)
      const cited = normCitations.some((c) => normSeg.includes(c) || c.includes(normSeg))
      const cls = `${seg.type === 'block' ? 'my-1 block overflow-x-auto' : ''} ${cited ? 'rounded bg-yellow-200 px-0.5' : ''}`.trim()
      return <span key={i} className={cls || undefined} dangerouslySetInnerHTML={{ __html: html }} />
    })
  }

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
                // chunk_index/reference_index 는 0-based 내부값. "녹음 구간 #0" 은 학습자에게 어색하므로
                // 표시만 1-based 로 올린다(답변 본문의 [녹음본 N] 표기도 백엔드에서 1-based 로 통일됨).
                const displayIndex = (Number.isFinite(sortIndex) ? sortIndex : index) + 1
                return (
                  <div
                    key={itemId}
                    data-ref-item={itemId}
                    className={`scroll-mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${
                      focusedItemId === itemId ? 'ring-2 ring-indigo-400' : ''
                    }`}
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
                            {(ref.metadata.lecture_no != null || ref.metadata.lecture_label) && (
                              <span
                                className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600"
                                title={ref.metadata.lecture_label || undefined}
                              >
                                {ref.metadata.lecture_no != null ? `${ref.metadata.lecture_no}회차` : ref.metadata.lecture_label}
                              </span>
                            )}
                            {ref.metadata.start_time !== undefined && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-medium text-gray-600">
                                  {formatTime(ref.metadata.start_time)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
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
                                    {String((ref as any).summary.title || '').replace(/\*\*/g, '')}
                                  </h3>
                                  <p className="text-sm leading-relaxed text-gray-700">
                                    {renderSourceRich((ref as any).summary.content, ref.citations || [], (ref as any).summary.content)}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-sm leading-relaxed text-gray-700">
                                  {renderSourceRich(ref.content, ref.citations || [], ref.content)}
                                </p>
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
                const hasImage = Boolean(ref.metadata.image_url)

                return (
                  <div
                    key={itemId}
                    data-ref-item={itemId}
                    className={`scroll-mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${
                      focusedItemId === itemId ? 'ring-2 ring-indigo-400' : ''
                    }`}
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
                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            {(ref.metadata.lecture_no != null || ref.metadata.lecture_label) && (
                              <span
                                className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600"
                                title={ref.metadata.lecture_label || undefined}
                              >
                                {ref.metadata.lecture_no != null ? `${ref.metadata.lecture_no}회차` : ref.metadata.lecture_label}
                              </span>
                            )}
                            {ref.metadata.page_number && (
                              <p className="text-xs text-gray-500">
                                {t('page')} {ref.metadata.page_number}
                              </p>
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
                        <div className="space-y-4 p-4">
                          {hasImage && (
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                              <img
                                src={ref.metadata.image_url}
                                alt={ref.metadata.original_filename || t('materialAlt', { index: index + 1 })}
                                className="w-full object-contain"
                                style={{ maxHeight: 360 }}
                              />
                            </div>
                          )}

                          {text && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {t('materialText')}
                              </h4>
                              <p className="whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-sm leading-relaxed text-gray-800">
                                {renderSourceRich(text, ref.citations || [], ref.content)}
                              </p>
                            </div>
                          )}

                          {visualDescription && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {t('visualDescription')}
                              </h4>
                              <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                                {renderSourceRich(visualDescription, ref.citations || [], ref.content)}
                              </p>
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
          className="rounded-lg p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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


