/**
 * @file WordListModal.tsx
 * @description 게임용 단어 목록 관리 모달
 * @module features/lecture-study/components/ui
 * @dependencies shared/components/ui/Dialog, lucide-react
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Download, Pencil, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/shared/components/ui'

const MAX_KEYWORD_LENGTH = 100
const MAX_DESCRIPTION_LENGTH = 500
const MAX_WORD_COUNT = 100

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
  isRunningGame?: boolean
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
  isRunningGame = false,
}: WordListModalProps) {
  const t = useTranslations()
  const [newKeyword, setNewKeyword] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editKeyword, setEditKeyword] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const canStart = isRunningGame || words.length >= minWords

  const handleAdd = () => {
    if (!newKeyword.trim() || words.length >= MAX_WORD_COUNT) return
    const newItem: WordItem = {
      id: crypto.randomUUID(),
      keyword: newKeyword.trim().slice(0, MAX_KEYWORD_LENGTH),
      description: newDescription.trim().slice(0, MAX_DESCRIPTION_LENGTH),
    }
    onWordsChange([...words, newItem])
    setNewKeyword('')
    setNewDescription('')
  }

  const handleRemove = (id: string) => {
    if (editingId === id) setEditingId(null)
    onWordsChange(words.filter(w => w.id !== id))
  }

  const handleStartEdit = (word: WordItem) => {
    setEditingId(word.id)
    setEditKeyword(word.keyword)
    setEditDescription(word.description)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editKeyword.trim()) return
    onWordsChange(
      words.map(w =>
        w.id === editingId
          ? { ...w, keyword: editKeyword.trim().slice(0, MAX_KEYWORD_LENGTH), description: editDescription.trim().slice(0, MAX_DESCRIPTION_LENGTH) }
          : w,
      ),
    )
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('lectureStudy.game.wordListTitle')}</DialogTitle>
          <DialogDescription>{gameName}</DialogDescription>
        </DialogHeader>

        {isRunningGame && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-700">
            {t('lectureStudy.game.runningGameNote')}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2">
          {words.map(word => (
            <div key={word.id} className="flex items-start gap-2 rounded-lg border border-gray-200 p-2">
              {editingId === word.id ? (
                <div className="flex-1 min-w-0 space-y-1">
                  <input
                    value={editKeyword}
                    onChange={e => setEditKeyword(e.target.value)}
                    maxLength={MAX_KEYWORD_LENGTH}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                  />
                  <input
                    value={editDescription}
                    onChange={e => setEditDescription(e.target.value)}
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                  />
                  <div className="flex gap-1">
                    <button onClick={handleSaveEdit} className="p-0.5 text-emerald-600 hover:text-emerald-800">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={handleCancelEdit} className="p-0.5 text-gray-400 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{word.keyword}</p>
                    {word.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{word.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleStartEdit(word)}
                    className="shrink-0 p-1 text-gray-400 hover:text-blue-500"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(word.id)}
                    className="shrink-0 p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add word */}
        <div className="flex gap-2">
          <input
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            placeholder="단어"
            maxLength={MAX_KEYWORD_LENGTH}
            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <input
            value={newDescription}
            onChange={e => setNewDescription(e.target.value)}
            placeholder="설명"
            maxLength={MAX_DESCRIPTION_LENGTH}
            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newKeyword.trim() || words.length >= MAX_WORD_COUNT}
            className="shrink-0 rounded-md bg-gray-900 p-1.5 text-white hover:bg-gray-800 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {!canStart && minWords > 0 && (
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
