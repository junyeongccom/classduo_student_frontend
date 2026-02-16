/**
 * @file GameTabContainer.tsx
 * @description 게임 탭 컨테이너 — 게임 선택 + 단어 목록 모달 + 5종 게임 실행 통합
 * @module features/lecture-study/components/containers
 * @dependencies GameSelector, WordListModal, review 게임 컴포넌트, ai-tutor GameOverlay
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { GameSelector, GAME_LIST } from '../ui/GameSelector'
import { WordListModal } from '../ui/WordListModal'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'
import {
  reviewService,
  ReviewMatchingGame,
  DefinitionBuilderGame,
  GuessTheTermGameContainer,
  ReviewDeckView,
  useReviewDeck,
} from '@/features/review'
import type { LectureReviewItem, DefinitionBuilderGameResponse } from '@/features/review'
import type { AppLocale } from '@/shared/i18n/I18nProvider'

const GameOverlay = dynamic(
  () => import('@/features/ai-tutor').then(m => ({ default: m.GameOverlay })),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div> },
)

interface WordItem {
  id: string
  keyword: string
  description: string
}

function wordItemsToReviewItems(words: WordItem[], lectureId: string): LectureReviewItem[] {
  return words.map(w => ({
    id: w.id,
    lecture_id: lectureId,
    keyword: w.keyword,
    description: w.description,
  }))
}

interface GameTabContainerProps {
  lectureId: string
}

export function GameTabContainer({ lectureId }: GameTabContainerProps) {
  const t = useTranslations()
  const locale = useLocale() as AppLocale
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showWordModal, setShowWordModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Store-backed words for tab persistence
  const words = useLectureStudyStore(s => s.gameWords)
  const setWords = useLectureStudyStore(s => s.setGameWords)

  // DefinitionBuilder game state
  const [defBuilderData, setDefBuilderData] = useState<DefinitionBuilderGameResponse | null>(null)
  const [defBuilderLoading, setDefBuilderLoading] = useState(false)
  const [defBuilderError, setDefBuilderError] = useState<string | null>(null)
  const [defBuilderScore, setDefBuilderScore] = useState(0)

  // Running game overlay state
  const [showRunningOverlay, setShowRunningOverlay] = useState(false)

  const currentGameInfo = GAME_LIST.find(g => g.id === selectedGame)

  const reviewItems = useMemo(
    () => wordItemsToReviewItems(words, lectureId),
    [words, lectureId],
  )

  // Deck game hook
  const deck = useReviewDeck(lectureId, reviewItems)

  const handleSelectGame = useCallback((gameId: string) => {
    setSelectedGame(gameId)
    setShowWordModal(true)
  }, [])

  const handleImportKeywords = useCallback(async () => {
    setIsImporting(true)
    setImportError(null)
    try {
      const result = await reviewService.getLectureKeywordsPreview(lectureId)
      if (result.data?.keywords && result.data.keywords.length > 0) {
        const existing = new Set(words.map(w => w.keyword.toLowerCase()))
        const newWords: WordItem[] = result.data.keywords
          .filter(kw => !existing.has(kw.keyword.toLowerCase()))
          .map(kw => ({
            id: crypto.randomUUID(),
            keyword: kw.keyword,
            description: kw.description,
          }))
        setWords([...words, ...newWords])
      }
    } catch {
      setImportError(t('lectureStudy.game.importError'))
    } finally {
      setIsImporting(false)
    }
  }, [lectureId, words, setWords, t])

  const loadDefBuilderData = useCallback(async () => {
    setDefBuilderLoading(true)
    setDefBuilderError(null)
    try {
      const result = await reviewService.getDefinitionBuilderGame(lectureId)
      if (result.data) {
        setDefBuilderData(result.data)
      } else {
        setDefBuilderError(result.error?.message ?? t('lectureStudy.game.loadGameError'))
      }
    } catch {
      setDefBuilderError(t('lectureStudy.game.loadGameError'))
    } finally {
      setDefBuilderLoading(false)
    }
  }, [lectureId, t])

  const handleStartGame = useCallback(async () => {
    setShowWordModal(false)

    // Running game: open overlay immediately
    if (selectedGame === 'running') {
      setShowRunningOverlay(true)
      return
    }

    // DefinitionBuilder: fetch game data from API
    if (selectedGame === 'definitionBuilder') {
      setDefBuilderScore(0)
      await loadDefBuilderData()
    }

    setIsPlaying(true)
  }, [selectedGame, loadDefBuilderData])

  const handleExitGame = useCallback(() => {
    setIsPlaying(false)
    setSelectedGame(null)
    setDefBuilderData(null)
    setDefBuilderScore(0)
  }, [])

  // Running game overlay (renders on top, no "isPlaying" needed)
  if (showRunningOverlay) {
    return (
      <GameOverlay
        isOpen
        onClose={() => {
          setShowRunningOverlay(false)
          setSelectedGame(null)
        }}
        triggerPosition={null}
        lectureId={lectureId}
      />
    )
  }

  // Game playing mode
  if (isPlaying && selectedGame) {
    const gameName = currentGameInfo
      ? t(`lectureStudy.game.${selectedGame}` as Parameters<typeof t>[0])
      : selectedGame

    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2">
          <button
            onClick={handleExitGame}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('lectureStudy.game.title')}
          </button>
          <span className="text-sm font-medium text-gray-900">{gameName}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {selectedGame === 'cardMatch' && (
            <ReviewMatchingGame
              reviewItems={reviewItems}
              isEnabled
              onExit={handleExitGame}
            />
          )}
          {selectedGame === 'definitionBuilder' && (
            <DefinitionBuilderGame
              data={defBuilderData}
              isLoading={defBuilderLoading}
              error={defBuilderError}
              onRetry={loadDefBuilderData}
              isEnabled
              currentScore={defBuilderScore}
              onScoreDelta={(delta) => setDefBuilderScore(s => s + delta)}
              onRestart={loadDefBuilderData}
            />
          )}
          {selectedGame === 'guessTheTerm' && (
            <GuessTheTermGameContainer
              lectureId={lectureId}
              locale={locale}
              isEnabled
              reviewItems={reviewItems}
              onExitGame={handleExitGame}
            />
          )}
          {selectedGame === 'deck' && (
            <ReviewDeckView
              hasSelectedLecture
              isReviewItemsLoading={false}
              reviewItemsError={null}
              deck={deck}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <GameSelector onSelectGame={handleSelectGame} />
      <WordListModal
        open={showWordModal}
        onOpenChange={setShowWordModal}
        words={words}
        onWordsChange={setWords}
        onImportKeywords={handleImportKeywords}
        minWords={currentGameInfo?.minWords ?? 1}
        gameName={
          currentGameInfo
            ? t(`lectureStudy.game.${selectedGame}` as Parameters<typeof t>[0])
            : ''
        }
        onStartGame={handleStartGame}
        isImporting={isImporting}
        isRunningGame={selectedGame === 'running'}
        importError={importError}
      />
    </>
  )
}
