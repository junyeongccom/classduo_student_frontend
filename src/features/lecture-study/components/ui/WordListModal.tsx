/**
 * @file WordListModal.tsx
 * @description 게임용 단어 목록 관리 모달 (DB 연동 CRUD)
 * @module features/lecture-study/components/ui
 * @dependencies shared/components/ui/Dialog, lucide-react
 */

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Pencil, Check, X, Loader2 } from 'lucide-react'
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
  onAddWord: (keyword: string, description: string) => Promise<void>
  onUpdateWord: (id: string, keyword: string, description: string) => Promise<void>
  onDeleteWord: (id: string) => Promise<void>
  minWords: number
  gameName: string
  onStartGame: () => void
  isLoading?: boolean
  /** 읽기 전용 모드 (랭킹 모드 등 — 추가/수정/삭제 비활성화) */
  readOnly?: boolean
}

export function WordListModal({
  open,
  onOpenChange,
  words,
  onAddWord,
  onUpdateWord,
  onDeleteWord,
  minWords,
  gameName,
  onStartGame,
  isLoading = false,
  readOnly = false,
}: WordListModalProps) {
  const t = useTranslations()
  const [newKeyword, setNewKeyword] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editKeyword, setEditKeyword] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const canStart = words.length >= minWords

  const handleAdd = async () => {
    if (!newKeyword.trim() || words.length >= MAX_WORD_COUNT || isSaving) return
    setIsSaving(true)
    try {
      await onAddWord(
        newKeyword.trim().slice(0, MAX_KEYWORD_LENGTH),
        newDescription.trim().slice(0, MAX_DESCRIPTION_LENGTH),
      )
      setNewKeyword('')
      setNewDescription('')
    } catch {
      // API 실패 시 입력값 유지
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async (id: string) => {
    if (isSaving) return
    if (editingId === id) setEditingId(null)
    setIsSaving(true)
    try {
      await onDeleteWord(id)
    } catch {
      // ignore
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEdit = (word: WordItem) => {
    setEditingId(word.id)
    setEditKeyword(word.keyword)
    setEditDescription(word.description)
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editKeyword.trim() || isSaving) return
    setIsSaving(true)
    try {
      await onUpdateWord(
        editingId,
        editKeyword.trim().slice(0, MAX_KEYWORD_LENGTH),
        editDescription.trim().slice(0, MAX_DESCRIPTION_LENGTH),
      )
      setEditingId(null)
    } catch {
      // API 실패 시 편집 상태 유지
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-3xl max-h-[calc(100dvh-3rem)] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t('lectureStudy.game.wordListTitle')}</DialogTitle>
          <DialogDescription>{gameName}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 py-2">
            {words.map(word => (
              <div key={word.id} className="flex items-start gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                {editingId === word.id ? (
                  <div className="flex-1 min-w-0 space-y-1">
                    <input
                      value={editKeyword}
                      onChange={e => setEditKeyword(e.target.value)}
                      maxLength={MAX_KEYWORD_LENGTH}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      value={editDescription}
                      onChange={e => setEditDescription(e.target.value)}
                      maxLength={MAX_DESCRIPTION_LENGTH}
                      className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <button onClick={handleSaveEdit} disabled={isSaving} className="p-0.5 text-emerald-600 hover:text-emerald-800 disabled:opacity-40">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
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
                    {!readOnly && (
                      <button
                        onClick={() => handleStartEdit(word)}
                        disabled={isSaving}
                        className="shrink-0 p-1 text-gray-400 hover:text-blue-500 disabled:opacity-40"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {!readOnly && (
                      <button
                        onClick={() => handleRemove(word.id)}
                        disabled={isSaving}
                        className="shrink-0 p-1 text-gray-400 hover:text-red-500 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add word */}
        {!readOnly && (
          <div className="flex gap-2">
            <input
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              placeholder={t('lectureStudy.game.wordKeywordPlaceholder')}
              maxLength={MAX_KEYWORD_LENGTH}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <input
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              placeholder={t('lectureStudy.game.wordDescriptionPlaceholder')}
              maxLength={MAX_DESCRIPTION_LENGTH}
              className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newKeyword.trim() || words.length >= MAX_WORD_COUNT || isSaving}
              className="shrink-0 rounded-md bg-gray-900 p-1.5 text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
        )}

        {!canStart && minWords > 0 && (
          <p className="text-xs text-amber-600">
            {t('lectureStudy.game.minWords', { n: minWords })}
          </p>
        )}

        <DialogFooter className="gap-2">
          <button
            onClick={onStartGame}
            disabled={!canStart || isLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {t('lectureStudy.game.startGame')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
