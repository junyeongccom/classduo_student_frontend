'use client'

import { useEffect, useState } from 'react'
import { ReviewSidebar } from './ReviewSidebar'
import { SmartReviewContent, type SmartReviewTab } from '@/features/review/components/ui/SmartReviewContent'
import { useLectureReviewItems } from '@/features/review/hooks/useLectureReviewItems'
import { useReviewDeck } from '@/features/review/hooks/useReviewDeck'
import { reviewService } from '@/features/review/services/reviewService'
import { useDefinitionBuilderGame } from '@/features/review/hooks/useDefinitionBuilderGame'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { useAuthStore } from '@/features/auth/store/authStore'
import { StudyspaceRightbarSlot } from '@/shared/components/layouts/studyspace'
import { useStudyspaceSelectionSync } from '@/shared/hooks/useStudyspaceSelectionSync'

export function ReviewContainer() {
  const { locale } = useI18n()
  const userId = useAuthStore(state => state.user?.user_id ?? null)
  const [selectedLectureId, setSelectedLectureId] = useState<string | null>(null)
  const [, setSelectedCourseId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<SmartReviewTab>('list')
  useStudyspaceSelectionSync(userId)
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
  const [isMutating, setIsMutating] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [importPreviewItems, setImportPreviewItems] = useState<Array<{ keyword: string; description: string }>>([])
  const [isImportPreviewLoading, setIsImportPreviewLoading] = useState(false)
  const [importPreviewError, setImportPreviewError] = useState<string | null>(null)

  const { data: reviewItemsData, isLoading: isLoadingReviewItems, error: reviewItemsError, refetch } =
    useLectureReviewItems(selectedLectureId)

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
  const deck = useReviewDeck(selectedLectureId, reviewItemsData?.items || [])
  const reviewItems = reviewItemsData?.items || []

  // 회차 변경 시, 미리보기 캐시 초기화
  useEffect(() => {
    setImportPreviewItems([])
    setIsImportPreviewLoading(false)
    setImportPreviewError(null)
  }, [selectedLectureId, locale])

  return (
    <>
      <StudyspaceRightbarSlot>
        <ReviewSidebar
          selectedLectureId={selectedLectureId}
          onSelectLectureId={setSelectedLectureId}
          onCourseIdChange={setSelectedCourseId}
        />
      </StudyspaceRightbarSlot>

      <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-y-hidden p-6">
        <div
          className="mx-auto flex min-h-0 w-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm overflow-hidden"
          style={{
            width: 'min(70vw)',
            height: 'min(94vh)'
          }}
        >
          <SmartReviewContent
            lectureId={selectedLectureId}
            locale={locale}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            activeGameId={activeGameId}
            onSelectGame={setActiveGameId}
            onExitGame={() => setActiveGameId(null)}
            reviewItems={reviewItems}
            isReviewItemsLoading={Boolean(selectedLectureId) && isLoadingReviewItems}
            reviewItemsError={reviewItemsError}
            hasSelectedLecture={Boolean(selectedLectureId)}
            definitionBuilderData={definitionBuilderData}
            isDefinitionBuilderLoading={isDefinitionBuilderLoading}
            definitionBuilderError={definitionBuilderError}
            onRetryDefinitionBuilder={refetchDefinitionBuilder}
            deck={deck}
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
            onDeleteAllReviewWords={async () => {
              if (!selectedLectureId) return false
              if (reviewItems.length === 0) return true
              setIsMutating(true)
              setMutationError(null)
              try {
                const result = await reviewService.deleteLectureReviewItems(selectedLectureId)
                if (result.error) {
                  setMutationError(result.error.message || '단어 전체 삭제에 실패했습니다')
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
      </div>
    </>
  )
}

