/**
 * 답변 로딩 복습 배너 (영상 + 랜덤 정답)
 */
'use client'

import { useEffect, useRef, useState } from 'react'

interface AnswerLoadingReviewBannerProps {
  answers: string[]
  intervalMs?: number
  fallbackText?: string
  className?: string
}

const pickRandomAnswer = (answers: string[], exclude?: string) => {
  if (answers.length === 0) return ''
  if (answers.length === 1) return answers[0]
  let next = answers[Math.floor(Math.random() * answers.length)]
  if (exclude) {
    let guard = 0
    while (next === exclude && guard < 5) {
      next = answers[Math.floor(Math.random() * answers.length)]
      guard += 1
    }
  }
  return next
}

export function AnswerLoadingReviewBanner({
  answers,
  intervalMs = 10000,
  fallbackText = '정답 준비 중...',
  className = '',
}: AnswerLoadingReviewBannerProps) {
  const [currentAnswer, setCurrentAnswer] = useState(fallbackText)
  const [nextAnswer, setNextAnswer] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const currentAnswerRef = useRef(currentAnswer)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    currentAnswerRef.current = currentAnswer
  }, [currentAnswer])

  useEffect(() => {
    if (answers.length === 0) {
      setCurrentAnswer(fallbackText)
      setNextAnswer(null)
      setIsAnimating(false)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      return
    }
    setCurrentAnswer(pickRandomAnswer(answers))
  }, [answers, fallbackText])

  useEffect(() => {
    if (answers.length === 0) return

    const interval = setInterval(() => {
      const next = pickRandomAnswer(answers, currentAnswerRef.current)
      setNextAnswer(next)
      setIsAnimating(false)

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      rafRef.current = requestAnimationFrame(() => {
        setIsAnimating(true)
      })

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        setCurrentAnswer(next)
        setNextAnswer(null)
        setIsAnimating(false)
      }, 300)
    }, intervalMs)

    return () => {
      clearInterval(interval)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [answers, intervalMs])

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          <video
            src="/TEST.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-20 w-32 rounded-lg object-cover"
          />
        </div>
        <div className="flex-1">
          <div className="relative h-16 overflow-hidden">
            <div
              className={`absolute inset-0 flex items-center text-sm font-semibold text-gray-900 transition-opacity duration-300 ease-out ${
                isAnimating ? 'opacity-0' : 'opacity-100'
              }`}
              style={{
                lineHeight: '1.2',
                maxHeight: '4.8em',
                overflow: 'hidden',
              }}
            >
              {currentAnswer}
            </div>
            {nextAnswer && (
              <div
                className={`absolute inset-0 flex items-center text-sm font-semibold text-gray-900 transition-all duration-300 ease-out ${
                  isAnimating ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
                style={{
                  lineHeight: '1.2',
                  maxHeight: '4.8em',
                  overflow: 'hidden',
                }}
              >
                {nextAnswer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
