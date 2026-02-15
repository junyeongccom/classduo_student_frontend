/**
 * @file WordListModal.tsx
 * @description 게임용 단어 목록 관리 모달
 * @module features/lecture-study/components/ui
 * @dependencies shared/components/ui/Dialog, lucide-react
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Download } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui'

interface WordItem {
  id: string
  keyword: string
  description: string
}

interface WordListModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  words: WordItem[]
  onWordsChange: (words: WordItem[]) => void
  onImportKeywords: () => void
  minWords: number
  gameName: string
  onStartGame: () => void
  isImporting?: boolean
}

export function WordListModal({
  open,
  onOpenChange,
  words,
  onWordsChange,
  onImportKeywords,
  minWords,
  gameName,
  onStartGame,
  isImporting = false,
}: WordListModalProps) {
  const t = useTranslations()
  const [newKeyword, setNewKeyword] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const canStart = words.length >= minWords

  const handleAdd = () => {
    if (!newKeyword.trim()) return
    const newItem: WordItem = {
      id: crypto.randomUUID(),
      keyword: newKeyword.trim(),
      description: newDescription.trim(),
    }
    onWordsChange([...words, newItem])
    setNewKeyword('')
    setNewDescription('')
  }

  const handleRemove = (id: string) => {
    onWordsChange(words.filter(w => w.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('lectureStudy.game.wordListTitle')}</DialogTitle>
          <DialogDescription>{gameName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2">
          {words.map(word => (
            <div key={word.id} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{word.keyword}</p>
                {word.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{word.description}</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(word.id)}
                className="shrink-0 p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add word */}
        <div className="flex gap-2">
          <input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            placeholder="단어"
            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="설명"
            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newKeyword.trim()}
            className="shrink-0 rounded-md bg-gray-900 p-1.5 text-white hover:bg-gray-800 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {!canStart && (
          <p className="text-xs text-amber-600">
            {t('lectureStudy.game.minWords', { n: minWords })}
          </p>
        )}

        <DialogFooter className="gap-2">
          <button
            onClick={onImportKeywords}
            disabled={isImporting}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            {t('lectureStudy.game.importKeywords')}
          </button>
          <button
            onClick={onStartGame}
            disabled={!canStart}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {t('lectureStudy.game.startGame')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
