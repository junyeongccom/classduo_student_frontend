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
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      {/* 수업명 */}
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        {data.course_title}
        {data.section && <span className="ml-2 text-lg font-normal text-gray-500">({data.section})</span>}
      </h1>

      {/* 본질한줄 */}
      {data.essence_one_line && (
        <p className="mb-4 text-lg text-gray-700">
          {data.essence_one_line}
        </p>
      )}

      {/* 5개 핵심 질문 */}
      {data.questions.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">강의내용 5개 핵심 질문</h2>
          <ul className="space-y-2">
            {data.questions.map((question, index) => (
              <li key={index} className="flex items-start gap-2 text-gray-700">
                <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500 text-xs font-semibold text-white">
                  {question.question_order}
                </span>
                <span className="flex-1">{question.question_name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 썸네일 이미지 */}
      {data.thumbnail_image_url && (
        <div className="mt-6">
          <img
            src={data.thumbnail_image_url}
            alt="복습 썸네일"
            className="w-full rounded-lg object-cover"
          />
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

