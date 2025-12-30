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
    <div className="flex h-full flex-col">
      {/* 캐러셀 네비게이션 */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className={`rounded-lg p-2 ${
            currentPage === 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <span className="text-sm text-gray-500">
          {currentPage} / {totalPages}
        </span>
        
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className={`rounded-lg p-2 ${
            currentPage === totalPages
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* 캐러셀 콘텐츠 */}
      <div className="flex-1 overflow-y-auto">
        {currentPage === 1 ? (
          <ReviewPage1 data={data.page_1} />
        ) : (
          <ReviewPage2_6 data={data.pages_2_6[currentPage - 2]} />
        )}
      </div>
    </div>
  )
}

/**
 * 복습 캐러셀 1페이지
 */
function ReviewPage1({ data }: { data: ReviewCarouselResponse['page_1'] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-8" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
      {/* 수업명 - 작은 크기로 변경 */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-gray-800">
          {data.course_title}
          {data.section && <span className="ml-2 text-sm font-normal text-gray-500">({data.section})</span>}
        </h1>
      </div>

      {/* 본질한줄 - 가시성 개선 */}
      {data.essence_one_line && (
        <div className="mb-8 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-l-4 border-blue-400">
          <h2 className="text-sm font-medium text-blue-800 mb-2">강의 핵심 내용</h2>
          <p className="text-base leading-relaxed text-gray-800 font-medium">
            {data.essence_one_line}
          </p>
        </div>
      )}

      {/* 5개 핵심 질문 - 가시성 개선 */}
      {data.questions.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-base font-semibold text-gray-800">강의내용 5개 핵심 질문</h2>
          <div className="space-y-3">
            {data.questions.map((question, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white flex-shrink-0 mt-0.5">
                  {question.question_order}
                </span>
                <span className="flex-1 text-sm leading-relaxed text-gray-700 font-medium">
                  {question.question_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 썸네일 이미지 - 개선된 레이아웃 */}
      {data.thumbnail_image_url ? (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-gray-600">복습 썸네일</h3>
          <div className="rounded-lg overflow-hidden shadow-sm border border-gray-200">
            <img
              src={data.thumbnail_image_url}
              alt="복습 썸네일"
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-medium text-gray-600">복습 썸네일</h3>
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">썸네일 이미지 생성 중...</p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 복습 캐러셀 2-6페이지
 */
function ReviewPage2_6({ data }: { data: ReviewCarouselResponse['pages_2_6'][0] }) {
  const [showSources, setShowSources] = useState(false)

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        페이지 데이터가 없습니다
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* 페이지 번호 */}
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
          {data.page_number - 1}
        </span>
        <h2 className="text-xl font-bold text-gray-900">{data.course_title}</h2>
      </div>

      {/* 질문 */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800">질문</h3>
        <p className="text-gray-700">{data.question.question_name}</p>
      </div>

      {/* 정답 및 부연설명 */}
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-800">핵심정답</h3>
        <AnswerWithBlanks
          text={data.answer.key_answer}
          blanks={data.answer.blanks.filter(b => 
            data.answer.key_answer.includes(b.answer_text)
          )}
        />
        
        <h3 className="mb-2 mt-4 text-lg font-semibold text-gray-800">부연설명</h3>
        <AnswerWithBlanks
          text={data.answer.supplementary_explanation}
          blanks={data.answer.blanks.filter(b => 
            data.answer.supplementary_explanation.includes(b.answer_text)
          )}
        />
      </div>

      {/* 출처 버튼 */}
      <button
        onClick={() => setShowSources(!showSources)}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        <FileText className="h-4 w-4" />
        출처
      </button>

      {/* 출처 패널 */}
      {showSources && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">녹음본 청크</h4>
          <div className="mb-4 space-y-2">
            {data.sources.recording_chunks.map((chunk, index) => (
              <div key={index} className="rounded bg-white p-3 text-sm text-gray-700">
                <p className="text-xs text-gray-500">
                  {chunk.start_time.toFixed(1)}초 ~ {chunk.end_time.toFixed(1)}초
                </p>
                <p className="mt-1">{chunk.text_content}</p>
              </div>
            ))}
          </div>

          <h4 className="mb-3 text-sm font-semibold text-gray-700">강의자료 페이지</h4>
          <div className="space-y-2">
            {data.sources.material_pages.map((page, index) => (
              <div key={index} className="rounded bg-white p-3">
                <p className="text-xs text-gray-500">페이지 {page.page_number}</p>
                <p className="mt-1 text-sm text-gray-700">{page.text_content}</p>
                {page.image_url && (
                  <div className="mt-2">
                    <img
                      src={page.image_url}
                      alt={`페이지 ${page.page_number}`}
                      className="max-w-full rounded"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 빈칸이 포함된 정답 텍스트 렌더링
 */
function AnswerWithBlanks({ text, blanks }: { text: string; blanks: ReviewCarouselResponse['pages_2_6'][0]['answer']['blanks'] }) {
  const [revealedBlanks, setRevealedBlanks] = useState<Set<number>>(new Set())

  if (blanks.length === 0) {
    return <p className="text-gray-700">{text}</p>
  }

  // 빈칸 위치 찾기 및 텍스트 분할
  const parts: Array<{ type: 'text' | 'blank'; content: string; blankIndex?: number }> = []
  let lastIndex = 0

  blanks.forEach((blank, index) => {
    const blankIndex = text.indexOf(blank.answer_text, lastIndex)
    if (blankIndex !== -1) {
      // 빈칸 이전 텍스트
      if (blankIndex > lastIndex) {
        parts.push({
          type: 'text',
          content: text.substring(lastIndex, blankIndex),
        })
      }
      // 빈칸
      parts.push({
        type: 'blank',
        content: blank.answer_text,
        blankIndex: index,
      })
      lastIndex = blankIndex + blank.answer_text.length
    }
  })

  // 남은 텍스트
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    })
  }

  const toggleBlank = (index: number) => {
    setRevealedBlanks(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <p className="text-gray-700">
      {parts.map((part, i) => {
        if (part.type === 'blank' && part.blankIndex !== undefined) {
          const blank = blanks[part.blankIndex]
          const isRevealed = revealedBlanks.has(part.blankIndex)
          return (
            <span
              key={i}
              onClick={() => toggleBlank(part.blankIndex!)}
              className={`cursor-pointer rounded px-1.5 py-0.5 transition-all ${
                isRevealed
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-200 text-transparent hover:bg-gray-300'
              }`}
              title={isRevealed ? '클릭하여 숨기기' : '클릭하여 보기'}
            >
              {isRevealed ? blank.answer_text : blank.blank_text}
            </span>
          )
        }
        return <span key={i}>{part.content}</span>
      })}
    </p>
  )
}

