'use client'

import { useState } from 'react'
import { Share2, Download } from 'lucide-react'
import { ReviewCarousel } from './components/ReviewCarousel'
import { ReviewSidebar } from './components/ReviewSidebar'
import { useReviewCarousel } from '@/features/review/hooks/useReview'

export default function ReviewPage() {
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
  const { data, isLoading, error } = useReviewCarousel(selectedLectureId)

  // 공유 기능 (아직 구현 안 함)
  const handleShare = () => {
    // TODO: 공유 기능 구현
    console.log('Share clicked')
  }

  // 다운로드 기능 (아직 구현 안 함)
  const handleDownload = () => {
    // TODO: 다운로드 기능 구현
    console.log('Download clicked')
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 상단 헤더 - 아이콘 버튼들 */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
        {/* 좌측: 공유 및 다운로드 아이콘 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="공유"
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDownload}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            title="다운로드"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>

        {/* 우측: 빈 공간 */}
        <div></div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 중앙: 복습 캐러셀 */}
        <div className="flex-1 overflow-y-auto p-6">
          <h1 className="mb-4 text-xl font-bold text-gray-900">50초 복습</h1>
          <ReviewCarousel data={data} isLoading={isLoading} error={error} />
        </div>

        {/* 우측: 강의회차 선택 사이드바 */}
        <ReviewSidebar
          selectedLectureId={selectedLectureId}
          onSelectLectureId={setSelectedLectureId}
        />
      </div>
    </div>
  )
}


