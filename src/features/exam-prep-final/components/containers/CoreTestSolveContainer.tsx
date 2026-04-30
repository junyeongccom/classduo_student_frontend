/**
 * @file CoreTestSolveContainer.tsx
 * @description core/mid/final 풀이 공용 컨테이너 — 명칭은 historical naming. test_type 분기 코드 추가 금지 (b2b20260430 §FR-5)
 * @module features/exam-prep-final/components/containers
 * @dependencies useCoreTestDetail, examPrepService, useLectures
 *
 * 사용자 정책 (b2b20260429 r4):
 *   1) 매 문항 [제출] → 즉시 채점 (백엔드 grade endpoint) → 정오답 즉시 표시 → 자동 다음 문항
 *   2) 같은 문항 두 번 풀이 불가 (백엔드 409로 거부, 프론트도 disable)
 *   3) 15문항 모두 채점 완료 시 결과 화면 → [다시풀기] / [나가기]
 *   4) [다시풀기] = 새 attempt 자동 생성 (start_or_resume 가 in_progress 없으면 신규)
 *   5) 힌트: 20초 후 활성, 클릭 시 오답 1개 disable, hint_used=true 응답은 mastery 동결
 *   6) 한 번 master 도달한 문항은 강등 없음 (백엔드 derive_state ever_mastered 잠금)
 *
 * b2b20260430 §G18: 본 컨테이너는 mid/final 풀이도 공용으로 사용된다 (test_id 만으로 동작).
 *   분기 코드 추가 금지. attempt.submit 응답의 gate 결과는 ExamPrepRewardWidget 으로 전달.
 */

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import { useCoreTestDetail } from '../../hooks/useCoreTestDetail'
import {
  startOrResumeAttempt,
  getAttempt,
  gradeAttemptResponse,
  fetchTestMasterySummary,
  type AttemptResponseItemDto,
  type CoreTestQuestionItemDto,
  type GradeSingleResponseDto,
} from '../../services/examPrepService'
import { SolveTopBar } from '../ui/SolveTopBar'
import { SolveSidebar } from '../ui/SolveSidebar'
import { SolveQuestionPanel } from '../ui/SolveQuestionPanel'
import { SolveResultPanel } from '../ui/SolveResultPanel'

interface CoreTestSolveContainerProps {
  courseId: string
  testId: string
}

type Phase = 'loading' | 'solving' | 'completed' | 'error'

/** mastery state 카운트 — 화면 상단 16/2/0 도트 갱신용 */
interface MasterySummary {
  learning: number
  skilled: number
  master: number
}

export function CoreTestSolveContainer({
  courseId,
  testId,
}: CoreTestSolveContainerProps) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const { courseTitle, lectures } = useLectures(courseId)
  const { data, isLoading: detailLoading, error: detailError } = useCoreTestDetail(testId)

  // ─── attempt 라이프사이클 ───
  const [phase, setPhase] = useState<Phase>('loading')
  const [phaseError, setPhaseError] = useState<string | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  /** 백엔드 미마스터 스냅샷 (seq.asc 정렬 매핑) */
  const [attemptQuestionIds, setAttemptQuestionIds] = useState<string[]>([])
  /** restart 카운터 — useEffect 의존성으로 사용해 강제 재시작 */
  const [restartTrigger, setRestartTrigger] = useState(0)

  // ─── 풀이 상태 (seq 기반) ───
  /** 학생이 선택한 옵션 (0-based 인덱스) — 즉시 채점 후 disable */
  const [selectedBySeq, setSelectedBySeq] = useState<Record<number, number>>({})
  /** 채점 결과 (seq → GradeSingleResponseDto) — 정오답 + mastery 변동 */
  const [gradedBySeq, setGradedBySeq] = useState<
    Record<number, GradeSingleResponseDto>
  >({})
  /** 힌트 사용한 문항 — 백엔드에 hint_used=true 로 전달 */
  const [hintUsedSeqs, setHintUsedSeqs] = useState<Set<number>>(new Set())
  /** 힌트로 disable된 옵션 (seq → option index) */
  const [hintDisabledBySeq, setHintDisabledBySeq] = useState<
    Record<number, number>
  >({})
  /** 이어풀기용 서버 응답 스냅샷 — seq 매핑 + data 로드 완료 시 1회 복원 후 null */
  const [resumeResponses, setResumeResponses] = useState<
    AttemptResponseItemDto[] | null
  >(null)

  // ─── UI 상태 ───
  const [currentSeq, setCurrentSeq] = useState(1)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [isGrading, setIsGrading] = useState(false)
  const [masterySummary, setMasterySummary] = useState<MasterySummary>({
    learning: 0,
    skilled: 0,
    master: 0,
  })
  /** 문항별 mastery state 맵 (question_id → 'learning'|'skilled'|'master'). 풀이 페이지 진입
   *  시 mastery_summary.by_question 으로 초기화, grade 응답마다 new_state 로 갱신. */
  const [byQuestionState, setByQuestionState] = useState<Record<string, string>>(
    {},
  )

  // 경과 시간 타이머
  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // ─── 풀이 페이지 진입 시 mastery summary 초기 동기화 (b2b20260429 r4) ───
  // 백엔드의 누적 mastery 카운트를 가져와 초기 Learning/Skilled/Master 값으로 설정.
  // 이번 attempt 의 채점 변동분은 grade endpoint 응답으로 prev→new 상태 차이만큼 +/-.
  // restartTrigger 가 변경될 때(다시풀기) 다시 fetch 하여 누적 mastery 가 반영되도록.
  useEffect(() => {
    let cancelled = false
    fetchTestMasterySummary(testId).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        console.warn('[Solve] mastery summary fetch failed:', error)
        return
      }
      if (data) {
        setMasterySummary({
          learning: data.summary.learning,
          skilled: data.summary.skilled,
          master: data.summary.master,
        })
        setByQuestionState(data.by_question ?? {})
      }
    })
    return () => {
      cancelled = true
    }
  }, [testId, restartTrigger])

  // ─── attempt 시작 / 이어풀기 / 다시풀기 ───
  useEffect(() => {
    let cancelled = false
    const start = async () => {
      setPhase('loading')
      setPhaseError(null)
      // 다시풀기 트리거 시 로컬 상태 초기화
      setSelectedBySeq({})
      setGradedBySeq({})
      setHintUsedSeqs(new Set())
      setHintDisabledBySeq({})
      setResumeResponses(null)
      setCurrentSeq(1)
      setElapsedSec(0)

      const { data: a, error: aerr } = await startOrResumeAttempt(testId)
      if (cancelled) return
      if (aerr || !a) {
        setPhaseError(aerr || '응시를 시작하지 못했습니다.')
        setPhase('error')
        return
      }
      setAttemptId(a.attempt_id)
      setAttemptQuestionIds(a.question_ids)

      // resume 시 기존 채점된 응답 복원 — 사이드채널(window) 대신 state 로 보관해
      // seq 매핑 + data 로드 완료 시점과의 race 를 effect 의존성으로 해소.
      if (a.resumed) {
        const { data: full } = await getAttempt(a.attempt_id)
        if (cancelled) return
        if (full) setResumeResponses(full.responses)
      }

      // 이미 submitted 상태라면 결과 화면으로
      if (a.status === 'submitted') {
        setPhase('completed')
      } else {
        setPhase('solving')
      }
    }
    start()
    return () => {
      cancelled = true
    }
  }, [testId, restartTrigger])

  // detail 로 부터 seq → question_id 직접 매핑 (모든 15문항 — 마스터 포함).
  // 이전 구현은 attemptQuestionIds(미마스터만) 와 인덱스 매칭하여 마스터 문항을 lookup
  // 할 수 없었음. data.questions[].id 사용으로 마스터/미마스터 무관 mastery_summary
  // 와 매핑 가능.
  const seqToQuestionId = useMemo(() => {
    if (!data) return new Map<number, string>()
    const map = new Map<number, string>()
    data.questions.forEach((q) => {
      if (q.id) map.set(q.seq, q.id)
    })
    return map
  }, [data])

  // resume 응답 복원: 비활성화 (사용자 정책 변경 — Master 가 아닌 문항은 매 진입 시
  // 빈 상태로 다시 풀 수 있어야 한다). Master 문항은 SolveQuestionPanel 의 isMasterLocked
  // 분기가 graded === null + currentQuestionState === 'master' 조건만으로 정답을
  // 노출하므로 별도 복원 불필요. 이전 응답 효과 차감은 백엔드 grading_service 가
  // apply_single_grading_with_replacement 헬퍼로 처리.
  useEffect(() => {
    // resumeResponses 가 도착하면 즉시 폐기 — 향후 grade 호출 시 백엔드가 이전 응답을
    // 기준으로 mastery 차감 후 재적용하므로 프론트는 빈 상태로 시작.
    if (resumeResponses) {
      setResumeResponses(null)
    }
  }, [resumeResponses])

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

  // 현재 문항 — 4지선다 보장
  const currentQuestion: CoreTestQuestionItemDto | null = useMemo(() => {
    if (!data) return null
    const q = data.questions.find((q) => q.seq === currentSeq) ?? null
    if (!q) return null
    return { ...q, options: (q.options ?? []).slice(0, 4) }
  }, [data, currentSeq])

  const total = data?.questions.length ?? 0
  const answeredSeqs = useMemo(
    () => new Set(Object.keys(gradedBySeq).map((k) => Number(k))),
    [gradedBySeq],
  )

  // 모든 문항 채점 완료 — 자동 전환 X. [다음] 버튼 클릭 시에만 결과 화면으로.
  // gamification 위젯은 마지막 채점 시점에 한 번만 새로고침 신호.
  const allGradedRef = useRef(false)
  useEffect(() => {
    if (phase !== 'solving') return
    const allGraded = total > 0 && Object.keys(gradedBySeq).length >= total
    if (allGraded && !allGradedRef.current) {
      allGradedRef.current = true
      window.dispatchEvent(new Event('exam-prep-rewards-refresh'))
    }
    if (!allGraded) {
      allGradedRef.current = false
    }
  }, [gradedBySeq, total, phase])

  // ─── 액션: 선지 선택 (채점 전) ───
  const handleSelectChoice = useCallback(
    (idx: number) => {
      if (gradedBySeq[currentSeq]) return  // 이미 채점된 문항은 선택 변경 X
      setSelectedBySeq((prev) => ({ ...prev, [currentSeq]: idx }))
    },
    [currentSeq, gradedBySeq],
  )

  // ─── 액션: 힌트 클릭 → 오답 1개 random disable ───
  const handleHintClick = useCallback(() => {
    if (gradedBySeq[currentSeq]) return  // 채점된 문항은 무시
    if (hintDisabledBySeq[currentSeq] != null) return  // 이미 힌트 사용
    if (!currentQuestion) return
    const correctIdx = parseInt(currentQuestion.answer, 10)
    const wrongOptions = currentQuestion.options
      .map((_, i) => i)
      .filter((i) => i !== correctIdx)
    if (wrongOptions.length === 0) return
    const pickIdx = wrongOptions[Math.floor(Math.random() * wrongOptions.length)]
    setHintDisabledBySeq((prev) => ({ ...prev, [currentSeq]: pickIdx }))
    setHintUsedSeqs((prev) => {
      const next = new Set(prev)
      next.add(currentSeq)
      return next
    })
    // 학생이 disable된 선지를 선택했었다면 해제
    setSelectedBySeq((prev) => {
      if (prev[currentSeq] === pickIdx) {
        const { [currentSeq]: _drop, ...rest } = prev
        return rest
      }
      return prev
    })
  }, [currentSeq, currentQuestion, gradedBySeq, hintDisabledBySeq])

  // ─── 액션: 제출 → 즉시 채점 ───
  const handleSubmit = useCallback(async () => {
    if (!attemptId || isGrading) return
    if (gradedBySeq[currentSeq]) return  // 이미 채점됨
    const selected = selectedBySeq[currentSeq]
    if (selected == null) return
    const qid = seqToQuestionId.get(currentSeq)
    if (!qid) {
      // 매핑 안된 문항 (마스터된 문항) — 채점 대상 아님. 다음 문항으로 이동만.
      goNext()
      return
    }

    setIsGrading(true)
    const hintUsed = hintUsedSeqs.has(currentSeq)
    const { data: result, error, errorCode } = await gradeAttemptResponse(
      attemptId,
      qid,
      String(selected),
      hintUsed,
    )
    setIsGrading(false)

    if (error || !result) {
      if (errorCode === 'RESPONSE_ALREADY_GRADED') {
        // 동일 attempt 안에서 이미 채점된 문항은 백엔드가 ever_mastered=True 일 때만
        // 거부하므로, 사실상 마스터 도달한 문항. 무시.
        console.warn('[Solve] response already graded — skipping')
      } else if (errorCode === 'ATTEMPT_NOT_IN_PROGRESS') {
        // 이전 grade 호출에서 attempt 가 auto-submit 되었거나, 다른 탭에서 이미 종료된
        // attempt — 새 attempt 시작 (다시풀기 와 동일 흐름). 사용자가 답변하지 않은
        // 문항을 다시 풀 수 있게 됨.
        console.warn('[Solve] attempt already submitted — auto-restarting')
        setPhaseError('이전 응시가 완료되어 새 응시를 시작합니다.')
        setRestartTrigger((r) => r + 1)
      } else {
        console.error('[Solve] grade failed:', error)
        setPhaseError(error || '채점 중 오류가 발생했습니다')
      }
      return
    }

    setGradedBySeq((prev) => ({ ...prev, [currentSeq]: result }))

    // 문항별 mastery state 갱신 — Issue 2/3 의 현재 문항 상태 표시 데이터 소스
    if (qid) {
      setByQuestionState((prev) => ({
        ...prev,
        [qid]: result.mastery.new_state,
      }))
    }

    // mastery summary 갱신 (백엔드 응답 기반 변동)
    const m = result.mastery
    if (!hintUsed) {
      setMasterySummary((prev) => {
        const next = { ...prev }
        // previous_state -1, new_state +1 (단, 같으면 영향 X)
        if (m.previous_state !== m.new_state) {
          if (m.previous_state === 'learning') next.learning = Math.max(0, next.learning - 1)
          if (m.previous_state === 'skilled') next.skilled = Math.max(0, next.skilled - 1)
          if (m.previous_state === 'master') next.master = Math.max(0, next.master - 1)
          if (m.new_state === 'learning') next.learning += 1
          if (m.new_state === 'skilled') next.skilled += 1
          if (m.new_state === 'master') next.master += 1
        }
        return next
      })
    }
    // 자동 이동 없음 — 사용자가 [다음] 버튼을 눌러야 이동.
  }, [
    attemptId,
    isGrading,
    gradedBySeq,
    selectedBySeq,
    currentSeq,
    seqToQuestionId,
    hintUsedSeqs,
  ])

  const goNext = useCallback(() => {
    setCurrentSeq((s) => Math.min(total, s + 1))
  }, [total])

  /** [다음] 버튼 동작:
   *  - 다음 문항(seq+1) 이 있으면 단순 이동
   *  - 마지막 문항이고 모든 문항이 채점됐으면 결과 화면으로 전환
   *  - 그 외 (마지막 문항이지만 미채점 문항 남아있음) → 미채점 문항으로 이동
   */
  const handleNext = useCallback(() => {
    const allGraded = Object.keys(gradedBySeq).length >= total
    // 마지막 문항이면 결과 또는 미채점 문항 점프
    if (currentSeq >= total) {
      if (allGraded) {
        setPhase('completed')
        return
      }
      // 미채점 문항이 있으면 그쪽으로
      const allSeqs = Array.from({ length: total }, (_, i) => i + 1)
      const remaining = allSeqs.filter((s) => !gradedBySeq[s])
      if (remaining.length > 0) setCurrentSeq(remaining[0])
      return
    }
    setCurrentSeq((s) => Math.min(total, s + 1))
  }, [currentSeq, total, gradedBySeq])

  const handleExit = useCallback(() => {
    router.push(`/studyspace/course/${courseId}/exam-prep`)
  }, [router, courseId])

  const handleRestart = useCallback(() => {
    // restart 트리거 — startOrResumeAttempt 가 새 attempt 생성 (이전이 submitted 상태이므로)
    setRestartTrigger((r) => r + 1)
  }, [])

  // ─── 렌더 ───
  if (phase === 'loading' || detailLoading) {
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
            {phaseError || detailError || t('examPrepFinal.solveLoadError')}
          </p>
        </div>
      </div>
    )
  }

  // ─── 결과 화면 ───
  if (phase === 'completed') {
    const correctCount = Object.values(gradedBySeq).filter(
      (g) => g.is_correct,
    ).length
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
        <SolveResultPanel
          total={total}
          correctCount={correctCount}
          masterySummary={masterySummary}
          gradedBySeq={gradedBySeq}
          questions={data.questions}
          onRestart={handleRestart}
          onExit={handleExit}
        />
      </div>
    )
  }

  // ─── 풀이 화면 ───
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
          onSelectSeq={(seq) => setCurrentSeq(seq)}
          elapsedSec={elapsedSec}
        />

        {currentQuestion && (
          <SolveQuestionPanel
            question={currentQuestion}
            currentSeq={currentSeq}
            total={total}
            selectedChoice={selectedBySeq[currentSeq] ?? null}
            graded={gradedBySeq[currentSeq] ?? null}
            hintDisabledOption={hintDisabledBySeq[currentSeq] ?? null}
            isGrading={isGrading}
            masterySummary={masterySummary}
            currentQuestionState={
              (byQuestionState[seqToQuestionId.get(currentSeq) ?? ''] as
                | 'learning'
                | 'skilled'
                | 'master'
                | undefined) ?? null
            }
            onSelectChoice={handleSelectChoice}
            onSubmit={handleSubmit}
            onHint={handleHintClick}
            onPrev={() => setCurrentSeq((s) => Math.max(1, s - 1))}
            onNext={handleNext}
            hasPrev={currentSeq > 1}
            // 마지막 문항 + 모두 채점됨 → 결과 화면으로 갈 수 있으므로 활성화
            hasNext={
              currentSeq < total ||
              Object.keys(gradedBySeq).length >= total
            }
          />
        )}
      </div>
    </div>
  )
}
