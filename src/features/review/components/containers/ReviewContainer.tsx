'use client'

import { useState } from 'react'
import { Share2, Download } from 'lucide-react'
import { ReviewCarousel } from '../ui/ReviewCarousel'
import { ReviewSidebar } from './ReviewSidebar'
import { useReviewCarousel } from '@/features/review/hooks/useReview'
import {
  StudyspaceRightbarSlot,
  StudyspaceTopbarSlot,
} from '@/shared/components/layouts/studyspace'

export function ReviewContainer() {
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
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
    <>
      <StudyspaceTopbarSlot>
        <div className="flex w-full items-center justify-between">
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
        </div>
      </StudyspaceTopbarSlot>

      <StudyspaceRightbarSlot>
        <ReviewSidebar
          selectedLectureId={selectedLectureId}
          onSelectLectureId={setSelectedLectureId}
          onCourseIdChange={setSelectedCourseId}
        />
      </StudyspaceRightbarSlot>

      <div className="h-full overflow-y-auto p-6">
        <ReviewCarousel
          data={data}
          isLoading={isLoading}
          error={error}
          courseId={selectedCourseId}
        />
      </div>
    </>
  )
}

