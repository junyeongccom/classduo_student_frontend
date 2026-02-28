/**
 * @file GameTabContainer.tsx
 * @description 게임 탭 컨테이너 — 게임 선택 + 단어 목록 모달 + 5종 게임 실행 통합
 * @module features/lecture-study/components/containers
 * @dependencies GameSelector, WordListModal, review 게임 컴포넌트, ai-tutor GameOverlay
 */

'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
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
  GameRankingBoard,
} from '@/features/review'
import type { ScoreRankingEntry, MatchingRankingEntry } from '@/features/review'
import { gameScoreService } from '@/features/ai-tutor'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui'
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

  // Game mode for running / cardMatch / definitionBuilder
  const [gameMode, setGameMode] = useState<'rank' | 'normal' | null>(null)

  // Rank mode: lecture_keywords 기반 reviewItems
  const [rankReviewItems, setRankReviewItems] = useState<LectureReviewItem[]>([])
  const [isLoadingRankData, setIsLoadingRankData] = useState(false)

  // Nickname state
  const [rankNickname, setRankNickname] = useState<string | undefined>(undefined)
  const [showNicknameModal, setShowNicknameModal] = useState(false)
  const [nicknameInput, setNicknameInput] = useState('')
  const [nicknameSaving, setNicknameSaving] = useState(false)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const nicknameInputRef = useRef<HTMLInputElement>(null)

  // Ranking preview state
  const [showRankingPreview, setShowRankingPreview] = useState(false)
  const [rankingPreviewMode, setRankingPreviewMode] = useState<'score' | 'time' | 'score_time'>('score')
  const [rankingPreviewData, setRankingPreviewData] = useState<(ScoreRankingEntry | MatchingRankingEntry)[]>([])
  const [rankingPreviewLoading, setRankingPreviewLoading] = useState(false)
  const [rankingPreviewError, setRankingPreviewError] = useState<string | null>(null)
  const [rankingPreviewMyRank, setRankingPreviewMyRank] = useState<number | null>(null)
  const [rankingPreviewPairTabs, setRankingPreviewPairTabs] = useState<number[]>([])
  const [rankingPreviewActivePair, setRankingPreviewActivePair] = useState<number | undefined>(undefined)
  const [rankingPreviewGameName, setRankingPreviewGameName] = useState('')

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

  const loadDefBuilderDataFrom = useCallback((items: LectureReviewItem[]) => {
    setDefBuilderError(null)
    const data = buildDefBuilderFromLocal(items, lectureId)
    if (data.total_count === 0) {
      setDefBuilderError(t('lectureStudy.game.loadGameError'))
      setDefBuilderData(null)
    } else {
      setDefBuilderData(data)
    }
  }, [lectureId, t])

  const loadDefBuilderData = useCallback(() => {
    loadDefBuilderDataFrom(reviewItems)
  }, [reviewItems, loadDefBuilderDataFrom])

  const startRankGame = useCallback((gameId: string, items?: LectureReviewItem[]) => {
    setGameMode('rank')
    if (gameId === 'running') {
      setShowRunningOverlay(true)
    } else if (gameId === 'cardMatch') {
      setShowMatchingOverlay(true)
    } else if (gameId === 'definitionBuilder') {
      if (items) loadDefBuilderDataFrom(items)
      setDefBuilderScore(0)
      setShowDefBuilderOverlay(true)
    }
  }, [loadDefBuilderDataFrom])

  const handleRankPlayFromDescription = useCallback(async () => {
    setShowDescriptionPopup(false)

    // Running game: nickname check flow (existing)
    if (selectedGame === 'running') {
      try {
        const { data } = await gameScoreService.getNickname()
        if (data?.nickname) {
          setRankNickname(data.nickname)
          startRankGame('running')
          return
        }
      } catch {
        // If API fails, show modal to be safe
      }
      setNicknameInput('')
      setNicknameError(null)
      setShowNicknameModal(true)
      return
    }

    // cardMatch / definitionBuilder: fetch lecture_keywords then start
    if (selectedGame === 'cardMatch' || selectedGame === 'definitionBuilder') {
      setIsLoadingRankData(true)
      try {
        const result = await reviewService.getLectureKeywordsPreview(lectureId)
        if (result.data?.keywords && result.data.keywords.length > 0) {
          const items: LectureReviewItem[] = result.data.keywords.map(kw => ({
            id: crypto.randomUUID(),
            lecture_id: lectureId,
            keyword: kw.keyword,
            description: kw.description,
          }))
          setRankReviewItems(items)
          startRankGame(selectedGame, items)
        }
      } catch {
        // fetch 실패 시 무시
      } finally {
        setIsLoadingRankData(false)
      }
    }
  }, [selectedGame, lectureId, startRankGame])

  const handleNicknameConfirm = useCallback(async () => {
    const trimmed = nicknameInput.trim()
    if (!trimmed) return
    setNicknameSaving(true)
    setNicknameError(null)
    try {
      await gameScoreService.setNickname(trimmed)
    } catch {
      // Still allow play even if save fails
    }
    setNicknameSaving(false)
    setShowNicknameModal(false)
    setRankNickname(trimmed)
    startRankGame('running')
  }, [nicknameInput, startRankGame])

  const fetchMatchingRankings = useCallback(async (pairCount: number) => {
    setRankingPreviewLoading(true)
    setRankingPreviewError(null)
    try {
      const { data } = await reviewService.getMatchingGameRankings(lectureId, pairCount, 10)
      if (data) {
        setRankingPreviewData(data.rankings)
        setRankingPreviewMyRank(data.my_best?.rank ?? null)
      }
    } catch {
      setRankingPreviewError('랭킹을 불러올 수 없습니다')
    } finally {
      setRankingPreviewLoading(false)
    }
  }, [lectureId])

  const handleRankingPairChange = useCallback(async (pairCount: number) => {
    setRankingPreviewActivePair(pairCount)
    await fetchMatchingRankings(pairCount)
  }, [fetchMatchingRankings])

  const handleViewRanking = useCallback(async () => {
    if (!selectedGame) return
    const gameName = t(`lectureStudy.game.${selectedGame}` as Parameters<typeof t>[0])
    setRankingPreviewGameName(gameName)
    setRankingPreviewData([])
    setRankingPreviewMyRank(null)
    setRankingPreviewError(null)
    setRankingPreviewPairTabs([])
    setRankingPreviewActivePair(undefined)
    setShowRankingPreview(true)
    setRankingPreviewLoading(true)

    try {
      if (selectedGame === 'running') {
        setRankingPreviewMode('score')
        const { data } = await gameScoreService.getLeaderboard(lectureId)
        if (data) {
          const mapped: ScoreRankingEntry[] = data.entries.map(e => ({
            rank: e.rank,
            is_mine: e.is_current_user,
            display_name: e.nickname || null,
            score: e.score,
            achieved_at: '',
          }))
          setRankingPreviewData(mapped)
          setRankingPreviewMyRank(data.user_best?.rank ?? null)
        }
      } else if (selectedGame === 'cardMatch') {
        setRankingPreviewMode('time')
        setRankingPreviewPairTabs([6, 8, 10])
        setRankingPreviewActivePair(6)
        await fetchMatchingRankings(6)
        return
      } else if (selectedGame === 'definitionBuilder') {
        setRankingPreviewMode('score_time')
        const { data } = await reviewService.getDefinitionBuilderRankings(lectureId, 10)
        if (data) {
          setRankingPreviewData(data.rankings)
          setRankingPreviewMyRank(data.my_best?.rank ?? null)
        }
      }
    } catch {
      setRankingPreviewError('랭킹을 불러올 수 없습니다')
    } finally {
      setRankingPreviewLoading(false)
    }
  }, [selectedGame, lectureId, t, fetchMatchingRankings])

  const handlePlayFromDescription = useCallback(() => {
    setShowDescriptionPopup(false)
    setGameMode('normal')
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

  const handleStartGame = useCallback(() => {
    setShowWordModal(false)

    // Running game (normal mode): open overlay with words
    if (selectedGame === 'running') {
      setGameMode('normal')
      setShowRunningOverlay(true)
      return
    }

    // Card match (normal mode): open overlay
    if (selectedGame === 'cardMatch') {
      setGameMode('normal')
      setShowMatchingOverlay(true)
      return
    }

    // DefinitionBuilder (normal mode): generate game data from local words, open overlay
    if (selectedGame === 'definitionBuilder') {
      setGameMode('normal')
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
          setRankNickname(undefined)
        }}
        triggerPosition={null}
        lectureId={lectureId}
        gameMode={gameMode ?? undefined}
        words={gameMode === 'normal' ? words.map(w => ({ keyword: w.keyword, description: w.description })) : undefined}
        nickname={rankNickname}
      />
    )
  }

  // Card matching overlay
  if (showMatchingOverlay) {
    const handleCloseMatching = () => {
      setShowMatchingOverlay(false)
      setSelectedGame(null)
      setGameMode(null)
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
                reviewItems={gameMode === 'rank' ? rankReviewItems : reviewItems}
                isEnabled
                onExit={handleCloseMatching}
                lectureId={lectureId}
                gameMode={gameMode ?? undefined}
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  // DefinitionBuilder overlay
  if (showDefBuilderOverlay) {
    const currentDefBuilderItems = gameMode === 'rank' ? rankReviewItems : reviewItems
    const retryDefBuilder = () => loadDefBuilderDataFrom(currentDefBuilderItems)
    const handleCloseDefBuilder = () => {
      setShowDefBuilderOverlay(false)
      setSelectedGame(null)
      setGameMode(null)
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
                onRetry={retryDefBuilder}
                isEnabled
                currentScore={defBuilderScore}
                lectureId={lectureId}
                gameMode={gameMode ?? undefined}
                onScoreDelta={(delta) => {
                  setDefBuilderScore(s => s + delta)
                  setScoreDelta(delta)
                  setScoreTone(delta > 0 ? 'positive' : 'negative')
                  window.setTimeout(() => {
                    setScoreDelta(0)
                    setScoreTone(null)
                  }, 800)
                }}
                onRestart={retryDefBuilder}
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
        onRankPlay={
          ['running', 'cardMatch', 'definitionBuilder'].includes(selectedGame ?? '')
            ? handleRankPlayFromDescription
            : undefined
        }
        onViewRanking={
          ['running', 'cardMatch', 'definitionBuilder'].includes(selectedGame ?? '')
            ? handleViewRanking
            : undefined
        }
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
      {/* Nickname input modal for rank mode */}
      <Dialog open={showNicknameModal} onOpenChange={setShowNicknameModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {t('lectureStudy.game.desc.rankPlayButton')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {t('lectureStudy.game.nicknamePrompt')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <input
              ref={nicknameInputRef}
              type="text"
              maxLength={20}
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleNicknameConfirm()
              }}
              placeholder={t('lectureStudy.game.nicknamePlaceholder')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-orange-500 dark:focus:ring-orange-900/30"
              autoFocus
            />
            {nicknameError && (
              <p className="text-xs text-red-500">{nicknameError}</p>
            )}
            <button
              onClick={handleNicknameConfirm}
              disabled={!nicknameInput.trim() || nicknameSaving}
              className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {nicknameSaving ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                t('lectureStudy.game.nicknameConfirm')
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Ranking preview dialog */}
      <Dialog open={showRankingPreview} onOpenChange={setShowRankingPreview}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {rankingPreviewGameName} 랭킹
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              현재 랭킹 순위입니다
            </DialogDescription>
          </DialogHeader>
          <GameRankingBoard
            rankings={rankingPreviewData}
            myRank={rankingPreviewMyRank}
            currentUserId={null}
            isLoading={rankingPreviewLoading}
            error={rankingPreviewError}
            mode={rankingPreviewMode}
            pairCountTabs={rankingPreviewPairTabs.length > 0 ? rankingPreviewPairTabs : undefined}
            activePairCount={rankingPreviewActivePair}
            onPairCountChange={handleRankingPairChange}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
