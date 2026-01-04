/**
 * 복습 캐러셀 컴포넌트
 * - 1페이지: 수업명, 분반, 본질한줄, 5개 질문, 썸네일
 * - 2-6페이지: 각 질문별 페이지 (질문, 정답, 부연설명, 출처)
 */
'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { ReviewCarouselResponse } from '@/features/review/api/reviewApi'

interface ReviewCarouselProps {
  data: ReviewCarouselResponse | null
  isLoading: boolean
  error: string | null
}

export function ReviewCarousel({ data, isLoading, error }: ReviewCarouselProps) {
  const [currentPage, setCurrentPage] = useState(1) // 1-6 (1페이지 + 2-6페이지)

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        복습 콘텐츠가 없습니다
      </div>
    )
  }

  const totalPages = 1 + data.pages_2_6.length // 1페이지 + 2-6페이지

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNext = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  return (
    <div className="flex h-full flex-col relative">
      {/* 캐러셀 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {currentPage === 1 ? (
          <ReviewPage1 data={data.page_1} currentPage={currentPage} totalPages={totalPages} />
        ) : (
          <ReviewPage2_6 
            key={`page-${currentPage}`}
            data={data.pages_2_6[currentPage - 2]} 
            currentPage={currentPage} 
            totalPages={totalPages} 
          />
        )}
      </div>

      {/* 페이지 인디케이터 - 상단 중앙 */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <div
              key={page}
              className={`h-2 rounded-full transition-all ${
                page === currentPage
                  ? 'w-8 bg-gradient-to-r from-blue-500 to-indigo-600'
                  : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 네비게이션 버튼 - 양옆 중앙 (인스타그램 스타일) */}
      <button
        onClick={handlePrev}
        disabled={currentPage === 1}
        className={`absolute left-4 top-1/2 transform -translate-y-1/2 z-10 rounded-full p-3 bg-white/90 backdrop-blur-sm shadow-lg transition-all ${
          currentPage === 1
            ? 'text-gray-300 cursor-not-allowed opacity-50'
            : 'text-gray-700 hover:bg-white hover:scale-110'
        }`}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      
      <button
        onClick={handleNext}
        disabled={currentPage === totalPages}
        className={`absolute right-4 top-1/2 transform -translate-y-1/2 z-10 rounded-full p-3 bg-white/90 backdrop-blur-sm shadow-lg transition-all ${
          currentPage === totalPages
            ? 'text-gray-300 cursor-not-allowed opacity-50'
            : 'text-gray-700 hover:bg-white hover:scale-110'
        }`}
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  )
}

/**
 * 복습 캐러셀 1페이지 - 인스타그램 카드뉴스 스타일
 */
function ReviewPage1({ data, currentPage, totalPages }: { data: ReviewCarouselResponse['page_1']; currentPage: number; totalPages: number }) {
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden relative" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        {/* 페이지 번호 표시 - 우측 위 */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            {currentPage}/{totalPages}
          </div>
        </div>
        {/* 그리드 레이아웃: 좌측 텍스트, 우측 썸네일 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 h-full">
          {/* 좌측: 텍스트 콘텐츠 */}
          <div className="p-8 lg:p-10 flex flex-col justify-between overflow-y-auto">
            {/* 수업명 */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {data.course_title}
              </h1>
              {data.section && (
                <span className="text-sm text-gray-500 font-medium">{data.section}</span>
              )}
            </div>

            {/* 본질한줄 */}
            {data.essence_one_line && (
              <div className="mb-6">
                <div className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-3">
                  <span className="text-xs font-semibold text-white">강의 핵심</span>
                </div>
                <p className="text-base leading-relaxed text-gray-800 font-medium">
                  {data.essence_one_line}
                </p>
              </div>
            )}

            {/* 5개 핵심 질문 */}
            {data.questions.length > 0 && (
              <div className="flex-1">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">5개 핵심 질문</h2>
                <div className="space-y-2.5">
                  {data.questions.map((question, index) => (
                    <div key={index} className="flex items-start gap-3 group">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-xs font-bold text-white flex-shrink-0 mt-0.5 shadow-sm">
                        {question.question_order}
                      </span>
                      <span className="flex-1 text-sm leading-relaxed text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
                        {question.question_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 우측: 썸네일 이미지 */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8 lg:p-0">
            {data.thumbnail_image_url ? (
              <div className="w-full h-full max-h-[600px] rounded-xl overflow-hidden shadow-lg">
                <img
                  src={data.thumbnail_image_url}
                  alt="복습 썸네일"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // 이미지 로드 실패 시 플레이스홀더로 대체
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center">
                          <div class="text-center">
                            <div class="mx-auto h-16 w-16 text-gray-300 mb-4">
                              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p class="text-sm text-gray-400 font-medium">썸네일 로드 실패</p>
                          </div>
                        </div>
                      `
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-full max-h-[600px] rounded-xl border-2 border-dashed border-gray-300 bg-white flex items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">썸네일 생성 중...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 텍스트 정리 함수
 */
function cleanText(text: string, type: 'recording' | 'material'): string {
  let cleaned = text
  
  if (type === 'recording') {
    // 녹음본: **로 감싸진 텍스트의 ** 제거, * 제거, -로 시작하는 줄 제거
    cleaned = cleaned
      .replace(/\*\*([^*]+)\*\*/g, '$1') // **텍스트** -> 텍스트
      .replace(/\*/g, '') // 남은 * 제거
      .replace(/^-\s*/gm, '') // -로 시작하는 줄의 - 제거
      .replace(/^\s*-\s*/gm, '') // 앞에 공백이 있는 - 제거
      .trim()
  } else if (type === 'material') {
    // 강의자료: ---텍스트---와 ---시각자료 설명--- 제거
    cleaned = cleaned
      .replace(/---텍스트---/g, '')
      .replace(/---시각자료 설명---/g, '')
      .replace(/---/g, '') // 남은 --- 제거
      .trim()
  }
  
  // 연속된 빈 줄을 하나로 정리
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
  
  return cleaned.trim()
}

/**
 * HTML 이스케이프 함수
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 출처를 새 탭으로 열기
 */
function openSourceInNewTab(sources: ReviewCarouselResponse['pages_2_6'][0]['sources']) {
  const newWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!newWindow) return

  // HTML 생성 - 인터뷰 기사 형식으로 표시
  const recordingChunksHtml = sources.recording_chunks.map((chunk, index) => {
    // summary가 있으면 인터뷰 기사 형식으로, 없으면 원문 사용
    const hasSummary = chunk.summary && chunk.summary.title && chunk.summary.content
    const title = hasSummary ? chunk.summary!.title : '녹음본 내용'
    const content = hasSummary ? chunk.summary!.content : cleanText(chunk.text_content, 'recording')
    
    // 백엔드에서 이미 완전한 문장으로 처리되어 전달되므로 그대로 사용
    const escapedTitle = escapeHtml(title)
    const escapedContent = escapeHtml(content).replace(/\n/g, '<br>')
    
    return `
    <div style="border-radius: 0.75rem; background: linear-gradient(to bottom right, #f0fdf4, #d1fae5); padding: 1.5rem; border-left: 4px solid #10b981; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
        <span style="padding: 0.375rem 0.75rem; background-color: #10b981; color: white; font-size: 0.75rem; font-weight: 700; border-radius: 9999px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
          ${chunk.start_time.toFixed(1)}초 ~ ${chunk.end_time.toFixed(1)}초
        </span>
      </div>
      <div>
        <h3 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0 0 1rem 0; line-height: 1.4;">
          ${escapedTitle}
        </h3>
        <p style="font-size: 1rem; color: #1f2937; line-height: 1.75; white-space: pre-wrap; font-weight: 400; margin: 0;">
          ${escapedContent}
        </p>
      </div>
    </div>
  `
  }).join('')

  const materialPagesHtml = sources.material_pages.map((page, index) => {
    const textContentHtml = page.text_content 
      ? `<div style="margin-bottom: 0.5rem;">
          <p style="font-size: 1rem; color: #1f2937; line-height: 1.4; white-space: pre-wrap; font-weight: 500; margin: 0; padding: 0;">
            ${escapeHtml(cleanText(page.text_content, 'material')).replace(/\n/g, '<br>')}
          </p>
        </div>`
      : ''
    
    const imageHtml = page.image_url
      ? `<div style="margin-top: 0.75rem; border-radius: 0.75rem; overflow: hidden; border: 2px solid #e5e7eb; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); background-color: white;">
          <img src="${escapeHtml(page.image_url)}" alt="페이지 ${page.page_number}" style="width: 100%; height: auto; display: block;" />
        </div>`
      : ''
    
    return `
    <div style="border-radius: 0.75rem; background: linear-gradient(to bottom right, #eff6ff, #dbeafe); padding: 1rem; border-left: 4px solid #3b82f6; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); margin-bottom: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <span style="padding: 0.375rem 0.75rem; background-color: #3b82f6; color: white; font-size: 0.75rem; font-weight: 700; border-radius: 9999px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
          페이지 ${page.page_number}
        </span>
      </div>
      ${textContentHtml}
      ${imageHtml}
    </div>
  `
  }).join('')

  const html = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>출처</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
          background-color: #f9fafb;
          padding: 2rem;
          line-height: 1.5;
        }
        .container {
          max-width: 56rem;
          margin: 0 auto;
          background-color: white;
          border-radius: 1rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(to right, #eff6ff, #e0e7ff);
        }
        .header h1 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #111827;
        }
        .content {
          padding: 1.5rem;
          overflow-y: auto;
        }
        .section {
          margin-bottom: 2rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .section-line {
          height: 4px;
          width: 3rem;
          border-radius: 9999px;
        }
        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>출처</h1>
        </div>
        <div class="content">
          ${sources.recording_chunks.length > 0 ? `
            <div class="section">
              <div class="section-header">
                <div class="section-line" style="background: linear-gradient(to right, #10b981, #059669);"></div>
                <h2 class="section-title">녹음본 청크</h2>
              </div>
              ${recordingChunksHtml}
            </div>
          ` : ''}
          ${sources.material_pages.length > 0 ? `
            <div class="section">
              <div class="section-header">
                <div class="section-line" style="background: linear-gradient(to right, #3b82f6, #4f46e5);"></div>
                <h2 class="section-title">강의자료 페이지</h2>
              </div>
              ${materialPagesHtml}
            </div>
          ` : ''}
        </div>
      </div>
    </body>
    </html>
  `

  newWindow.document.write(html)
  newWindow.document.close()
}

/**
 * 복습 캐러셀 2-6페이지 - 인스타그램 카드뉴스 스타일
 */
function ReviewPage2_6({ data, currentPage, totalPages }: { data: ReviewCarouselResponse['pages_2_6'][0]; currentPage: number; totalPages: number }) {

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        페이지 데이터가 없습니다
      </div>
    )
  }

  // 핵심정답과 부연설명에 해당하는 빈칸 분리
  // 빈칸을 position 기준으로 정렬하고, 각 텍스트에 포함되는지 확인
  const sortedBlanks = [...data.answer.blanks].sort((a, b) => (a.position || 0) - (b.position || 0))
  
  // 핵심정답: 처음 2개 (position 0, 1)
  const keyAnswerBlanks = sortedBlanks
    .filter(b => data.answer.key_answer.includes(b.answer_text))
    .slice(0, 2)
  
  // 부연설명: 나머지 2개 (position 2, 3)
  const supplementaryBlanks = sortedBlanks
    .filter(b => data.answer.supplementary_explanation.includes(b.answer_text))
    .slice(2, 4)
  
  // 만약 필터링 결과가 부족하면 모든 빈칸을 사용
  const allKeyAnswerBlanks = keyAnswerBlanks.length > 0 
    ? keyAnswerBlanks 
    : sortedBlanks.filter(b => data.answer.key_answer.includes(b.answer_text))
  
  const allSupplementaryBlanks = supplementaryBlanks.length > 0
    ? supplementaryBlanks
    : sortedBlanks.filter(b => data.answer.supplementary_explanation.includes(b.answer_text))

  // 페이지 전체의 빈칸 상태를 공유 (핵심정답 + 부연설명)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  const toggleAllBlanks = () => {
    setIsAnimating(true)
    setIsRevealed(prev => !prev)
    setTimeout(() => setIsAnimating(false), 400)
  }

  return (
    <div className="h-full flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden my-auto relative" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        {/* 페이지 번호 표시 - 우측 위 */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
            {currentPage}/{totalPages}
          </div>
        </div>
        <div className="p-6 lg:p-8">
          {/* 헤더 */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md">
                {data.page_number - 1}
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{data.course_title}</h2>
                <p className="text-xs text-gray-500 font-medium">질문 {data.page_number - 1}</p>
              </div>
            </div>
          </div>

          {/* 질문 */}
          <div className="mb-8">
            <div className="inline-block px-3 py-1 bg-gray-100 rounded-full mb-3">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">질문</span>
            </div>
            <p className="text-xl font-bold text-gray-900 leading-relaxed">{data.question.question_name}</p>
          </div>

          {/* 핵심정답 */}
          <div className="mb-8">
            <div className="inline-block px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-3">
              <span className="text-xs font-semibold text-white">핵심정답</span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-l-4 border-green-500">
              <AnswerWithBlanks
                key={`page-${data.page_number}-key-answer`}
                text={data.answer.key_answer}
                blanks={allKeyAnswerBlanks}
                pageId={data.page_number}
                sectionType="key-answer"
                isRevealed={isRevealed}
                isAnimating={isAnimating}
                onToggle={toggleAllBlanks}
              />
            </div>
          </div>

          {/* 부연설명 */}
          <div className="mb-6">
            <div className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-3">
              <span className="text-xs font-semibold text-white">부연설명</span>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-l-4 border-blue-500">
              <AnswerWithBlanks
                key={`page-${data.page_number}-supplementary`}
                text={data.answer.supplementary_explanation}
                blanks={allSupplementaryBlanks}
                pageId={data.page_number}
                sectionType="supplementary"
                isRevealed={isRevealed}
                isAnimating={isAnimating}
                onToggle={toggleAllBlanks}
              />
            </div>
          </div>

          {/* 출처 버튼 */}
          <button
            onClick={() => openSourceInNewTab(data.sources)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <FileText className="h-4 w-4" />
            출처 보기
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 빈칸이 포함된 정답 텍스트 렌더링 - 인스타그램 스타일
 */
function AnswerWithBlanks({ 
  text, 
  blanks, 
  pageId, 
  sectionType,
  isRevealed: externalIsRevealed,
  isAnimating: externalIsAnimating,
  onToggle: externalOnToggle
}: { 
  text: string
  blanks: ReviewCarouselResponse['pages_2_6'][0]['answer']['blanks']
  pageId?: number
  sectionType?: string
  isRevealed?: boolean
  isAnimating?: boolean
  onToggle?: () => void
}) {
  // 페이지와 섹션별로 고유한 키 생성
  const uniquePrefix = pageId && sectionType ? `${pageId}-${sectionType}-` : ''
  
  // 외부에서 상태를 전달받으면 사용, 없으면 내부 상태 사용 (하위 호환성)
  const [internalIsRevealed, setInternalIsRevealed] = useState(false)
  const [internalIsAnimating, setInternalIsAnimating] = useState(false)
  
  const isRevealed = externalIsRevealed !== undefined ? externalIsRevealed : internalIsRevealed
  const isAnimating = externalIsAnimating !== undefined ? externalIsAnimating : internalIsAnimating
  
  const toggleAllBlanks = externalOnToggle || (() => {
    setInternalIsAnimating(true)
    setInternalIsRevealed(prev => !prev)
    setTimeout(() => setInternalIsAnimating(false), 400)
  })

  if (blanks.length === 0) {
    return <p className="text-base leading-relaxed text-gray-800 font-medium">{text}</p>
  }

  // 빈칸 위치 찾기 및 텍스트 분할
  const parts: Array<{ type: 'text' | 'blank'; content: string; blankIndex?: number; blankKey?: string }> = []
  let lastIndex = 0
  const usedIndices = new Set<number>()

  // 빈칸을 텍스트에서 찾기 (공백 정규화)
  blanks.forEach((blank, index) => {
    if (usedIndices.has(index)) return
    
    // 정답 텍스트 정규화 (공백 제거)
    const normalizedAnswer = blank.answer_text.replace(/\s+/g, ' ').trim()
    const normalizedText = text.replace(/\s+/g, ' ').trim()
    
    // 텍스트에서 정답 찾기 (대소문자 무시, 공백 무시)
    let blankIndex = -1
    let searchStart = lastIndex
    
    // 여러 번 시도 (텍스트의 다른 위치에서도 찾기)
    while (blankIndex === -1 && searchStart < normalizedText.length) {
      const foundIndex = normalizedText.toLowerCase().indexOf(
        normalizedAnswer.toLowerCase(),
        searchStart
      )
      if (foundIndex !== -1) {
        // 실제 원본 텍스트에서의 위치 찾기
        const originalIndex = text.toLowerCase().indexOf(
          blank.answer_text.toLowerCase(),
          searchStart
        )
        if (originalIndex !== -1) {
          blankIndex = originalIndex
          break
        }
      }
      searchStart += 1
    }
    
    if (blankIndex !== -1) {
      // 빈칸 이전 텍스트
      if (blankIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, blankIndex),
        })
      }
      // 빈칸 - 고유 키 생성
      const blankKey = `${uniquePrefix}${index}-${blank.answer_text.substring(0, 10)}`
      parts.push({
        type: 'blank',
        content: blank.answer_text,
        blankIndex: index,
        blankKey: blankKey,
      })
      lastIndex = blankIndex + blank.answer_text.length
      usedIndices.add(index)
    }
  })

  // 남은 텍스트
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    })
  }
  
  // 빈칸이 하나도 매칭되지 않았으면 원본 텍스트 반환
  if (parts.length === 0 || parts.every(p => p.type === 'text')) {
    return <p className="text-base leading-relaxed text-gray-800 font-medium">{text}</p>
  }

  return (
    <p className="text-base leading-relaxed text-gray-800 font-medium">
      {parts.map((part, i) => {
        if (part.type === 'blank' && part.blankIndex !== undefined && 'blankKey' in part) {
          const blank = blanks[part.blankIndex]
          return (
            <span
              key={i}
              onClick={toggleAllBlanks}
              className={`inline-block cursor-pointer rounded-lg px-3 py-1.5 mx-1 font-bold transition-all ${
                isRevealed
                  ? `bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white shadow-lg ${isAnimating ? 'animate-blank-reveal' : ''}`
                  : `bg-gray-300 text-gray-300 hover:bg-gray-400 hover:shadow-md ${isAnimating ? 'animate-blank-hide' : ''}`
              } ${!isAnimating && 'duration-300'} hover:scale-110 active:scale-95`}
              style={{
                textShadow: isRevealed ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
              }}
              title={isRevealed ? '클릭하여 숨기기' : '클릭하여 정답 보기'}
            >
              {isRevealed ? blank.answer_text : '_____'}
            </span>
          )
        }
        return <span key={i}>{part.content}</span>
      })}
    </p>
  )
}

