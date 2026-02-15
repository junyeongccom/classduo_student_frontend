/**
 * @file GameTabContainer.tsx
 * @description 게임 탭 컨테이너 — 게임 선택 + 단어 목록 모달 + 게임 실행 통합
 * @module features/lecture-study/components/containers
 * @dependencies GameSelector, WordListModal, 기존 게임 컴포넌트 참조
 */

'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { GameSelector, GAME_LIST } from '../ui/GameSelector'
import { WordListModal } from '../ui/WordListModal'

interface WordItem {
  id: string
  keyword: string
  description: string
}

interface GameTabContainerProps {
  lectureId: string
}

export function GameTabContainer({ lectureId }: GameTabContainerProps) {
  const t = useTranslations()
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showWordModal, setShowWordModal] = useState(false)
  const [words, setWords] = useState<WordItem[]>([])
  const [isImporting, setIsImporting] = useState(false)

  const currentGameInfo = GAME_LIST.find(g => g.id === selectedGame)

  const handleSelectGame = useCallback((gameId: string) => {
    setSelectedGame(gameId)
    setShowWordModal(true)
  }, [])

  const handleImportKeywords = useCallback(async () => {
    setIsImporting(true)
    try {
      // TODO: Task 430에서 실제 API 연동
      // const result = await reviewService.importLectureKeywordsToReview(lectureId)
      setIsImporting(false)
    } catch {
      setIsImporting(false)
    }
  }, [lectureId])

  const handleStartGame = useCallback(() => {
    setShowWordModal(false)
    setIsPlaying(true)
  }, [])

  const handleExitGame = useCallback(() => {
    setIsPlaying(false)
    setSelectedGame(null)
  }, [])

  // 게임 실행 중: placeholder (기존 컴포넌트 연동은 Task 430에서)
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
        <div className="flex flex-1 items-center justify-center text-sm text-gray-400">
          {/* TODO: 기존 게임 컴포넌트 통합 (Task 430) */}
          {gameName} — {t('lectureStudy.rightPanel.placeholder')}
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
      />
    </>
  )
}
