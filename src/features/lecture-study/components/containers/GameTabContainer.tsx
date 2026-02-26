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
import { Loader2, X } from 'lucide-react'
import { GameSelector, GAME_LIST } from '../ui/GameSelector'
import { GameDescriptionPopup } from '../ui/GameDescriptionPopup'
import { WordListModal } from '../ui/WordListModal'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'
import {
  reviewService,
  ReviewMatchingGame,
  DefinitionBuilderGame,
  ReviewDeckView,
  useReviewDeck,
} from '@/features/review'
import type { LectureReviewItem, DefinitionBuilderGameResponse, DefinitionBuilderQuestion, DefinitionBuilderBlank } from '@/features/review'

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

/** 로컬 단어로 정의조립 게임 데이터 생성 (백엔드 로직 미러링) */
function buildDefBuilderFromLocal(
  items: LectureReviewItem[],
  lectureId: string,
): DefinitionBuilderGameResponse {
  const tokenize = (text: string) => text.split(/\s+/).filter(Boolean)
  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const eligible = items
    .map(it => ({ ...it, tokens: tokenize(it.description) }))
    .filter(it => it.tokens.length >= 6)

  const selected = shuffle(eligible).slice(0, 6)

  const questions: DefinitionBuilderQuestion[] = selected.map(item => {
    const { tokens } = item
    const blankCount = Math.min(6, tokens.length)
    const allIndices = tokens.map((_, i) => i)
    const blankIndices = shuffle(allIndices).slice(0, blankCount).sort((a, b) => a - b)
    const blanks: DefinitionBuilderBlank[] = blankIndices.map(idx => ({ index: idx, token: tokens[idx] }))
    const correctTokens = blankIndices.map(idx => tokens[idx])

    const distractorPool: string[] = []
    const seen = new Set(correctTokens)
    for (const other of selected) {
      if (other.id === item.id) continue
      for (const t of other.tokens) {
        if (!seen.has(t)) { seen.add(t); distractorPool.push(t) }
      }
    }
    const distractors = shuffle(distractorPool).slice(0, 6)
    while (distractors.length < 6) {
      distractors.push(distractorPool.length > 0
        ? distractorPool[Math.floor(Math.random() * distractorPool.length)]
        : correctTokens[Math.floor(Math.random() * correctTokens.length)])
    }

    return {
      review_item_id: item.id,
      keyword: item.keyword,
      definition: item.description,
      tokens,
      blank_indices: blankIndices,
      blanks,
      choices: shuffle([...correctTokens, ...distractors]),
    }
  })

  return { lecture_id: lectureId, questions, total_count: questions.length }
}

interface GameTabContainerProps {
  lectureId: string
}

export function GameTabContainer({ lectureId }: GameTabContainerProps) {
  const t = useTranslations()
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [showDescriptionPopup, setShowDescriptionPopup] = useState(false)
  const [showWordModal, setShowWordModal] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  // Store-backed words for tab persistence
  const words = useLectureStudyStore(s => s.gameWords)
  const setWords = useLectureStudyStore(s => s.setGameWords)

  // DefinitionBuilder game state
  const [defBuilderData, setDefBuilderData] = useState<DefinitionBuilderGameResponse | null>(null)
  const [defBuilderError, setDefBuilderError] = useState<string | null>(null)
  const [defBuilderScore, setDefBuilderScore] = useState(0)
  const [scoreDelta, setScoreDelta] = useState(0)
  const [scoreTone, setScoreTone] = useState<'positive' | 'negative' | null>(null)

  // Game mode for running game
  const [gameMode, setGameMode] = useState<'rank' | 'normal' | null>(null)

  // Overlay states (full-screen modal)
  const [showRunningOverlay, setShowRunningOverlay] = useState(false)
  const [showMatchingOverlay, setShowMatchingOverlay] = useState(false)
  const [showDefBuilderOverlay, setShowDefBuilderOverlay] = useState(false)
  const [showDeckOverlay, setShowDeckOverlay] = useState(false)

  const currentGameInfo = GAME_LIST.find(g => g.id === selectedGame)

  const reviewItems = useMemo(
    () => wordItemsToReviewItems(words, lectureId),
    [words, lectureId],
  )

  // Deck game hook
  const deck = useReviewDeck(lectureId, reviewItems)

  const handleSelectGame = useCallback((gameId: string) => {
    setSelectedGame(gameId)
    setShowDescriptionPopup(true)
  }, [])

  const handleRankPlayFromDescription = useCallback(() => {
    setShowDescriptionPopup(false)
    setGameMode('rank')
    setShowRunningOverlay(true)
  }, [])

  const handlePlayFromDescription = useCallback(() => {
    setShowDescriptionPopup(false)
    if (selectedGame === 'running') {
      setGameMode('normal')
    }
    setShowWordModal(true)
  }, [selectedGame])

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

  const loadDefBuilderData = useCallback(() => {
    setDefBuilderError(null)
    const data = buildDefBuilderFromLocal(reviewItems, lectureId)
    if (data.total_count === 0) {
      setDefBuilderError(t('lectureStudy.game.loadGameError'))
      setDefBuilderData(null)
    } else {
      setDefBuilderData(data)
    }
  }, [reviewItems, lectureId, t])

  const handleStartGame = useCallback(() => {
    setShowWordModal(false)

    // Running game (normal mode): open overlay with words
    if (selectedGame === 'running') {
      setGameMode('normal')
      setShowRunningOverlay(true)
      return
    }

    // Card match: open overlay
    if (selectedGame === 'cardMatch') {
      setShowMatchingOverlay(true)
      return
    }

    // DefinitionBuilder: generate game data from local words, open overlay
    if (selectedGame === 'definitionBuilder') {
      setDefBuilderScore(0)
      loadDefBuilderData()
      setShowDefBuilderOverlay(true)
      return
    }

    // Deck: open overlay
    if (selectedGame === 'deck') {
      deck.resetDeck()
      setShowDeckOverlay(true)
      return
    }

  }, [selectedGame, loadDefBuilderData, deck])

  // Running game overlay (renders on top, no "isPlaying" needed)
  if (showRunningOverlay) {
    return (
      <GameOverlay
        isOpen
        onClose={() => {
          setShowRunningOverlay(false)
          setSelectedGame(null)
          setGameMode(null)
        }}
        triggerPosition={null}
        lectureId={lectureId}
        gameMode={gameMode ?? undefined}
        words={gameMode === 'normal' ? words.map(w => ({ keyword: w.keyword, description: w.description })) : undefined}
      />
    )
  }

  // Card matching overlay
  if (showMatchingOverlay) {
    const handleCloseMatching = () => {
      setShowMatchingOverlay(false)
      setSelectedGame(null)
    }
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleCloseMatching}
        />
        {/* Modal */}
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6"
          onClick={handleCloseMatching}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">
                {t('lectureStudy.game.cardMatch')}
              </h3>
              <button
                onClick={handleCloseMatching}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Game area */}
            <div className="flex-1 overflow-auto p-6">
              <ReviewMatchingGame
                reviewItems={reviewItems}
                isEnabled
                onExit={handleCloseMatching}
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  // DefinitionBuilder overlay
  if (showDefBuilderOverlay) {
    const handleCloseDefBuilder = () => {
      setShowDefBuilderOverlay(false)
      setSelectedGame(null)
      setDefBuilderData(null)
      setDefBuilderScore(0)
      setScoreDelta(0)
      setScoreTone(null)
    }
    return (
      <>
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleCloseDefBuilder}
        />
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6"
          onClick={handleCloseDefBuilder}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-[800px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with score */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">
                {t('lectureStudy.game.definitionBuilder')}
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-full bg-blue-50 px-5 py-2 dark:bg-blue-900/30">
                  <span className={`text-2xl font-bold transition-colors duration-300 ${
                    scoreTone === 'positive' ? 'text-emerald-600'
                      : scoreTone === 'negative' ? 'text-rose-600'
                      : 'text-blue-600 dark:text-blue-300'
                  }`}>
                    {defBuilderScore}
                  </span>
                  <span className={`text-sm font-medium ${
                    scoreTone === 'positive' ? 'text-emerald-500'
                      : scoreTone === 'negative' ? 'text-rose-500'
                      : 'text-blue-400 dark:text-blue-400'
                  }`}>pt</span>
                  {scoreDelta !== 0 && (
                    <span className={`ml-1 text-base font-bold animate-bounce ${
                      scoreDelta > 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCloseDefBuilder}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            {/* Game area */}
            <div className="flex-1 overflow-auto p-6">
              <DefinitionBuilderGame
                data={defBuilderData}
                isLoading={false}
                error={defBuilderError}
                onRetry={loadDefBuilderData}
                isEnabled
                currentScore={defBuilderScore}
                onScoreDelta={(delta) => {
                  setDefBuilderScore(s => s + delta)
                  setScoreDelta(delta)
                  setScoreTone(delta > 0 ? 'positive' : 'negative')
                  window.setTimeout(() => {
                    setScoreDelta(0)
                    setScoreTone(null)
                  }, 800)
                }}
                onRestart={loadDefBuilderData}
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  // Deck overlay
  if (showDeckOverlay) {
    const handleCloseDeck = () => {
      setShowDeckOverlay(false)
      setSelectedGame(null)
    }
    return (
      <>
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={handleCloseDeck}
        />
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-6"
          onClick={handleCloseDeck}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50">
                {t('lectureStudy.game.deck')}
              </h3>
              <button
                onClick={handleCloseDeck}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Game area */}
            <div className="flex-1 overflow-auto p-6">
              <ReviewDeckView
                hasSelectedLecture
                isReviewItemsLoading={false}
                reviewItemsError={null}
                deck={deck}
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <GameSelector onSelectGame={handleSelectGame} />
      <GameDescriptionPopup
        open={showDescriptionPopup}
        onOpenChange={setShowDescriptionPopup}
        gameId={selectedGame}
        onPlay={handlePlayFromDescription}
        onRankPlay={selectedGame === 'running' ? handleRankPlayFromDescription : undefined}
      />
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
        importError={importError}
      />
    </>
  )
}
