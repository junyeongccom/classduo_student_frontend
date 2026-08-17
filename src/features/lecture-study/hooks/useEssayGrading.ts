/**
 * @file useEssayGrading.ts
 * @description 서술형 제출 + 채점 결과 폴링 훅 — 문항별 채점 상태를 들고 stale 응답을 세대 토큰으로 막는다
 * @module features/lecture-study/hooks
 * @dependencies essayGradingService, domain/essayGradingView
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getEssayGrading,
  submitEssayAnswer,
  type EssayGradingResponse,
} from '../services/essayGradingService'
import {
  ESSAY_POLL_INTERVAL_MS,
  ESSAY_POLL_TIMEOUT_MS,
  isEssayGradingSettled,
  toEssayGradingView,
  type EssayGradingSource,
} from '../domain/essayGradingView'
import type { EssayGradingView } from '@/shared/components/quiz'

const PENDING_VIEW: EssayGradingView = {
  status: 'pending',
  score: null,
  criteria: [],
  feedback: null,
}

const TIMEOUT_VIEW: EssayGradingView = {
  status: 'timeout',
  score: null,
  criteria: [],
  feedback: null,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 서술형 채점 상태 관리.
 *
 * 폴링을 세대 토큰 2겹으로 지킨다 — 훅 세대(언마운트·회차 교체)와 문항 세대(재제출).
 * 어느 쪽이든 어긋나면 응답을 버리므로, 늦게 도착한 이전 제출의 결과가 최신 화면을
 * 덮어쓰지 않고 언마운트 후 setState 도 일어나지 않는다.
 */
export function useEssayGrading() {
  const [gradingByQuiz, setGradingByQuiz] = useState<Record<string, EssayGradingView>>({})

  // 훅 세대 — 언마운트/전체 리셋 시 올려 진행 중인 모든 폴링 루프를 무효화한다.
  const generationRef = useRef(0)
  // 문항 세대 — 같은 문항을 다시 제출하면 올려 이전 루프만 골라 무효화한다.
  const quizGenerationRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    return () => {
      generationRef.current += 1
    }
  }, [])

  /** 진행 중인 폴링을 모두 끊고 상태를 비운다 (회차·언어 교체 시) */
  const resetAll = useCallback(() => {
    generationRef.current += 1
    quizGenerationRef.current.clear()
    setGradingByQuiz({})
  }, [])

  /** 한 문항의 채점 표시를 지운다 (다시 풀기) */
  const clearGrading = useCallback((quizId: string) => {
    quizGenerationRef.current.set(quizId, (quizGenerationRef.current.get(quizId) ?? 0) + 1)
    setGradingByQuiz((prev) => {
      if (!(quizId in prev)) return prev
      const next = { ...prev }
      delete next[quizId]
      return next
    })
  }, [])

  const pollGrading = useCallback(async (quizId: string, responseId: string) => {
    const hookGeneration = generationRef.current
    const quizGeneration = (quizGenerationRef.current.get(quizId) ?? 0) + 1
    quizGenerationRef.current.set(quizId, quizGeneration)

    const isStale = () =>
      generationRef.current !== hookGeneration ||
      quizGenerationRef.current.get(quizId) !== quizGeneration

    const deadline = Date.now() + ESSAY_POLL_TIMEOUT_MS

    while (!isStale()) {
      await sleep(ESSAY_POLL_INTERVAL_MS)
      if (isStale()) return

      const result = await getEssayGrading(quizId, responseId)
      if (isStale()) return

      const data: EssayGradingResponse | null = result.data
      if (data && isEssayGradingSettled(data.grading_status)) {
        setGradingByQuiz((prev) => ({ ...prev, [quizId]: toEssayGradingView(data) }))
        return
      }

      // 조회 실패는 일시적일 수 있어 상한까지 계속 물어본다 — 첫 실패로 포기하지 않는다.
      if (Date.now() >= deadline) {
        setGradingByQuiz((prev) => ({ ...prev, [quizId]: TIMEOUT_VIEW }))
        return
      }
    }
  }, [])

  /**
   * 서버에서 이미 읽어 둔 채점 결과로 초기 화면을 채운다 (재진입 복원).
   * 아직 pending 인 채로 남은 제출은 response_id 가 있으면 폴링을 이어받는다 —
   * 제출 직후 화면을 떠난 학생이 돌아왔을 때 "채점 중"에 갇히지 않도록.
   */
  const seedGradings = useCallback(
    (entries: Array<{ quizId: string; responseId?: string | null; source: EssayGradingSource }>) => {
      if (entries.length === 0) return
      setGradingByQuiz((prev) => {
        const next = { ...prev }
        for (const entry of entries) {
          next[entry.quizId] = toEssayGradingView(entry.source)
        }
        return next
      })
      for (const entry of entries) {
        if (
          !isEssayGradingSettled(entry.source.grading_status) &&
          entry.responseId != null &&
          entry.responseId !== ''
        ) {
          void pollGrading(entry.quizId, entry.responseId)
        }
      }
    },
    [pollGrading],
  )

  /**
   * 답안 제출. 성공하면 즉시 '채점 중'으로 두고 폴링을 시작한다.
   * 반환값은 상위가 낙관적 상태·계측을 정리하는 데 쓴다.
   */
  const submitEssay = useCallback(
    async (
      quizId: string,
      lectureId: string,
      answerText: string,
      durationMs?: number | null,
    ): Promise<{ ok: boolean; message: string | null }> => {
      const hookGeneration = generationRef.current
      setGradingByQuiz((prev) => ({ ...prev, [quizId]: PENDING_VIEW }))

      const result = await submitEssayAnswer(quizId, lectureId, answerText, durationMs)
      if (generationRef.current !== hookGeneration) return { ok: false, message: null }

      if (result.error || !result.data) {
        setGradingByQuiz((prev) => {
          const next = { ...prev }
          delete next[quizId]
          return next
        })
        return { ok: false, message: result.error?.message ?? null }
      }

      void pollGrading(quizId, result.data.response_id)
      return { ok: true, message: null }
    },
    [pollGrading],
  )

  return { gradingByQuiz, submitEssay, seedGradings, clearGrading, resetAll }
}
