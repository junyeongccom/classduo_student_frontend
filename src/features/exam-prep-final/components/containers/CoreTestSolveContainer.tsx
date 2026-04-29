/**
 * @file CoreTestSolveContainer.tsx
 * @description 핵심 테스트 풀이 컨테이너 — 사이드바 + 문항 패널 + 상단바 (51713 UI) + 백엔드 attempt 라이프사이클 (r3.1)
 * @module features/exam-prep-final/components/containers
 * @dependencies useCoreTestDetail, examPrepService(attempt), useLectures
 *
 * 흐름:
 *   1) mount: fetchCoreTestDetail + startOrResumeAttempt 동시 호출
 *   2) resumed=true 면 getAttempt 로 임시저장된 응답 복원
 *   3) 사용자가 선지 클릭 → 즉시 PATCH 임시저장
 *   4) 마지막 문항에서 onSubmit → submitAttempt → 결과 화면
 *   5) 결과 화면: 채점 + 마스터리 변동 + 'exam-prep-rewards-refresh' 이벤트 발행
 *
 * 5지선다 방어: question.options.slice(0, 4) — SolveQuestionPanel 진입 직전.
 * v1 매핑 한계 주석:
 *   detail API 응답에 question_id 가 노출되지 않아, attempt.question_ids 와의 정합은
 *   "detail.questions 의 처음 N개가 미마스터" 가정에 의존한다. 마스터 문항이 중간에
 *   섞이면 매핑이 어긋날 수 있다 — 백엔드 read API 에 question_id 노출 후 제거 가능
 *   (v2 후속 작업).
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import { useCoreTestDetail } from '../../hooks/useCoreTestDetail'
import {
  getAttempt,
  saveAttemptResponse,
  startOrResumeAttempt,
  submitAttempt,
  type CoreTestQuestionItemDto,
  type SubmitAttemptResponseDto,
} from '../../services/examPrepService'
import { SolveTopBar } from '../ui/SolveTopBar'
import { SolveSidebar } from '../ui/SolveSidebar'
import { SolveQuestionPanel } from '../ui/SolveQuestionPanel'

interface CoreTestSolveContainerProps {
  courseId: string
  testId: string
}

type Phase = 'loading' | 'solving' | 'submitting' | 'submitted' | 'error'

export function CoreTestSolveContainer({
  courseId,
  testId,
}: CoreTestSolveContainerProps) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const { courseTitle, lectures } = useLectures(courseId)
  const { data, isLoading: detailLoading, error: detailError } = useCoreTestDetail(testId)

  // attempt 라이프사이클 상태
  const [phase, setPhase] = useState<Phase>('loading')
  const [phaseError, setPhaseError] = useState<string | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  /** 백엔드 미마스터 스냅샷 (seq.asc 정렬) */
  const [attemptQuestionIds, setAttemptQuestionIds] = useState<string[]>([])
  /** seq → 0-based 선지 인덱스 */
  const [answers, setAnswers] = useState<Record<number, number>>({})
  /** seq → savedNetworkInFlight */
  const [savingSeqs, setSavingSeqs] = useState<Set<number>>(new Set())

  // 풀이 진행 상태
  const [currentSeq, setCurrentSeq] = useState(1)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [result, setResult] = useState<SubmitAttemptResponseDto | null>(null)

  // 경과 시간 타이머 (1초)
  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // attempt 시작 + (resume 시) 응답 복원
  useEffect(() => {
    let cancelled = false
    const start = async () => {
      setPhase('loading')
      setPhaseError(null)
      const { data: a, error: aerr } = await startOrResumeAttempt(testId)
      if (cancelled) return
      if (aerr || !a) {
        setPhaseError(aerr || '응시를 시작하지 못했습니다.')
        setPhase('error')
        return
      }
      setAttemptId(a.attempt_id)
      setAttemptQuestionIds(a.question_ids)

      if (a.resumed) {
        const { data: full } = await getAttempt(a.attempt_id)
        if (full && !cancelled) {
          // 응답 복원: question_id → seq 매핑이 필요. detail 로드 후에 처리.
          // 임시로 question_id 기반 map 만 저장. detail loaded effect에서 seq로 변환.
          const resumeMap: Record<string, string> = {}
          for (const r of full.responses) {
            resumeMap[r.question_id] = r.selected
          }
          ;(window as any).__examPrepResumeMap__ = resumeMap // 임시 트랜스퍼
        }
      } else {
        ;(window as any).__examPrepResumeMap__ = null
      }

      if (a.status === 'submitted') {
        // 백엔드가 in_progress 가 없으면 새로 만들어 줘야 정상이지만 방어:
        // 결과 화면으로 진입 (graded 정보 없이 빈 상태)
        setPhase('submitted')
      } else {
        setPhase('solving')
      }
    }
    start()
    return () => { cancelled = true }
  }, [testId])

  // detail 로드 후 question_id ↔ seq 매핑 + resume 응답 복원
  const seqToQuestionId = useMemo(() => {
    if (!data || attemptQuestionIds.length === 0) return new Map<number, string>()
    const ordered = [...data.questions].sort((a, b) => a.seq - b.seq)
    const map = new Map<number, string>()
    ordered.forEach((q, idx) => {
      const qid = attemptQuestionIds[idx]
      if (qid) map.set(q.seq, qid)
    })
    return map
  }, [data, attemptQuestionIds])

  const questionIdToSeq = useMemo(() => {
    const map = new Map<string, number>()
    seqToQuestionId.forEach((qid, seq) => map.set(qid, seq))
    return map
  }, [seqToQuestionId])

  // resume 시 응답 복원
  useEffect(() => {
    if (questionIdToSeq.size === 0) return
    const resumeMap = (window as any).__examPrepResumeMap__ as
      | Record<string, string>
      | null
      | undefined
    if (!resumeMap) return
    const restored: Record<number, number> = {}
    for (const [qid, selected] of Object.entries(resumeMap)) {
      const seq = questionIdToSeq.get(qid)
      if (seq != null) restored[seq] = Number(selected)
    }
    setAnswers(restored)
    ;(window as any).__examPrepResumeMap__ = null
  }, [questionIdToSeq])

  // 회차 메타
  const matchedLecture = useMemo(() => {
    if (!data) return null
    return lectures.find((l) => l.id === data.lecture_session_id) ?? null
  }, [data, lectures])

  const sessionLabel = useMemo(() => {
    if (!matchedLecture) return ''
    const w = matchedLecture.week_number
    const s = matchedLecture.session_number
    if (w == null || s == null) return ''
    return locale === 'ko'
      ? `${w}주차 ${s}차시`
      : `W${w} S${String(s).padStart(2, '0')}`
  }, [matchedLecture, locale])

  const lectureTitle = useMemo(() => {
    return (
      matchedLecture?.title ??
      data?.title ??
      matchedLecture?.essence_7words ??
      sessionLabel ??
      ''
    )
  }, [matchedLecture, data, sessionLabel])

  // 현재 문항 — 5지선다 방어로 options.slice(0, 4)
  const currentQuestion: CoreTestQuestionItemDto | null = useMemo(() => {
    if (!data) return null
    const q = data.questions.find((q) => q.seq === currentSeq) ?? null
    if (!q) return null
    return { ...q, options: (q.options ?? []).slice(0, 4) }
  }, [data, currentSeq])

  const total = data?.questions.length ?? 0
  const answeredSeqs = useMemo(
    () => new Set(Object.keys(answers).map((k) => Number(k))),
    [answers],
  )

  // 선지 선택 → 로컬 state + 즉시 임시저장
  const handleSelectChoice = (idx: number) => {
    setAnswers((prev) => ({ ...prev, [currentSeq]: idx }))
    if (!attemptId) return
    const qid = seqToQuestionId.get(currentSeq)
    if (!qid) {
      // 이 문항은 응시 대상이 아님 (마스터됨) — 임시저장 스킵
      return
    }
    setSavingSeqs((prev) => new Set(prev).add(currentSeq))
    saveAttemptResponse(attemptId, qid, String(idx)).then(({ error }) => {
      setSavingSeqs((prev) => {
        const next = new Set(prev)
        next.delete(currentSeq)
        return next
      })
      if (error) {
        console.warn('[exam-prep] 임시저장 실패:', error)
      }
    })
  }

  // 다음 문항 이동 또는 마지막 문항이면 제출
  const handleSubmit = async () => {
    if (currentSeq < total) {
      setCurrentSeq(currentSeq + 1)
      return
    }
    // 마지막 문항 — 제출 확인
    if (!attemptId) return
    const unansweredCount = attemptQuestionIds.length - Object.keys(answers).length
    if (unansweredCount > 0) {
      const ok = window.confirm(
        `아직 답하지 않은 문항이 ${unansweredCount}개 있습니다. 제출하시겠습니까?`,
      )
      if (!ok) return
    }
    setPhase('submitting')
    const { data: r, error } = await submitAttempt(attemptId)
    if (error || !r) {
      setPhaseError(error || '제출에 실패했습니다.')
      setPhase('error')
      return
    }
    setResult(r)
    setPhase('submitted')
    try {
      window.dispatchEvent(new Event('exam-prep-rewards-refresh'))
    } catch {
      /* no-op */
    }
  }

  const handleExit = () => {
    router.push(`/studyspace/course/${courseId}/exam-prep`)
  }

  // ─── 렌더 ───
  const isLoadingPhase =
    phase === 'loading' || detailLoading || (phase === 'solving' && !data)

  if (isLoadingPhase) {
    return (
      <div className="flex h-full flex-col">
        <SolveTopBar
          courseId={courseId}
          courseTitle={courseTitle}
          currentLectureLabel="..."
          onExit={handleExit}
        />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (phase === 'error' || detailError || !data) {
    return (
      <div className="flex h-full flex-col">
        <SolveTopBar
          courseId={courseId}
          courseTitle={courseTitle}
          currentLectureLabel="..."
          onExit={handleExit}
        />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-gray-500">
            {phaseError ?? detailError ?? t('examPrepFinal.solveLoadError')}
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'submitted') {
    return (
      <div className="flex h-full flex-col">
        <SolveTopBar
          courseId={courseId}
          courseTitle={courseTitle}
          currentLectureLabel={
            sessionLabel ? `${sessionLabel} · ${lectureTitle}` : lectureTitle
          }
          onExit={handleExit}
        />
        <SubmittedResultPanel
          data={data}
          result={result}
          questionIdToSeq={questionIdToSeq}
          onBack={handleExit}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <SolveTopBar
        courseId={courseId}
        courseTitle={courseTitle}
        currentLectureLabel={
          sessionLabel ? `${sessionLabel} · ${lectureTitle}` : lectureTitle
        }
        onExit={handleExit}
      />

      <div className="flex min-h-0 flex-1">
        <SolveSidebar
          sessionLabel={sessionLabel}
          lectureTitle={lectureTitle}
          total={total}
          currentSeq={currentSeq}
          answeredSeqs={answeredSeqs}
          onSelectSeq={setCurrentSeq}
          elapsedSec={elapsedSec}
        />

        {currentQuestion && (
          <SolveQuestionPanel
            question={currentQuestion}
            currentSeq={currentSeq}
            total={total}
            selectedChoice={answers[currentSeq] ?? null}
            onSelectChoice={handleSelectChoice}
            onSubmit={handleSubmit}
            onPrev={() => setCurrentSeq((s) => Math.max(1, s - 1))}
            onNext={() => setCurrentSeq((s) => Math.min(total, s + 1))}
            hasPrev={currentSeq > 1}
            hasNext={currentSeq < total}
          />
        )}
      </div>
    </div>
  )
}

/* ──────────────────────────────────────── */
/*  결과 화면                                  */
/* ──────────────────────────────────────── */

function SubmittedResultPanel({
  data,
  result,
  questionIdToSeq,
  onBack,
}: {
  data: { questions: CoreTestQuestionItemDto[]; lecture_no: number; title: string | null }
  result: SubmitAttemptResponseDto | null
  questionIdToSeq: Map<string, number>
  onBack: () => void
}) {
  const correctCount = result?.graded.filter((g) => g.is_correct).length ?? 0
  const newMasters = result?.graded.filter((g) => g.first_master_transition).length ?? 0
  const totalAnswered = result?.graded.length ?? 0
  const xpFromMaster = newMasters * 10
  const stampGranted = !!result?.submitted_at

  // graded → seq 매핑 (사용자가 답한 문항만 풀이 결과 표시)
  const seqToGraded = useMemo(() => {
    const m = new Map<number, NonNullable<SubmitAttemptResponseDto['graded']>[number]>()
    if (result) {
      for (const g of result.graded) {
        const seq = questionIdToSeq.get(g.question_id)
        if (seq != null) m.set(seq, g)
      }
    }
    return m
  }, [result, questionIdToSeq])

  const orderedQuestions = useMemo(
    () => [...data.questions].sort((a, b) => a.seq - b.seq),
    [data.questions],
  )

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F7F8] dark:bg-gray-950">
      <div className="mx-auto max-w-3xl px-8 py-10">
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
          {orderedQuestions.map((q) => {
            const g = seqToGraded.get(q.seq)
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
    </div>
  )
}
