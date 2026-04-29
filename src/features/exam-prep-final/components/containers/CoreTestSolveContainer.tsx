/**
 * @file CoreTestSolveContainer.tsx
 * @description 핵심 테스트 풀이 컨테이너 — attempt 시작 → 4지선다 풀이 → 임시저장 → 제출 → 결과
 * @module features/exam-prep-final/components/containers
 * @dependencies examPrepService
 *
 * 흐름:
 *   1) mount 시 백엔드 test 상세 + attempt(start_or_resume) 동시 호출
 *   2) 사용자가 선지 클릭 → 즉시 PATCH 임시저장 (디바운스 X — 단답이라 즉시 OK)
 *   3) 모든 응답 채워지면 제출 버튼 활성화
 *   4) 제출 → 채점 결과 표시 + gamification 위젯 갱신 이벤트 발행
 *
 * 5지선다 백엔드 응답 보호: 5번째 선지가 들어와도 옵션 0~3만 표시.
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Lightbulb } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import {
  getCoreTestDetail,
  getAttempt,
  saveAttemptResponse,
  startOrResumeAttempt,
  submitAttempt,
  type CoreTestDetailResponse,
  type CoreTestQuestionItem,
  type SubmitAttemptResponse,
} from '../../services/examPrepService'

interface CoreTestSolveContainerProps {
  courseId: string
  testId: string
}

type Phase = 'loading' | 'solving' | 'submitting' | 'submitted' | 'error'

export function CoreTestSolveContainer({
  courseId,
  testId,
}: CoreTestSolveContainerProps) {
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [detail, setDetail] = useState<CoreTestDetailResponse | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  /** 응시에 포함된 question_id 순서 (백엔드의 미마스터 스냅샷). detail은 seq순 전체 문항. */
  const [attemptQuestionIds, setAttemptQuestionIds] = useState<string[]>([])
  /** question_id → selected ("0"~"3") */
  const [responses, setResponses] = useState<Record<string, string>>({})
  const [savingFor, setSavingFor] = useState<Record<string, boolean>>({})
  const [hintOpen, setHintOpen] = useState<Record<number, boolean>>({})

  const [result, setResult] = useState<SubmitAttemptResponse | null>(null)

  // 초기 로드: detail + attempt
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setPhase('loading')
      setErrorMsg(null)

      const [{ data: d, error: derr }, { data: a, error: aerr }] = await Promise.all([
        getCoreTestDetail(testId),
        startOrResumeAttempt(testId),
      ])
      if (cancelled) return

      if (derr || !d) {
        setErrorMsg(derr || '테스트를 불러오지 못했습니다.')
        setPhase('error')
        return
      }
      setDetail(d)

      if (aerr || !a) {
        setErrorMsg(aerr || '응시를 시작하지 못했습니다.')
        setPhase('error')
        return
      }
      setAttemptId(a.attempt_id)
      setAttemptQuestionIds(a.question_ids)

      // resume 시 임시저장 응답 복원
      if (a.resumed) {
        const { data: full } = await getAttempt(a.attempt_id)
        if (full && !cancelled) {
          const map: Record<string, string> = {}
          for (const r of full.responses) {
            map[r.question_id] = r.selected
          }
          setResponses(map)
        }
      }

      if (a.status === 'submitted') {
        // 이미 제출된 attempt — 결과 화면으로 바로 진입
        // (기획상 미마스터만 스냅샷이라 새 in_progress가 만들어져야 정상이지만 방어)
        setPhase('submitted')
      } else {
        setPhase('solving')
      }
    }
    load()
    return () => { cancelled = true }
  }, [testId])

  // detail 의 모든 문항을 seq 순으로 사용. attempt에 포함된 것만 풀이 가능.
  const orderedQuestions = useMemo(() => {
    if (!detail) return [] as CoreTestQuestionItem[]
    return [...detail.questions].sort((a, b) => a.seq - b.seq)
  }, [detail])

  // detail 응답에는 question_id가 빠져 있으나 attempt.question_ids는 seq 순 정렬과 매핑된다고 가정.
  // 실제로 백엔드 attempt_service._fetch_question_ids_in_order 가 seq.asc로 조회하므로 안전.
  const seqToQuestionId = useMemo(() => {
    const map = new Map<number, string>()
    orderedQuestions.forEach((q, idx) => {
      const qid = attemptQuestionIds[idx]
      if (qid) map.set(q.seq, qid)
    })
    return map
  }, [orderedQuestions, attemptQuestionIds])

  // 5지선다 방어: 항상 처음 4개 선지만 노출
  const visibleOptions = (q: CoreTestQuestionItem): string[] =>
    (q.options || []).slice(0, 4)

  const allAnswered = attemptQuestionIds.length > 0 &&
    attemptQuestionIds.every((qid) => Boolean(responses[qid]))

  const handleSelect = async (
    questionId: string,
    optionIndex: number,
  ) => {
    if (!attemptId) return
    if (phase !== 'solving') return
    const value = String(optionIndex)
    setResponses((prev) => ({ ...prev, [questionId]: value }))
    setSavingFor((p) => ({ ...p, [questionId]: true }))
    const { error } = await saveAttemptResponse(attemptId, questionId, value)
    setSavingFor((p) => ({ ...p, [questionId]: false }))
    if (error) {
      // 임시저장 실패 시 사용자에게 alert (작은 토스트 시스템 없으므로 간단히)
      console.warn('[exam-prep] 임시저장 실패:', error)
    }
  }

  const handleSubmit = async () => {
    if (!attemptId) return
    if (!allAnswered) {
      // 일부만 답해도 제출 가능하지만 가드: confirm
      const ok = window.confirm(
        '아직 답하지 않은 문항이 있습니다. 제출하시겠습니까?',
      )
      if (!ok) return
    }
    setPhase('submitting')
    const { data, error } = await submitAttempt(attemptId)
    if (error || !data) {
      setErrorMsg(error || '제출에 실패했습니다.')
      setPhase('error')
      return
    }
    setResult(data)
    setPhase('submitted')

    // 우상단 도장/XP/계급 위젯 갱신 트리거
    try {
      window.dispatchEvent(new Event('exam-prep-rewards-refresh'))
    } catch {
      /* no-op */
    }
  }

  return (
    <>
      <StudyspaceTopbarSlot>
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Link
            href="/studyspace/home"
            className="transition-colors hover:text-[#6366F1]"
          >
            홈
          </Link>
          <span>/</span>
          <Link
            href={`/studyspace/course/${courseId}`}
            className="transition-colors hover:text-[#6366F1]"
          >
            과목
          </Link>
          <span>/</span>
          <Link
            href={`/studyspace/course/${courseId}/exam-prep`}
            className="transition-colors hover:text-[#6366F1]"
          >
            기말 대비 학습
          </Link>
          <span>/</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {detail?.lecture_no
              ? `${detail.lecture_no}회차 핵심 테스트`
              : '핵심 테스트'}
          </span>
        </nav>
      </StudyspaceTopbarSlot>

      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <button
            type="button"
            onClick={() => router.push(`/studyspace/course/${courseId}/exam-prep`)}
            className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
          >
            <ChevronLeft className="h-4 w-4" /> 목록으로
          </button>

          {phase === 'loading' && (
            <p className="text-gray-500">불러오는 중…</p>
          )}

          {phase === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
              {errorMsg ?? '오류가 발생했습니다.'}
            </div>
          )}

          {(phase === 'solving' || phase === 'submitting') && detail && (
            <>
              <header className="mb-8">
                <p className="text-sm font-medium text-[#6366F1]">
                  {detail.lecture_no}회차 핵심 테스트
                </p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-50">
                  {detail.title ?? '핵심 테스트'}
                </h1>
                <p className="mt-2 text-sm text-gray-500">
                  총 {orderedQuestions.length}문항 · 응시 대상{' '}
                  {attemptQuestionIds.length}문항 (이미 마스터한 문항은 제외)
                </p>
              </header>

              <div className="flex flex-col gap-8">
                {orderedQuestions.map((q) => {
                  const qid = seqToQuestionId.get(q.seq)
                  const inAttempt = !!qid
                  const selected = qid ? responses[qid] : undefined
                  return (
                    <article
                      key={q.seq}
                      className={cn(
                        'rounded-2xl border bg-white px-6 py-6 shadow-sm dark:bg-gray-900',
                        inAttempt
                          ? 'border-gray-200 dark:border-gray-700'
                          : 'border-dashed border-gray-200 opacity-60 dark:border-gray-700',
                      )}
                    >
                      <div className="mb-4 flex items-baseline justify-between gap-3">
                        <p className="text-base font-semibold text-gray-900 dark:text-gray-50">
                          <span className="mr-2 text-[#6366F1]">
                            Q{q.seq}.
                          </span>
                          {q.stem}
                        </p>
                        {!inAttempt && (
                          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            마스터됨
                          </span>
                        )}
                      </div>

                      {q.hint && inAttempt && (
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={() =>
                              setHintOpen((p) => ({ ...p, [q.seq]: !p[q.seq] }))
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                          >
                            <Lightbulb className="h-3.5 w-3.5" />
                            {hintOpen[q.seq] ? '힌트 숨기기' : '힌트 보기'}
                          </button>
                          {hintOpen[q.seq] && (
                            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
                              {q.hint}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        {visibleOptions(q).map((opt, idx) => {
                          const value = String(idx)
                          const isSelected = selected === value
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={!inAttempt || phase !== 'solving'}
                              onClick={() => qid && handleSelect(qid, idx)}
                              className={cn(
                                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
                                isSelected
                                  ? 'border-[#6366F1] bg-[#6366F1]/10 text-gray-900 dark:text-gray-50'
                                  : 'border-gray-200 hover:border-[#6366F1]/40 hover:bg-gray-50 dark:border-gray-700',
                                (!inAttempt || phase !== 'solving') && 'cursor-not-allowed opacity-70',
                              )}
                            >
                              <span
                                className={cn(
                                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                                  isSelected
                                    ? 'bg-[#6366F1] text-white'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
                                )}
                              >
                                {idx + 1}
                              </span>
                              <span className="flex-1">{opt}</span>
                            </button>
                          )
                        })}
                      </div>

                      {qid && savingFor[qid] && (
                        <p className="mt-2 text-xs text-gray-400">저장 중…</p>
                      )}
                    </article>
                  )
                })}
              </div>

              <div className="mt-10 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  {Object.keys(responses).length} / {attemptQuestionIds.length} 문항 응답
                </p>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={phase === 'submitting'}
                  className="rounded-xl bg-[#6366F1] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#5558E6] disabled:opacity-60"
                >
                  {phase === 'submitting' ? '제출 중…' : '제출하기'}
                </button>
              </div>
            </>
          )}

          {phase === 'submitted' && (
            <SubmittedResultPanel
              detail={detail}
              attemptQuestionIds={attemptQuestionIds}
              result={result}
              onBack={() =>
                router.push(`/studyspace/course/${courseId}/exam-prep`)
              }
            />
          )}
        </div>
      </div>
    </>
  )
}

/* ──────────────────────────────────────── */
/*  결과 화면                                  */
/* ──────────────────────────────────────── */

function SubmittedResultPanel({
  detail,
  attemptQuestionIds,
  result,
  onBack,
}: {
  detail: CoreTestDetailResponse | null
  attemptQuestionIds: string[]
  result: SubmitAttemptResponse | null
  onBack: () => void
}) {
  const totalAnswered = attemptQuestionIds.length
  const correctCount =
    result?.graded.filter((g) => g.is_correct).length ?? 0
  const newMasters =
    result?.graded.filter((g) => g.first_master_transition).length ?? 0
  const xpFromMaster = newMasters * 10
  const stampGranted = !!result?.submitted_at // 일일 cap은 백엔드에서 처리

  // graded → 결과 매핑
  const gradedMap = useMemo(() => {
    const m = new Map<string, NonNullable<SubmitAttemptResponse['graded']>[number]>()
    if (result) for (const g of result.graded) m.set(g.question_id, g)
    return m
  }, [result])

  // detail.questions 의 seq 순서대로 보여주되, attempt에 포함된 것만 채점 결과 표시
  const seqToQuestionId = useMemo(() => {
    const map = new Map<number, string>()
    if (!detail) return map
    const ordered = [...detail.questions].sort((a, b) => a.seq - b.seq)
    ordered.forEach((q, idx) => {
      const qid = attemptQuestionIds[idx]
      if (qid) map.set(q.seq, qid)
    })
    return map
  }, [detail, attemptQuestionIds])

  return (
    <div>
      <header className="mb-8 rounded-3xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] px-7 py-7 text-white shadow-md">
        <p className="text-sm uppercase tracking-wider opacity-80">제출 완료</p>
        <h1 className="mt-2 text-3xl font-black">
          {correctCount} / {totalAnswered} 정답
        </h1>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
            <p className="opacity-80">획득 XP</p>
            <p className="mt-1 text-lg font-bold">
              +{xpFromMaster + (stampGranted ? 20 : 0)}
              <span className="ml-1 text-xs font-normal opacity-80">
                {stampGranted && '(도장 +20'}
                {stampGranted && newMasters > 0 && ` · 마스터 +${xpFromMaster}`}
                {!stampGranted && newMasters > 0 && `마스터 +${xpFromMaster}`}
                {(stampGranted || newMasters > 0) && ')'}
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
            <p className="opacity-80">새로 마스터한 문항</p>
            <p className="mt-1 text-lg font-bold">{newMasters}개</p>
          </div>
        </div>
        {result?.test_mastered_now && (
          <p className="mt-4 rounded-lg bg-amber-300/30 px-3 py-2 text-sm font-semibold">
            🎉 이 회차 핵심 테스트의 모든 문항을 마스터했어요!
          </p>
        )}
      </header>

      <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-gray-50">
        문항별 결과
      </h2>
      <div className="flex flex-col gap-4">
        {detail &&
          [...detail.questions]
            .sort((a, b) => a.seq - b.seq)
            .map((q) => {
              const qid = seqToQuestionId.get(q.seq)
              const g = qid ? gradedMap.get(qid) : null
              const correctIdx = Number(q.answer)
              const opts = (q.options || []).slice(0, 4)
              return (
                <article
                  key={q.seq}
                  className={cn(
                    'rounded-2xl border bg-white px-5 py-4 dark:bg-gray-900',
                    g
                      ? g.is_correct
                        ? 'border-emerald-200'
                        : 'border-red-200'
                      : 'border-gray-200 opacity-70 dark:border-gray-700',
                  )}
                >
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    <span className="mr-2 text-[#6366F1]">Q{q.seq}.</span>
                    {q.stem}
                  </p>
                  {!g && (
                    <p className="mt-2 text-xs text-gray-500">
                      이 회차에서 이미 마스터한 문항이라 응시 대상에서 제외됨
                    </p>
                  )}
                  {g && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className={cn(
                            'inline-flex h-6 items-center rounded-full px-2 text-xs font-bold',
                            g.is_correct
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800',
                          )}
                        >
                          {g.is_correct ? '정답' : '오답'}
                        </span>
                        <span className="text-gray-700 dark:text-gray-200">
                          내 선택: {Number(g.selected) + 1}번 · 정답:{' '}
                          {correctIdx + 1}번
                        </span>
                      </div>
                      {opts.map((opt, idx) => (
                        <p
                          key={idx}
                          className={cn(
                            'rounded-lg border px-3 py-2 text-sm',
                            idx === correctIdx
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                              : Number(g.selected) === idx
                                ? 'border-red-400 bg-red-50 text-red-900'
                                : 'border-gray-100 text-gray-700 dark:border-gray-700 dark:text-gray-300',
                          )}
                        >
                          <span className="mr-2 font-bold">{idx + 1}.</span>
                          {opt}
                        </p>
                      ))}
                      {q.explanation?.[`opt${correctIdx}`] && (
                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                          <span className="mr-1 font-semibold">해설:</span>
                          {q.explanation[`opt${correctIdx}`]}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        진전도: {g.previous_state} → {g.new_state}
                        {g.first_master_transition && (
                          <span className="ml-1 font-bold text-amber-700">
                            (Master 진입! +10 XP)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </article>
              )
            })}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl bg-[#6366F1] px-6 py-3 text-sm font-bold text-white hover:bg-[#5558E6]"
        >
          기말 대비 학습으로 돌아가기
        </button>
      </div>
    </div>
  )
}
