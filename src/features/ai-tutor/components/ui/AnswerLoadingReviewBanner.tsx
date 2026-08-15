/**
 * 답변 로딩 복습 배너 (영상 + 랜덤 정답)
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { useIsAppWebView } from '@/shared/lib/appBridge'

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
  fallbackText = '핵심 단어 준비중...',
  className,
}: AnswerLoadingReviewBannerProps) {
  // 앱 WebView(RN) 모드 — iOS WebView 는 inline 재생 미허용 시 autoplay <video> 를
  // 네이티브 전체화면 플레이어로 띄워 화면 전체를 덮는다. 앱 모드에서는 비디오 대신
  // CSS 애니메이션 일러스트로 대체한다 (웹/데스크톱은 기존 그대로).
  const isAppWebView = useIsAppWebView()
  const [currentAnswer, setCurrentAnswer] = useState(fallbackText)
  const [nextAnswer, setNextAnswer] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const currentAnswerRef = useRef(currentAnswer)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
    <div className={cn('rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm', className)}>
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {isAppWebView ? (
            <div className="flex h-20 w-32 max-w-full items-center justify-center gap-2 rounded-lg bg-gray-50" aria-hidden>
              <img
                src="/topic_test/hero-female.png"
                alt=""
                width={44}
                height={44}
                className="animate-bounce rounded-full bg-pink-50 object-contain [animation-delay:-0.15s]"
              />
              <img
                src="/topic_test/hero-male.png"
                alt=""
                width={44}
                height={44}
                className="animate-bounce rounded-full bg-sky-50 object-contain"
              />
            </div>
          ) : (
            <video
              src="/TEST.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="h-20 w-32 max-h-[40dvh] max-w-full rounded-lg object-contain md:object-cover"
            />
          )}
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
