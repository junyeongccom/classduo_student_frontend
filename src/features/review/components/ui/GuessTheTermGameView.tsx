'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, X as XIcon } from 'lucide-react'
import type { GuessTheTermSecretTerm, LectureReviewItem } from '@/features/review/types'
import { ConfirmDialog } from './ConfirmDialog'

interface GuessTheTermGameViewProps {
  isEnabled: boolean
  reviewItems: LectureReviewItem[]
  onExitGame: () => void
  onSubmitQuestion: (question: string, secretTerm: GuessTheTermSecretTerm) => Promise<string | null>
  isSending: boolean
  errorMessage: string | null
}

type GuessTheTermMessage = {
  id: string
  role: 'user' | 'system'
  text: string
}

export function GuessTheTermGameView({
  isEnabled,
  reviewItems,
  onExitGame,
  onSubmitQuestion,
  isSending,
  errorMessage,
}: GuessTheTermGameViewProps) {
  const t = useTranslations('review.ui')
  const maxQuestions = 5
  const [stage, setStage] = useState<'intro' | 'play'>('intro')
  const [usedQuestions, setUsedQuestions] = useState(0)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<GuessTheTermMessage[]>([])
  const [disabledTermIds, setDisabledTermIds] = useState<Set<string>>(new Set())
  const [secretTermId, setSecretTermId] = useState<string | null>(null)
  const [showDescription, setShowDescription] = useState(false)
  const [isSelectingAnswer, setIsSelectingAnswer] = useState(false)
  const [confirmCandidateId, setConfirmCandidateId] = useState<string | null>(null)
  const [lockedWrongIds, setLockedWrongIds] = useState<Set<string>>(new Set())
  const [correctId, setCorrectId] = useState<string | null>(null)
  const [wrongGuessCount, setWrongGuessCount] = useState(0)
  const [isSuccessOpen, setIsSuccessOpen] = useState(false)
  const [isRevealAnswerOpen, setIsRevealAnswerOpen] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (stage !== 'play') return
    const el = chatScrollRef.current
    if (!el) return
    window.requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight
    })
  }, [messages.length, stage])

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
    setIsSelectingAnswer(false)
    setConfirmCandidateId(null)
    setLockedWrongIds(new Set())
    setCorrectId(null)
    setWrongGuessCount(0)
    setIsSuccessOpen(false)
    setIsRevealAnswerOpen(false)
    setIsGameOver(false)
  }

  const appendMessage = (role: GuessTheTermMessage['role'], text: string) => {
    setMessages(prev => [...prev, { id: `${Date.now()}-${prev.length}`, role, text }])
  }

  const handleSend = async () => {
    const text = draft.trim()
    if (!text) return
    if (isGameOver) return
    if (usedQuestions >= maxQuestions) return
    if (isSending) return

    if (!secretTerm) {
      appendMessage('system', '정답 용어를 불러오지 못했습니다. 새 게임을 시작해 주세요.')
      return
    }

    appendMessage('user', text)
    setDraft('')
    setUsedQuestions(prev => prev + 1)

    const answer = await onSubmitQuestion(text, {
      keyword: secretTerm.keyword,
      description: secretTerm.description,
    })
    if (!answer) {
      appendMessage('system', errorMessage || '답변을 불러오지 못했습니다.')
      return
    }
    appendMessage('system', answer)
  }

  const handleGiveUp = () => {
    if (isGameOver) return
    setIsGameOver(true)
    setIsSelectingAnswer(false)
    setConfirmCandidateId(null)
    const answer = secretTerm?.keyword ? `정답은 "${secretTerm.keyword}" 입니다.` : '정답을 불러오지 못했습니다.'
    appendMessage('system', `포기했습니다. ${answer}`)
  }

  const toggleDisabledTerm = (id: string) => {
    if (lockedWrongIds.has(id)) return
    if (correctId === id) return
    setDisabledTermIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submitAnswer = (id: string) => {
    if (isGameOver) return
    if (!secretTermId) return
    setIsSelectingAnswer(false)
    setConfirmCandidateId(null)
    const picked = reviewItems.find(item => item.id === id)
    const label = picked?.keyword ? `"${picked.keyword}"` : '선택한 용어'
    if (id === secretTermId) {
      setIsGameOver(true)
      setCorrectId(id)
      setIsSuccessOpen(true)
      return
    }
    setLockedWrongIds(prev => new Set([...prev, id]))
    setWrongGuessCount(prev => {
      const next = prev + 1
      if (next >= 4) {
        setIsGameOver(true)
        setIsSelectingAnswer(false)
        setConfirmCandidateId(null)
        setIsRevealAnswerOpen(true)
      }
      return next
    })
    appendMessage('system', `아니오. ${label} 는(은) 정답이 아닙니다.`)
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

  const userChatCount = messages.filter(m => m.role === 'user').length
  const confirmCandidate = confirmCandidateId ? reviewItems.find(it => it.id === confirmCandidateId) ?? null : null

  return (
    <div className="mt-4 grid grid-cols-1 gap-6 md:[grid-template-columns:3fr_7fr]">
      <ConfirmDialog
        isOpen={Boolean(confirmCandidate)}
        title={t('guessTheTerm.confirmTitle')}
        message={
          confirmCandidate?.keyword ? `${confirmCandidate.keyword}을(를) 답으로 선택하시겠습니까?` : t('guessTheTerm.confirmTitle')
        }
        confirmLabel={t('guessTheTerm.confirmYes')}
        cancelLabel={t('guessTheTerm.confirmNo')}
        onConfirm={() => {
          if (!confirmCandidateId) return
          submitAnswer(confirmCandidateId)
        }}
        onCancel={() => setConfirmCandidateId(null)}
      />

      {isSuccessOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-slate-900">{t('guessTheTerm.successTitle')}</div>
              <div className="mt-6 text-sm text-slate-700">{t('guessTheTerm.successFound', { count: userChatCount })}</div>
              {wrongGuessCount > 0 && (
                <div className="mt-2 text-sm text-slate-700">{t('guessTheTerm.successWrong', { count: wrongGuessCount })}</div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsSuccessOpen(false)
                  startNewGame()
                }}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t('guessTheTerm.newGame')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSuccessOpen(false)
                  onExitGame()
                }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('guessTheTerm.backToList')}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRevealAnswerOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
            <div className="text-center">
              <div className="text-3xl font-extrabold text-slate-900">
                {secretTerm?.keyword ? `정답은 ${secretTerm.keyword}입니다.` : '정답을 불러오지 못했습니다.'}
              </div>
              <div className="mt-3 text-sm text-slate-600">다시 시도하세요!</div>
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRevealAnswerOpen(false)
                  startNewGame()
                }}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                {t('guessTheTerm.newGame')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRevealAnswerOpen(false)
                  onExitGame()
                }}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('guessTheTerm.backToList')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Left: Chat */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">{t('guessTheTerm.chatHint')}</div>
        <div className="mt-2 text-xs text-slate-500">{t('guessTheTerm.questionsUsed', { total: maxQuestions, used: usedQuestions })}</div>

        <div className="mt-3 flex h-[240px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3">
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
              placeholder={usedQuestions >= maxQuestions ? '모든 질문을 사용했습니다' : t('guessTheTerm.inputPlaceholder')}
              disabled={isGameOver || usedQuestions >= maxQuestions || isSending}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSend()
              }}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={isGameOver || usedQuestions >= maxQuestions || !draft.trim() || isSending}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? '...' : t('guessTheTerm.send')}
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
          <button
            type="button"
            onClick={() => {
              if (isGameOver) return
              setConfirmCandidateId(null)
              setIsSelectingAnswer(prev => !prev)
            }}
            disabled={isGameOver}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSelectingAnswer ? t('guessTheTerm.cancelSelect') : t('guessTheTerm.selectAnswer')}
          </button>
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
              showDescription ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
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
              const isLockedWrong = lockedWrongIds.has(item.id)
              const isCorrect = correctId === item.id
              const canToggle = !isLockedWrong && !isCorrect
              const canChoose = isSelectingAnswer && !isDisabled && !isLockedWrong && !isCorrect
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={canToggle ? 0 : -1}
                  aria-disabled={canToggle ? 'false' : 'true'}
                  onClick={() => {
                    if (!canToggle) return
                    toggleDisabledTerm(item.id)
                  }}
                  onKeyDown={(e) => {
                    if (!canToggle) return
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleDisabledTerm(item.id)
                    }
                  }}
                  className={[
                    'group relative overflow-hidden rounded-xl border p-3 text-left transition h-[96px]',
                    isCorrect
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : isLockedWrong
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : isDisabled
                          ? 'border-slate-200 bg-slate-100 text-slate-400'
                          : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                >
                  {!isDisabled && !isLockedWrong && !isCorrect && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <XIcon className="h-14 w-14 text-slate-700/50" strokeWidth={2.5} />
                    </div>
                  )}

                  <div className="relative flex h-full items-start justify-between gap-2">
                    <div className={['min-w-0 flex h-full flex-col', showDescription ? 'justify-start' : 'justify-center'].join(' ')}>
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

                  {canChoose && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmCandidateId(item.id)
                      }}
                      className="absolute bottom-2 right-2 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800"
                    >
                      {t('guessTheTerm.choose')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}


