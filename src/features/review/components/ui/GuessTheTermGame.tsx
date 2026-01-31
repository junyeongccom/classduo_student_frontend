'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, X as XIcon } from 'lucide-react'
import type { LectureReviewItem } from '@/features/review/types'

interface GuessTheTermGameProps {
  isEnabled: boolean
  reviewItems: LectureReviewItem[]
}

type GuessTheTermMessage = {
  id: string
  role: 'user' | 'system'
  text: string
}

export function GuessTheTermGame({ isEnabled, reviewItems }: GuessTheTermGameProps) {
  const t = useTranslations('review.ui')
  const maxQuestions = 10
  const [stage, setStage] = useState<'intro' | 'play'>('intro')
  const [usedQuestions, setUsedQuestions] = useState(0)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<GuessTheTermMessage[]>([])
  const [disabledTermIds, setDisabledTermIds] = useState<Set<string>>(new Set())
  const [secretTermId, setSecretTermId] = useState<string | null>(null)
  const [showDescription, setShowDescription] = useState(false)
  const [isAnswerPickerOpen, setIsAnswerPickerOpen] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)

  if (!isEnabled) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
        {t('guessTheTerm.selectLecture')}
      </div>
    )
  }

  if (reviewItems.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
        {t('guessTheTerm.noTerms')}
      </div>
    )
  }

  const instructionLines = useMemo(() => {
    const instructionText = t('guessTheTerm.instructions')
    return instructionText.split('\n').map(line => line.trim()).filter(Boolean)
  }, [t])

  const instructionTitle = instructionLines[0] || ''
  const instructionContentLines = instructionLines.slice(1)

  const secretTerm = useMemo(() => {
    return reviewItems.find(item => item.id === secretTermId) ?? null
  }, [reviewItems, secretTermId])

  const keywordCandidates = useMemo(() => {
    return reviewItems
      .map(item => ({ id: item.id, keyword: (item.keyword || '').trim() }))
      .filter(item => item.keyword.length > 0)
      .sort((a, b) => b.keyword.length - a.keyword.length)
  }, [reviewItems])

  const startNewGame = () => {
    const pool = keywordCandidates
    if (pool.length === 0) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setSecretTermId(pick.id)
    setStage('play')
    setUsedQuestions(0)
    setDraft('')
    setMessages([])
    setDisabledTermIds(new Set())
    setShowDescription(false)
    setIsAnswerPickerOpen(false)
    setIsGameOver(false)
  }

  const appendMessage = (role: GuessTheTermMessage['role'], text: string) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${prev.length}`, role, text }])
  }

  const extractMentionedKeyword = (text: string) => {
    const hay = text.toLowerCase()
    const match = keywordCandidates.find(k => hay.includes(k.keyword.toLowerCase()))
    return match ?? null
  }

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return
    if (isGameOver) return
    if (usedQuestions >= maxQuestions) return

    appendMessage('user', text)
    setDraft('')
    setUsedQuestions(prev => prev + 1)

    const mentioned = extractMentionedKeyword(text)
    if (!mentioned) {
      appendMessage('system', '질문에 용어(키워드)를 포함해 주세요.')
      return
    }
    if (mentioned.id === secretTermId) {
      appendMessage('system', '예')
    } else {
      appendMessage('system', '아니오')
    }
  }

  const handleGiveUp = () => {
    if (isGameOver) return
    setIsGameOver(true)
    setIsAnswerPickerOpen(false)
    const answer = secretTerm?.keyword ? `정답은 "${secretTerm.keyword}" 입니다.` : '정답을 불러오지 못했습니다.'
    appendMessage('system', `포기했습니다. ${answer}`)
  }

  const toggleDisabledTerm = (id: string) => {
    setDisabledTermIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitAnswer = (id: string) => {
    setIsAnswerPickerOpen(false)
    if (isGameOver) return
    if (!secretTermId) return
    const picked = reviewItems.find(item => item.id === id)
    const label = picked?.keyword ? `"${picked.keyword}"` : '선택한 용어'
    if (id === secretTermId) {
      setIsGameOver(true)
      appendMessage('system', `정답입니다! ${label}`)
      return
    }
    appendMessage('system', `아니오. ${label} 는(은) 정답이 아닙니다.`)
    setDisabledTermIds(prev => new Set([...prev, id]))
  }

  if (stage === 'intro') {
    return (
      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-bold text-slate-900">{instructionTitle}</h3>
          <div className="flex flex-col gap-2">
            {instructionContentLines.map((line, index) => (
              <p key={`guessTheTerm-instruction-${index}`} className="text-sm leading-relaxed text-slate-700">
                <span className="mr-2">•</span>
                {line}
              </p>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={startNewGame}
            className="rounded-lg border border-slate-200 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t('guessTheTerm.newGame')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 md:[grid-template-columns:3fr_7fr]">
      {/* Left: Chat */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">{t('guessTheTerm.chatHint')}</div>
        <div className="mt-2 text-xs text-slate-500">
          {t('guessTheTerm.questionsUsed', { total: maxQuestions, used: usedQuestions })}
        </div>

        <div className="mt-3 flex h-[240px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <div className="flex-1 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="text-xs text-slate-400">채팅을 시작해 보세요.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={[
                      'max-w-[85%] rounded-2xl px-3 py-2 text-xs',
                      msg.role === 'user'
                        ? 'ml-auto bg-slate-900 text-white'
                        : 'mr-auto bg-white text-slate-700 border border-slate-200',
                    ].join(' ')}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 bg-slate-50 p-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('guessTheTerm.inputPlaceholder')}
              disabled={isGameOver || usedQuestions >= maxQuestions}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isGameOver || usedQuestions >= maxQuestions || !draft.trim()}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('guessTheTerm.send')}
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleGiveUp}
            disabled={isGameOver}
            className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('guessTheTerm.giveUp')}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsAnswerPickerOpen(prev => !prev)}
              disabled={isGameOver}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('guessTheTerm.selectAnswer')}
            </button>

            {isAnswerPickerOpen && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg z-20">
                <div className="max-h-64 overflow-y-auto p-2">
                  {reviewItems.map(item => (
                    <button
                      key={`answer-${item.id}`}
                      type="button"
                      onClick={() => submitAnswer(item.id)}
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {item.keyword}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Terms */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">용어</div>
          <button
            type="button"
            onClick={() => setShowDescription(prev => !prev)}
            className={[
              'rounded-full border px-3 py-1 text-xs font-semibold transition',
              showDescription
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            ].join(' ')}
            aria-pressed={showDescription ? 'true' : 'false'}
          >
            {t('guessTheTerm.showDescription')}
          </button>
        </div>

        <div className="mt-3 max-h-[360px] overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-3">
            {reviewItems.map(item => {
              const isDisabled = disabledTermIds.has(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleDisabledTerm(item.id)}
                  className={[
                    'group relative overflow-hidden rounded-xl border p-3 text-left transition h-[96px]',
                    isDisabled
                      ? 'border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                >
                  {/* Hover overlay: big X in the center */}
                  {!isDisabled && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <XIcon className="h-14 w-14 text-slate-700/50" strokeWidth={2.5} />
                    </div>
                  )}

                  <div className="relative flex h-full items-start justify-between gap-2">
                    <div
                      className={[
                        'min-w-0 flex h-full flex-col',
                        showDescription ? 'justify-start' : 'justify-center',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'text-sm font-semibold',
                          showDescription ? 'leading-snug' : 'leading-none',
                          isDisabled ? 'text-slate-400' : 'text-slate-900',
                        ].join(' ')}
                      >
                        <span className="block truncate">{item.keyword}</span>
                      </div>
                      <div
                        className={[
                          'mt-1 text-xs font-normal whitespace-normal break-words overflow-hidden',
                          showDescription ? '' : 'invisible',
                          isDisabled ? 'text-slate-400' : 'text-slate-500',
                        ].join(' ')}
                      >
                        {item.description}
                      </div>
                    </div>

                    <div className="relative shrink-0">
                      <Eye className={['h-4 w-4', isDisabled ? 'text-slate-400' : 'text-slate-500'].join(' ')} />
                      {isDisabled && (
                        <div
                          className="pointer-events-none absolute inset-0"
                          style={{
                            backgroundImage:
                              'linear-gradient(225deg, rgba(148,163,184,0) 0%, rgba(148,163,184,0) 46%, rgba(148,163,184,0.9) 46%, rgba(148,163,184,0.9) 54%, rgba(148,163,184,0) 54%, rgba(148,163,184,0) 100%)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}


