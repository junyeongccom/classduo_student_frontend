'use client'

import { useEffect, useState } from 'react'
import { Share2, Download } from 'lucide-react'
import { ReviewSidebar } from './ReviewSidebar'
import {
  StudyspaceRightbarSlot,
  StudyspaceTopbarSlot,
} from '@/shared/components/layouts/studyspace'
import { SmartReviewContent, type SmartReviewTab } from '@/features/review/components/ui/SmartReviewContent'
import { useLectureReviewItems } from '@/features/review/hooks/useLectureReviewItems'
import { useReviewDeck } from '@/features/review/hooks/useReviewDeck'
import { reviewService } from '@/features/review/services/reviewService'
import { useDefinitionBuilderGame } from '@/features/review/hooks/useDefinitionBuilderGame'
import { useI18n } from '@/shared/i18n/I18nProvider'

export function ReviewContainer() {
  const { locale } = useI18n()
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
  const [, setSelectedCourseId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SmartReviewTab>('list')
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [importPreviewItems, setImportPreviewItems] = useState<Array<{ keyword: string; description: string }>>([])
  const [isImportPreviewLoading, setIsImportPreviewLoading] = useState(false)
  const [importPreviewError, setImportPreviewError] = useState<string | null>(null)

  const { data: reviewItemsData, isLoading: isLoadingReviewItems, error: reviewItemsError, refetch } =
    useLectureReviewItems(selectedLectureId)

<<<<<<< HEAD
  const {
    data: definitionBuilderData,
    isLoading: isDefinitionBuilderLoading,
    error: definitionBuilderError,
    refetch: refetchDefinitionBuilder,
  } = useDefinitionBuilderGame(
    selectedLectureId,
    Boolean(selectedLectureId) && activeTab === 'game' && activeGameId === 'definition-builder'
  )

  useEffect(() => {
    if (activeTab !== 'game') {
      setActiveGameId(null)
    }
  }, [activeTab])
=======
  const deck = useReviewDeck(selectedLectureId, reviewItemsData?.items || [])

>>>>>>> 27efc85 (덱 기능 1차 도입)
  // 회차 변경 시, 미리보기 캐시 초기화
  useEffect(() => {
    setImportPreviewItems([])
    setIsImportPreviewLoading(false)
    setImportPreviewError(null)
  }, [selectedLectureId, locale])

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
        <SmartReviewContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeGameId={activeGameId}
          onSelectGame={setActiveGameId}
          onExitGame={() => setActiveGameId(null)}
          reviewItems={reviewItemsData?.items || []}
          isReviewItemsLoading={Boolean(selectedLectureId) && isLoadingReviewItems}
          reviewItemsError={reviewItemsError}
          hasSelectedLecture={Boolean(selectedLectureId)}
<<<<<<< HEAD
          definitionBuilderData={definitionBuilderData}
          isDefinitionBuilderLoading={isDefinitionBuilderLoading}
          definitionBuilderError={definitionBuilderError}
          onRetryDefinitionBuilder={refetchDefinitionBuilder}
=======
          deck={deck}
>>>>>>> 27efc85 (덱 기능 1차 도입)
          isMutating={isMutating}
          mutationError={mutationError}
          onRequestImportPreview={async () => {
            if (!selectedLectureId) return
            setIsImportPreviewLoading(true)
            setImportPreviewError(null)
            try {
              const result = await reviewService.getLectureKeywordsPreview(selectedLectureId)
              if (result.error || !result.data) {
                setImportPreviewError(result.error?.message || '추천 단어를 불러오는데 실패했습니다')
                setImportPreviewItems([])
                return
              }

              const existing = new Set((reviewItemsData?.items || []).map(i => (i.keyword || '').trim()))
              const localized = (result.data.keywords || [])
                .map(k => {
                  const keyword = (locale === 'en' ? (k.keyword_eng || k.keyword) : k.keyword) || ''
                  const description = (locale === 'en' ? (k.description_eng || k.description) : k.description) || ''
                  return { keyword: keyword.trim(), description: description.trim() }
                })
                .filter(k => k.keyword && k.description)
                .filter(k => !existing.has(k.keyword))

              setImportPreviewItems(localized)
            } catch {
              setImportPreviewError('추천 단어를 불러오는데 실패했습니다')
              setImportPreviewItems([])
            } finally {
              setIsImportPreviewLoading(false)
            }
          }}
          importPreviewItems={importPreviewItems}
          isImportPreviewLoading={isImportPreviewLoading}
          importPreviewError={importPreviewError}
          onAddReviewWord={async (keyword, description) => {
            if (!selectedLectureId) return false
            setIsMutating(true)
            setMutationError(null)
            try {
              const result = await reviewService.createLectureReviewItem(selectedLectureId, { keyword, description })
              if (result.error) {
                setMutationError(result.error.message || '단어 추가에 실패했습니다')
                return false
              }
              await refetch()
              return true
            } finally {
              setIsMutating(false)
            }
          }}
          onUpdateReviewWord={async (reviewItemId, keyword, description) => {
            setIsMutating(true)
            setMutationError(null)
            try {
              const result = await reviewService.updateLectureReviewItem(reviewItemId, { keyword, description })
              if (result.error) {
                setMutationError(result.error.message || '단어 수정에 실패했습니다')
                return false
              }
              await refetch()
              return true
            } finally {
              setIsMutating(false)
            }
          }}
          onDeleteReviewWord={async (reviewItemId) => {
            setIsMutating(true)
            setMutationError(null)
            try {
              const result = await reviewService.deleteLectureReviewItem(reviewItemId)
              if (result.error) {
                setMutationError(result.error.message || '단어 삭제에 실패했습니다')
                return false
              }
              await refetch()
              return true
            } finally {
              setIsMutating(false)
            }
          }}
          onImportRecommendedWords={async () => {
            if (!selectedLectureId) return false
            setIsMutating(true)
            setMutationError(null)
            try {
              const result = await reviewService.importLectureKeywordsToReview(selectedLectureId)
              if (result.error) {
                setMutationError(result.error.message || '추천 단어 불러오기에 실패했습니다')
                return false
              }
              await refetch()
              return true
            } finally {
              setIsMutating(false)
            }
          }}
        />
      </div>
    </>
  )
}

