/**
 * 복습 캐러셀 컴포넌트
 * - 1페이지: 수업명, 분반, 본질한줄, 썸네일
 * - 2-6페이지: 각 질문별 페이지 (핵심내용, 부연설명, 출처)
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, FileText, Image as ImageIcon } from 'lucide-react'
import { ReviewCarouselResponse, reviewService } from '@/features/review/services/reviewService'
import { tryIncrementPageProgress } from '@/features/review/hooks/useReviewProgress'
import { ReviewLoading } from '@/features/review'
import { useReviewStore } from '@/features/review/store/useReviewStore'
import { useI18n } from '@/shared/i18n/I18nProvider'

interface ReviewCarouselProps {
  data: ReviewCarouselResponse | null
  isLoading: boolean
  error: string | null
  courseId?: string | null // 강의 ID (진행도 달성 시 불꽃 증가에 필요)
}

export function ReviewCarousel({ data, isLoading, error, courseId }: ReviewCarouselProps) {
  const t = useTranslations('review')
  const { locale } = useI18n()
  const [currentPage, setCurrentPage] = useState(1) // 1-6 (1페이지 + 2-6페이지)
  const { preloadBlanks, clearLectureData } = useReviewStore()
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  
  // 다른 강의회차 선택 시 페이지를 1로 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [data])

  // 페이지/데이터 변경 시 상단으로 스크롤
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [currentPage, data])
  
  // 복습 콘텐츠 로딩 시 모든 빈칸 데이터를 미리 저장
  useEffect(() => {
    if (data && data.pages_2_6.length > 0) {
      const lectureId = data.page_1.lecture_id
      // 이전 강의 데이터 정리
      clearLectureData(lectureId, locale)
      // 새 강의의 빈칸 데이터 미리 로드
      preloadBlanks(lectureId, data.pages_2_6, locale)
    }
  }, [data, preloadBlanks, clearLectureData, locale])

  if (isLoading) {
    return <ReviewLoading message={t('preparingContent')} size="inline" />
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
        {t('noContent')}
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {currentPage === 1 ? (
          <ReviewPage1 data={data.page_1} currentPage={currentPage} totalPages={totalPages} />
        ) : (
          <ReviewPage2_6 
            key={`page-${currentPage}`}
            data={data.pages_2_6[currentPage - 2]} 
            currentPage={currentPage} 
            totalPages={totalPages}
            lectureId={data.page_1.lecture_id}
            courseId={courseId || undefined}
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
  const t = useTranslations('review')
  const thumbnailLoadFailed = t('thumbnailLoadFailed')
  
  return (
    <div className="min-h-full flex items-start justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl relative" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        {/* 페이지 번호 표시 - 우측 위 (overflow-hidden 밖에 위치) */}
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            {currentPage}/{totalPages}
          </div>
        </div>
        {/* 그리드 레이아웃: 좌측 텍스트, 우측 썸네일 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-2xl">
          {/* 좌측: 텍스트 콘텐츠 */}
          <div className="p-8 lg:p-10 flex flex-col justify-start">
            {/* 수업명 */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-1 leading-snug whitespace-normal break-words">
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
                  <span className="text-xs font-semibold text-white">{t('lectureCore')}</span>
                </div>
                <p className="text-base leading-relaxed text-gray-800 font-medium">
                  {data.essence_one_line}
                </p>
              </div>
            )}
          </div>

          {/* 우측: 썸네일 이미지 */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-8 lg:p-0">
            {data.thumbnail_image_url ? (
              <div className="w-full h-full max-h-[600px] rounded-xl overflow-hidden shadow-lg relative">
                {/* 로딩 플레이스홀더 */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                </div>
                <img
                  src={data.thumbnail_image_url}
                  alt="복습 썸네일"
                  className="w-full h-full object-cover relative z-10"
                  loading="lazy"
                  decoding="async"
                  onLoad={(e) => {
                    // 이미지 로드 완료 시 플레이스홀더 숨기기
                    const target = e.target as HTMLImageElement
                    const placeholder = target.previousElementSibling as HTMLElement
                    if (placeholder) {
                      placeholder.style.display = 'none'
                    }
                  }}
                  onError={(e) => {
                    // 이미지 로드 실패 시 플레이스홀더로 대체
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const placeholder = target.previousElementSibling as HTMLElement
                    if (placeholder) {
                      placeholder.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center">
                          <div class="text-center">
                            <div class="mx-auto h-16 w-16 text-gray-300 mb-4">
                              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <p class="text-sm text-gray-400 font-medium">${thumbnailLoadFailed}</p>
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
                  <p className="text-sm text-gray-400 font-medium">{t('thumbnailGenerating')}</p>
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
 * 빈칸 플레이스홀더 생성 함수
 * 정답 텍스트의 글자 수에 맞게 공백을 생성하고, 공백은 그대로 유지
 * 예: '균형과 소통' -> '   ' (공백으로 길이 유지)
 */
function generateBlankPlaceholder(answer: string): string {
  return answer
    .split('')
    .map(char => char === ' ' ? ' ' : '\u00A0') // 공백은 그대로, 나머지는 non-breaking space
    .join('')
}

/**
 * 빈칸 마스크 문자열 생성 (○)
 * 예: '세포 분열' -> '○○ ○○'
 */
function generateBlankCircleMask(answer: string): string {
  return answer
    .split('')
    .map(char => (char === ' ' ? ' ' : '○'))
    .join('')
}

/**
 * 정규식 특수문자 이스케이프
 */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * 빈칸 위치 찾기 (공백 차이를 허용, 대소문자 무시)
 */
function findBlankIndex(text: string, answerText: string, startIndex: number): number {
  const trimmedAnswer = answerText.trim()
  if (!trimmedAnswer) return -1

  const pattern = escapeRegExp(trimmedAnswer).replace(/\s+/g, '\\s+')
  const regex = new RegExp(pattern, 'i')
  const slice = text.slice(startIndex)
  const match = slice.match(regex)

  if (match && match.index !== undefined) {
    return startIndex + match.index
  }

  const lowerText = text.toLowerCase()
  const lowerAnswer = trimmedAnswer.toLowerCase()
  return lowerText.indexOf(lowerAnswer, startIndex)
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
  if (typeof window === 'undefined') return text // 서버 사이드 렌더링 시 안전장치
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 출처를 새 탭으로 열기
 */
function openSourceInNewTab(
  sources: ReviewCarouselResponse['pages_2_6'][0]['sources'],
  translations: {
    source: string
    recording: string
    materialPage: string
    second: string
    page: string
    recordingContent: string
    recordingSourceDisabled: string
  }
) {
  const newWindow = window.open('', '_blank', 'width=1200,height=800')
  if (!newWindow) return

  // HTML 생성 - 인터뷰 기사 형식으로 표시
  const recordingChunksHtml = sources.recording_chunks.map((chunk, index) => {
    // summary가 있으면 인터뷰 기사 형식으로, 없으면 원문 사용
    const hasSummary = chunk.summary && chunk.summary.title && chunk.summary.content
    const title = hasSummary ? chunk.summary!.title : translations.recordingContent
    const content = hasSummary ? chunk.summary!.content : cleanText(chunk.text_content, 'recording')
    
    // 백엔드에서 이미 완전한 문장으로 처리되어 전달되므로 그대로 사용
    const escapedTitle = escapeHtml(title)
    const escapedContent = escapeHtml(content).replace(/\n/g, '<br>')
    
    return `
    <div style="border-radius: 0.75rem; background: linear-gradient(to bottom right, #f0fdf4, #d1fae5); padding: 1.5rem; border-left: 4px solid #10b981; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
        <span style="padding: 0.375rem 0.75rem; background-color: #10b981; color: white; font-size: 0.75rem; font-weight: 700; border-radius: 9999px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
          ${chunk.start_time.toFixed(1)}${translations.second} ~ ${chunk.end_time.toFixed(1)}${translations.second}
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
          <img src="${escapeHtml(page.image_url)}" alt="${translations.page} ${page.page_number}" style="width: 100%; height: auto; display: block;" />
        </div>`
      : ''
    
    return `
    <div style="border-radius: 0.75rem; background: linear-gradient(to bottom right, #eff6ff, #dbeafe); padding: 1rem; border-left: 4px solid #3b82f6; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); margin-bottom: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
        <span style="padding: 0.375rem 0.75rem; background-color: #3b82f6; color: white; font-size: 0.75rem; font-weight: 700; border-radius: 9999px; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
          ${translations.page} ${page.page_number}
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
      <title>${translations.source}</title>
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
          <h1>${translations.source}</h1>
        </div>
        <div class="content">
          ${sources.recording_chunks.length > 0 ? `
            <div class="section">
              <div class="section-header">
                <div class="section-line" style="background: linear-gradient(to right, #10b981, #059669);"></div>
                <h2 class="section-title">${translations.recording}</h2>
              </div>
              ${recordingChunksHtml}
            </div>
          ` : sources.is_recording_source_disabled ? `
            <div class="section">
              <div class="section-header">
                <div class="section-line" style="background: linear-gradient(to right, #10b981, #059669);"></div>
                <h2 class="section-title">${translations.recording}</h2>
              </div>
              <div style="border-radius: 0.75rem; background: linear-gradient(to bottom right, #f0fdf4, #d1fae5); padding: 1.5rem; border-left: 4px solid #10b981; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);">
                <p style="font-size: 1rem; color: #6b7280; text-align: center; margin: 0;">
                  ${translations.recordingSourceDisabled}
                </p>
              </div>
            </div>
          ` : ''}
          ${sources.material_pages.length > 0 ? `
            <div class="section">
              <div class="section-header">
                <div class="section-line" style="background: linear-gradient(to right, #3b82f6, #4f46e5);"></div>
                <h2 class="section-title">${translations.materialPage}</h2>
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
function ReviewPage2_6({ data, currentPage, totalPages, lectureId, courseId }: { data: ReviewCarouselResponse['pages_2_6'][0]; currentPage: number; totalPages: number; lectureId: string; courseId?: string }) {
  const t = useTranslations('review')

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        {t('noPageData')}
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
  const [hasTriedProgress, setHasTriedProgress] = useState(false) // 진행도 시도 플래그
  const [showSupplementary, setShowSupplementary] = useState(false) // 부연설명 표시 여부

  const toggleAllBlanks = async () => {
    // 빈칸을 열려고 할 때 (아직 안 열린 상태에서) 진행도 증가 시도
    if (!isRevealed && !hasTriedProgress) {
      const reviewAnswerId = data.answer.review_answer_id ?? undefined

      if (reviewAnswerId) {
        await tryIncrementPageProgress(lectureId, data.page_number, reviewAnswerId)
        setHasTriedProgress(true)
      } else {
        console.warn('[ReviewCarousel] review_answer_id가 없어 진행도 증가를 건너뜁니다. 백엔드 API 응답에 review_answer_id가 포함되어야 합니다.')
      }
    }

    setIsAnimating(true)
    setIsRevealed(prev => !prev)
    setTimeout(() => setIsAnimating(false), 400)
  }

  return (
    <div className="h-full flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl my-auto relative" style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        {/* 페이지 번호 표시 - 우측 위 (overflow-hidden 밖에 위치) */}
        <div className="absolute -top-2 -right-2 z-20">
          <div className="bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
            {currentPage}/{totalPages}
          </div>
        </div>
        <div className="p-6 lg:p-8 overflow-hidden rounded-2xl">
          {/* 헤더 */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-md">
                {data.page_number - 1}
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{data.course_title}</h2>
              </div>
            </div>
          </div>

          {/* 핵심내용 */}
          <div className="mb-8">
            <div className="inline-block px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full mb-3">
              <span className="text-xs font-semibold text-white">{t('keyContent')}</span>
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
                lectureId={lectureId}
                reviewAnswerId={data.answer.review_answer_id ?? undefined}
              />
            </div>
          </div>

          {/* 부연설명 */}
          <div className="mb-6">
            <button
              onClick={() => setShowSupplementary(!showSupplementary)}
              className="inline-block px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-3 cursor-pointer hover:from-blue-600 hover:to-indigo-700 transition-all"
            >
              <span className="text-xs font-semibold text-white">{t('additionalExplanationClickable')}</span>
            </button>
            {showSupplementary && (
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
                  lectureId={lectureId}
                  reviewAnswerId={data.answer.review_answer_id ?? undefined}
                />
              </div>
            )}
          </div>

          {/* 출처 버튼 */}
          <button
            onClick={() => openSourceInNewTab(data.sources, {
              source: t('source'),
              recording: t('recording'),
              materialPage: t('materialPage'),
              second: t('second'),
              page: t('page'),
              recordingContent: t('recordingContent'),
              recordingSourceDisabled: t('recordingSourceDisabled')
            })}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <FileText className="h-4 w-4" />
            {t('viewSource')}
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
  onToggle: externalOnToggle,
  lectureId,
  reviewAnswerId
}: { 
  text: string
  blanks: ReviewCarouselResponse['pages_2_6'][0]['answer']['blanks']
  pageId?: number
  sectionType?: string
  isRevealed?: boolean
  isAnimating?: boolean
  onToggle?: () => void
  lectureId?: string
  reviewAnswerId?: string
}) {
  // 페이지와 섹션별로 고유한 키 생성
  const uniquePrefix = pageId && sectionType ? `${pageId}-${sectionType}-` : ''
  
  // 외부에서 상태를 전달받으면 사용, 없으면 내부 상태 사용 (하위 호환성)
  const [internalIsRevealed, setInternalIsRevealed] = useState(false)
  
  const isRevealed = externalIsRevealed !== undefined ? externalIsRevealed : internalIsRevealed
  
  const handleReveal = externalOnToggle || (() => {
    setInternalIsRevealed(prev => !prev)
  })

  // 부연설명 섹션에서는 빈칸을 찾지 않고 일반 텍스트로만 표시
  if (sectionType === 'supplementary') {
    return <p className="text-base leading-relaxed text-gray-800 font-medium">{text}</p>
  }

  if (blanks.length === 0) {
    return <p className="text-base leading-relaxed text-gray-800 font-medium">{text}</p>
  }

  // 빈칸 위치 찾기 및 텍스트 분할
  const parts: Array<{ type: 'text' | 'blank'; content: string; blankIndex?: number; blankKey?: string }> = []
  let lastIndex = 0

  // 빈칸을 텍스트에서 찾기 (공백 정규화)
  blanks.forEach((blank, index) => {
    const blankIndex = findBlankIndex(text, blank.answer_text, lastIndex)
    
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
            <SimpleBlank
              key={i}
              answer={blank.answer_text}
              isRevealed={isRevealed}
              onReveal={handleReveal}
              lectureId={lectureId}
              reviewAnswerId={reviewAnswerId}
              pageId={pageId}
              blankIndex={part.blankIndex}
              sectionType={sectionType}
            />
          )
        }
        return <span key={i}>{part.content}</span>
      })}
    </p>
  )
}

/**
 * 간단한 빈칸 컴포넌트 (shimmer 효과만)
 */
function SimpleBlank({ 
  answer, 
  isRevealed, 
  onReveal,
  lectureId,
  reviewAnswerId,
  pageId,
  blankIndex,
  sectionType
}: { 
  answer: string
  isRevealed: boolean
  onReveal: () => void
  lectureId?: string
  reviewAnswerId?: string
  pageId?: number
  blankIndex?: number
  sectionType?: string
}) {
  const { locale } = useI18n()
  const { setBlankRevealed, isBlankRevealed: getIsBlankRevealed, getBlankData } = useReviewStore()
  
  // 부연설명 섹션에서는 항상 revealed 상태
  const isSupplementary = sectionType === 'supplementary'
  
  // Store에서 빈칸 상태 확인 (pageId와 blankIndex가 있을 때만)
  const storeRevealed = pageId !== undefined && blankIndex !== undefined && lectureId
    ? getIsBlankRevealed(lectureId, pageId, blankIndex, locale)
    : isRevealed
  
  // 부연설명이면 항상 revealed, 아니면 Store의 revealed 상태를 우선 사용, 없으면 prop 사용
  const actualIsRevealed = isSupplementary ? true : storeRevealed
  
  const handleClick = () => {
    // Store에 상태 즉시 업데이트 (pageId와 blankIndex가 있을 때만)
    if (pageId !== undefined && blankIndex !== undefined && lectureId) {
      const newRevealed = !actualIsRevealed
      setBlankRevealed(lectureId, pageId, blankIndex, newRevealed, locale)
      
      // 빈칸이 처음 열릴 때만 POST 요청 (OX 퀴즈 패턴)
      if (newRevealed) {
        const blankData = getBlankData(lectureId, pageId, blankIndex, locale)
        const answerId = blankData?.review_answer_id || reviewAnswerId
        
        if (answerId) {
          // Fire-and-forget 방식으로 백그라운드에서 처리
          reviewService.completeReview(lectureId, {
            review_answer_id: answerId,
          })
            .then((result) => {
              if (result.error) {
                console.error('[ReviewCarousel] 빈칸 클릭 POST 실패:', result.error)
              }
            })
            .catch((error) => {
              console.error('[ReviewCarousel] 빈칸 클릭 POST 예외:', error)
            })
        }
      }
    } else {
      // Store를 사용할 수 없는 경우 기존 로직 사용
      if (!isRevealed && lectureId && reviewAnswerId) {
        // Fire-and-forget 방식으로 백그라운드에서 처리
        reviewService.completeReview(lectureId, {
          review_answer_id: reviewAnswerId,
        })
          .then((result) => {
            if (result.error) {
              console.error('[ReviewCarousel] 빈칸 클릭 POST 실패:', result.error)
            }
          })
          .catch((error) => {
            console.error('[ReviewCarousel] 빈칸 클릭 POST 예외:', error)
          })
      }
      
      onReveal() // 토글 기능
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <span 
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`inline relative cursor-pointer rounded px-1 py-0 mx-0.5 font-bold transition-all overflow-hidden ${
        actualIsRevealed
          ? 'bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white shadow-lg'
          : ''
      }`}
      style={{
        textShadow: actualIsRevealed ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
        lineHeight: 'inherit',
        display: 'inline',
        verticalAlign: 'baseline',
      }}
      aria-label={actualIsRevealed ? '정답: ' + answer + ' (클릭하여 숨기기)' : '클릭하여 정답 보기'}
    >
      {/* 정답 텍스트 - 항상 렌더링 (길이 유지) */}
      <span className={`relative z-0 ${actualIsRevealed ? '' : 'text-transparent'}`}>
        {answer}
      </span>
      
      {/* 빈칸 상태일 때 회색 배경과 shimmer 효과를 위에 덮기 */}
      {!actualIsRevealed && (
        <span 
          className="absolute inset-0 pointer-events-none bg-gray-200 border border-gray-300 rounded hover:bg-gray-300"
          style={{
            zIndex: 1,
          }}
        >
          {/* Shimmer 애니메이션 */}
          <span 
            className="absolute inset-0 animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
            }}
          />
          {/* Masked answer (○○ ○○) */}
          <span className="absolute inset-0 flex items-center justify-center text-gray-600 font-bold">
            {generateBlankCircleMask(answer)}
          </span>
        </span>
      )}
    </span>
  )
}



