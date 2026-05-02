/**
 * @file useQuizStorage.ts
 * @description 즐겨찾기 + 오답을 단일 피드로 통합 조회 — 퀴즈 저장소 페이지 전용
 * @module features/my-quiz/hooks
 * @dependencies myQuizStatusService, groupQuizzes
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as statusService from '../services/myQuizStatusService'
import type { QuizItem, QuizSource } from '../types'
import type { QuizWithMeta } from '../domain/groupQuizzes'

const PAGE_SIZE = 50

export interface QuizStorageItem extends QuizWithMeta {
  /** 즐겨찾기 여부 */
  is_bookmark: boolean
  /** 오답 여부 */
  is_wrong: boolean
  /** 오답 누적 횟수 (오답 노트 기록 수) */
  wrong_count: number
  /** 가장 최근 활동 시점 (즐겨찾기 또는 오답 created_at 중 최신) */
  last_activity_at: string | null
  /** 오답 마지막 시점 (있을 때만) */
  last_wrong_at: string | null
  /** 강의 회차 번호 (lecture_no). exam_prep 항목의 핵심테스트 번호 필터링에 사용. */
  lecture_no?: number
}

interface UseQuizStorageOpts {
  lectureIds: string[]
  lectureInfoMap: Map<
    string,
    { course_id: string; course_name: string; lecture_name: string; lecture_no: number }
  >
}

interface UseQuizStorageReturn {
  items: QuizStorageItem[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  totalBookmarks: number
  totalWrongs: number
}

/**
 * 즐겨찾기(user_quiz_bookmarks) + 오답(user_quiz_response 기반 추출)을 quiz_id 기준으로 머지.
 * 같은 문제가 양쪽에 있으면 둘 다 true로 표시.
 */
export function useQuizStorage({
  lectureIds,
  lectureInfoMap,
}: UseQuizStorageOpts): UseQuizStorageReturn {
  const [items, setItems] = useState<QuizStorageItem[]>([])
  const [totalBookmarks, setTotalBookmarks] = useState(0)
  const [totalWrongs, setTotalWrongs] = useState(0)
  // 초기 true — 빈 상태가 잠깐 보였다가 데이터 로드되며 갱신되는 깜빡임 방지
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const fetchAll = useCallback(async () => {
    if (lectureIds.length === 0) {
      setItems([])
      setTotalBookmarks(0)
      setTotalWrongs(0)
      setIsLoading(false)
      return
    }

    const myReq = ++requestIdRef.current
    setIsLoading(true)
    setError(null)

    try {
      // 1) 즐겨찾기 + 오답 묶음 + 응답 로그를 동시에 조회.
      //    user_quiz_response 는 누적 incorrect_count 산출용 (content/customize),
      //    exam_prep 는 별도로 exam_prep_response (오답 묶음) + mastery (누적 카운트) 사용.
      const [bookmarkRes, incorrectRes, attemptRes, examPrepIncorrectRes] = await Promise.all([
        statusService.getBookmarksByLectureIds(lectureIds, {
          limit: PAGE_SIZE,
          offset: 0,
        }),
        statusService.fetchIncorrectQuizIdsByLectureIds(lectureIds),
        statusService.fetchQuizResponsesByLectureIds(lectureIds),
        statusService.fetchExamPrepIncorrectsByLectureIds(lectureIds),
      ])

      if (myReq !== requestIdRef.current) return

      if (bookmarkRes.error || incorrectRes.error) {
        setError(
          bookmarkRes.error?.message ??
            incorrectRes.error?.message ??
            'load failed',
        )
        setItems([])
        setIsLoading(false)
        return
      }
      // attemptRes / examPrepIncorrectRes 실패는 비치명적 — fallback 으로 계속 진행.

      const bookmarks = bookmarkRes.data ?? []
      // exam_prep 오답 묶음을 user_quiz_response 기반 묶음과 병합 (같은 IncorrectQuizEntry shape)
      const incorrects = [
        ...(incorrectRes.data ?? []),
        ...(examPrepIncorrectRes.data ?? []),
      ]
      const attempts = attemptRes.data ?? []
      setTotalBookmarks(bookmarks.length)
      setTotalWrongs(incorrects.length)

      // (quiz_source, quiz_id) → 누적 incorrect_count.
      // content / customize / instructor 만 — exam_prep 는 mastery 에서 별도로 합친다.
      // 'incorrect' source 는 오답노트에서 다시 풀이한 활동 로그이지 원본 quiz 의 오답이
      // 아니므로 카운트에서 제외 (별도 quiz 본문도 없음).
      const wrongCountMap = new Map<string, number>()
      for (const a of attempts) {
        if (a.correct === false && a.quiz_source !== 'incorrect') {
          const key = `${a.quiz_source}:${a.quiz_id}`
          wrongCountMap.set(key, (wrongCountMap.get(key) ?? 0) + 1)
        }
      }

      // (quiz_source, quiz_id) → 머지 레코드
      type Acc = {
        quiz_id: string
        quiz_source: QuizSource
        lecture_id: string
        is_bookmark: boolean
        is_wrong: boolean
        wrong_count: number
        bookmark_at: string | null
        last_wrong_at: string | null
        selected_answer: number | null
        correct: boolean | null
      }
      const merged = new Map<string, Acc>()

      for (const b of bookmarks) {
        const key = `${b.quiz_source}:${b.quiz_id}`
        merged.set(key, {
          quiz_id: b.quiz_id,
          quiz_source: b.quiz_source,
          lecture_id: b.lecture_id,
          is_bookmark: true,
          is_wrong: false,
          wrong_count: 0,
          bookmark_at: b.created_at ?? null,
          last_wrong_at: null,
          selected_answer: b.selected_answer,
          correct: b.correct,
        })
      }

      for (const w of incorrects) {
        // 'incorrect' source 는 오답노트에서 다시 풀이한 활동 로그이지 별개 quiz 가 아님 — skip
        // (bySource Record 에 'incorrect' 키가 없어 push 시 TypeError 도 방지)
        if (w.quiz_source === 'incorrect') continue
        const key = `${w.quiz_source}:${w.quiz_id}`
        const existing = merged.get(key)
        if (existing) {
          existing.is_wrong = true
          if (
            !existing.last_wrong_at ||
            new Date(w.last_wrong_at) > new Date(existing.last_wrong_at)
          ) {
            existing.last_wrong_at = w.last_wrong_at
          }
        } else {
          merged.set(key, {
            quiz_id: w.quiz_id,
            quiz_source: w.quiz_source,
            lecture_id: w.lecture_id,
            is_bookmark: false,
            is_wrong: true,
            wrong_count: 0,
            bookmark_at: null,
            last_wrong_at: w.last_wrong_at,
            selected_answer: w.latest_selected_answer,
            correct: w.latest_is_correct,
          })
        }
      }

      // 출처별 분류 → 한 번에 조회
      // 'incorrect' source 는 위 incorrects 처리에서 이미 skip 했으나, 타입 만족을 위해 빈 배열 유지.
      const bySource: Record<QuizSource, string[]> = {
        instructor: [],
        customize: [],
        content: [],
        exam_prep: [],
        incorrect: [],
      }
      for (const acc of merged.values()) {
        bySource[acc.quiz_source].push(acc.quiz_id)
      }

      const [instr, cust, cont, exam, mastery] = await Promise.all([
        bySource.instructor.length > 0
          ? statusService.fetchQuizContent(bySource.instructor, 'instructor')
          : { data: [], error: null },
        bySource.customize.length > 0
          ? statusService.fetchQuizContent(bySource.customize, 'customize')
          : { data: [], error: null },
        bySource.content.length > 0
          ? statusService.fetchQuizContent(bySource.content, 'content')
          : { data: [], error: null },
        bySource.exam_prep.length > 0
          ? statusService.fetchQuizContent(bySource.exam_prep, 'exam_prep')
          : { data: [], error: null },
        // exam_prep 누적 incorrect_count 는 mastery 에서 직접. 실패 시 fallback.
        bySource.exam_prep.length > 0
          ? statusService.fetchExamPrepMasteryCounts(bySource.exam_prep)
          : { data: [], error: null },
      ])

      if (myReq !== requestIdRef.current) return

      const contentMap = new Map<string, QuizItem>()
      for (const x of instr.data ?? []) contentMap.set(`instructor:${x.quiz_id}`, x)
      for (const x of cust.data ?? []) contentMap.set(`customize:${x.quiz_id}`, x)
      for (const x of cont.data ?? []) contentMap.set(`content:${x.quiz_id}`, x)
      for (const x of exam.data ?? []) contentMap.set(`exam_prep:${x.quiz_id}`, x)

      // exam_prep mastery 누적 카운트 → wrongCountMap 에 합치기.
      for (const m of mastery.data ?? []) {
        wrongCountMap.set(`exam_prep:${m.question_id}`, m.incorrect_count)
      }

      const result: QuizStorageItem[] = []
      for (const acc of merged.values()) {
        const key = `${acc.quiz_source}:${acc.quiz_id}`
        const content = contentMap.get(key)
        if (!content) continue
        const info = lectureInfoMap.get(acc.lecture_id)
        const lastActivity =
          acc.last_wrong_at && acc.bookmark_at
            ? new Date(acc.last_wrong_at) > new Date(acc.bookmark_at)
              ? acc.last_wrong_at
              : acc.bookmark_at
            : (acc.last_wrong_at ?? acc.bookmark_at)

        // 진짜 누적 오답 횟수 — user_quiz_response (content/customize) 또는
        // exam_prep_mastery (exam_prep). is_wrong=true 인데 누적 데이터가 0인 경우는
        // is_wrong 플래그 자체로 최소 1회 보정 (백필 직후 created_at 단조증가 등 엣지 케이스).
        const cumulativeWrong = wrongCountMap.get(key) ?? 0
        const finalWrongCount = acc.is_wrong
          ? Math.max(cumulativeWrong, 1)
          : cumulativeWrong

        result.push({
          ...content,
          difficulty: content.difficulty ?? null,
          quiz_source: acc.quiz_source,
          lecture_id: acc.lecture_id,
          bookmark: acc.is_bookmark,
          correct: acc.correct,
          selected_answer: acc.selected_answer,
          course_id: info?.course_id,
          course_name: info?.course_name,
          lecture_name: info?.lecture_name,
          lecture_no: info?.lecture_no,
          is_bookmark: acc.is_bookmark,
          is_wrong: acc.is_wrong,
          wrong_count: finalWrongCount,
          last_activity_at: lastActivity,
          last_wrong_at: acc.last_wrong_at,
        })
      }

      // 최신순 (last_activity_at desc)
      result.sort((a, b) => {
        const aT = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0
        const bT = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0
        return bT - aT
      })

      setItems(result)
      setIsLoading(false)
    } catch (e) {
      if (myReq !== requestIdRef.current) return
      setError(e instanceof Error ? e.message : 'unknown error')
      setIsLoading(false)
    }
  }, [lectureIds, lectureInfoMap])

  const lectureIdsKey = JSON.stringify(lectureIds)
  useEffect(() => {
    fetchAll()
  }, [lectureIdsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    items,
    isLoading,
    error,
    refresh: fetchAll,
    totalBookmarks,
    totalWrongs,
  }
}
