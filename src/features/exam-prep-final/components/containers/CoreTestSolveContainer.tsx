/**
 * @file CoreTestSolveContainer.tsx
 * @description core/mid/final 풀이 공용 컨테이너 — 명칭은 historical naming. test_type 분기 코드 추가 금지 (b2b20260430 §FR-5)
 * @module features/exam-prep-final/components/containers
 * @dependencies useCoreTestDetail, examPrepService, useLectures
 *
 * 사용자 정책 (b2b20260429 r4):
 *   1) 매 문항 [제출] → 즉시 채점 (백엔드 grade endpoint) → 정오답 즉시 표시 → 자동 다음 문항
 *   2) 같은 문항 두 번 풀이 불가 (백엔드 409로 거부, 프론트도 disable)
 *   3) 전 문항 채점 완료 시 결과 화면 → [다시풀기] / [나가기] (core=10, mid=가변, final=15)
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
import { Loader2, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import { useLectureDetail } from '@/features/lecture-study/hooks/useLectureDetail'
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
import { ContentScaledCanvas } from '../ui/ContentScaledCanvas'
import { SolveSidebar } from '../ui/SolveSidebar'
import { SolveQuestionPanel } from '../ui/SolveQuestionPanel'
import { PayloadQuestionPanel } from '../ui/PayloadQuestionPanel'
import { ExamPrepChatPanel } from '../ui/ExamPrepChatPanel'
import { TestEndOverlay } from '../result-overlay/TestEndOverlay'
import { Phase5FinalResult } from '../result-overlay/Phase5FinalResult'
import type { FinalResultData, MasteryState, PreSnapshot } from '../result-overlay/types'
import {
  getKstTodayIso,
  deriveRankFromXp,
} from '../result-overlay/utils'
import { fetchMyCourseState } from '@/shared/services/gamificationService'
import { fetchCourseAttemptCounts } from '../../services/examPrepService'
import { LeftPanelMaterials } from '@/features/lecture-study/components/containers/LeftPanelMaterials'
import { LeftPanelRecordings } from '@/features/lecture-study/components/ui/LeftPanelRecordings'
import { useExamPrepSolveStore } from '../../store/useExamPrepSolveStore'
import { useLectureStudyStore } from '@/features/lecture-study/store/useLectureStudyStore'
import {
  toggleBookmark,
  getBookmarksByLectureIds,
} from '@/features/my-quiz/services/myQuizStatusService'

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

  // ─── 우측 통합 패널(출처+챗봇 2탭) 활성 탭 — null=닫힘 (UI 순간 상태) ───
  const [rightTab, setRightTab] = useState<'materials' | 'recordings' | 'chat' | null>(null)

  // ─── 챗봇 store (testId 단위 키잉) ───
  const setStoreTestId = useExamPrepSolveStore((s) => s.setTestId)
  const quizChatContext = useExamPrepSolveStore((s) => s.quizChatContext)
  const setQuizChatContext = useExamPrepSolveStore((s) => s.setQuizChatContext)
  const clearQuizChatContext = useExamPrepSolveStore((s) => s.clearQuizChatContext)

  // ─── 출처 자료 패널 store (콘텐츠 학습과 공유 — LeftPanelMaterials/Recordings 재사용) ───
  const setLectureStudyLectureId = useLectureStudyStore((s) => s.setLectureId)
  const setTargetPage = useLectureStudyStore((s) => s.setTargetPage)
  const setTargetChunkIndex = useLectureStudyStore((s) => s.setTargetChunkIndex)

  // testId 변경 시 챗봇 store 동기화 (testId 가 다르면 quizChatContext 자동 리셋)
  useEffect(() => {
    setStoreTestId(testId)
  }, [testId, setStoreTestId])

  // 페이지(테스트) 진입 시 우측 패널 닫힘
  useEffect(() => {
    setRightTab(null)
  }, [testId])

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
  /** payload 유형(매칭/빈칸/복수/서술형) 응답 — 유형별 polymorphic 값. 제출 시 JSON 직렬화. */
  const [responseBySeq, setResponseBySeq] = useState<Record<number, unknown>>({})
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
  /** 백엔드 attempt 가 모든 문항 채점 완료 상태인지. resume 시 응답 수 / question_ids 수
   *  비교, grade 응답의 attempt_completed=true 시 갱신. local gradedBySeq 가 부족해도
   *  hasNext / handleNext 가 결과 화면 전환을 허용하도록 보조. */
  const [attemptCompletedFromBackend, setAttemptCompletedFromBackend] = useState(false)
  /** 즐겨찾기된 question.id 집합 — exam_prep quiz_source 로 user_quiz_status 에 저장. */
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<Set<string>>(
    new Set(),
  )

  // ─── 테스트 종료 오버레이용 사전 스냅샷 ───
  /** 풀이 시작 시점의 mastery + gamification 스냅샷. Phase1 모션 출발점 / Phase3·4 분기 / Phase5 비교. */
  const [preSnapshot, setPreSnapshot] = useState<PreSnapshot | null>(null)
  /** 풀이 종료 시점의 누적 상태 — fetchMyCourseState 결과 */
  const [postState, setPostState] = useState<{
    totalXp: number
    rankCode: string
    currentStreak: number
  } | null>(null)
  /** Phase1~4 모션 완료 여부. true 가 되면 Phase5 본 패널로 진입. */
  const [animationDone, setAnimationDone] = useState(false)
  /** 오늘 테스트 카운터 — 백엔드 attempt-counts 응답 (course_id 필터). */
  const [todayTestCount, setTodayTestCount] = useState(0)
  /** 캘린더 7개 셀(offset -3..+3)별 풀이 수 — 백엔드 attempt-counts 응답 윈도우. */
  const [calendarTestCounts, setCalendarTestCounts] = useState<Record<number, number>>({})

  // 경과 시간 타이머 — 풀이 중에만 동작. completed/error 시 정지 (마지막 [다음] 클릭 시점 고정).
  // 부수효과: 결과 화면 진입 후 컨테이너 재렌더가 멈춰 result-overlay 의 useEffect cleanup 도 안전.
  useEffect(() => {
    if (phase !== 'solving') return
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [phase])

  // ─── 풀이 페이지 진입 시 mastery summary 초기 동기화 (b2b20260429 r4) ───
  // 백엔드의 누적 mastery 카운트를 가져와 초기 Learning/Skilled/Master 값으로 설정.
  // 이번 attempt 의 채점 변동분은 grade endpoint 응답으로 prev→new 상태 차이만큼 +/-.
  // restartTrigger 가 변경될 때(다시풀기) 다시 fetch 하여 누적 mastery 가 반영되도록.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchTestMasterySummary(testId),
      fetchMyCourseState(courseId),
    ]).then(([masteryRes, gamRes]) => {
      if (cancelled) return
      if (masteryRes.error) {
        console.warn('[Solve] mastery summary fetch failed:', masteryRes.error)
      }
      const masteryData = masteryRes.data
      const gamData = gamRes.data
      if (masteryData) {
        setMasterySummary({
          learning: masteryData.summary.learning,
          skilled: masteryData.summary.skilled,
          master: masteryData.summary.master,
        })
        setByQuestionState(masteryData.by_question ?? {})
      }
      // ── 사전 스냅샷 (풀이 종료 후 결과 화면 모션 출발점) ──
      // restartTrigger 가 변경될 때마다 새 풀이 시작이므로 매번 새로 동결.
      const byQ: Record<string, MasteryState> = {}
      if (masteryData?.by_question) {
        Object.entries(masteryData.by_question).forEach(([qid, state]) => {
          if (state === 'learning' || state === 'skilled' || state === 'master') {
            byQ[qid] = state as MasteryState
          }
        })
      }
      setPreSnapshot({
        byQuestionMastery: byQ,
        lastStudyDateKst: gamData?.last_study_date ?? null,
        totalXp: gamData?.total_xp ?? 0,
        rankCode: gamData?.rank?.code ?? 'F',
        currentStreak: gamData?.current_streak ?? 0,
        masterySummary: masteryData
          ? {
              learning: masteryData.summary.learning,
              skilled: masteryData.summary.skilled,
              master: masteryData.summary.master,
            }
          : { learning: 0, skilled: 0, master: 0 },
      })
    })
    return () => {
      cancelled = true
    }
  }, [testId, courseId, restartTrigger])

  // ─── attempt 시작 / 이어풀기 / 다시풀기 ───
  useEffect(() => {
    let cancelled = false
    const start = async () => {
      setPhase('loading')
      setPhaseError(null)
      // 다시풀기 트리거 시 로컬 상태 초기화
      setSelectedBySeq({})
      setResponseBySeq({})
      setGradedBySeq({})
      setHintUsedSeqs(new Set())
      setHintDisabledBySeq({})
      setResumeResponses(null)
      setAttemptCompletedFromBackend(false)
      setCurrentSeq(1)
      setElapsedSec(0)

      // 첫 호출 실패 시 자동 1회 재시도 (대부분 race / 일시적 backend 실패).
      // 새로고침 흉내 — 사용자가 직접 새로고침 안 해도 두 번째 시도로 자연스럽게 복구.
      let attemptRes = await startOrResumeAttempt(testId)
      if (cancelled) return
      if (attemptRes.error || !attemptRes.data) {
        await new Promise((r) => setTimeout(r, 350))
        if (cancelled) return
        attemptRes = await startOrResumeAttempt(testId)
        if (cancelled) return
      }
      const a = attemptRes.data
      const aerr = attemptRes.error
      if (aerr || !a) {
        setPhaseError(aerr || '응시를 시작하지 못했습니다.')
        setPhase('error')
        return
      }
      setAttemptId(a.attempt_id)
      setAttemptQuestionIds(a.question_ids)

      // resume 시 백엔드 임시저장/채점 결과를 받아와 아래 useEffect 에서 UI 상태로 복원.
      // 이전 정책(빈 상태 시작) 뒤집힘 — 사용자가 이어풀기 진입 시 이전 선택/채점이 그대로 보여야 한다.
      if (a.resumed) {
        const { data: full } = await getAttempt(a.attempt_id)
        if (cancelled) return
        if (full) {
          setResumeResponses(full.responses)
          const gradedCount = (full.responses ?? []).filter(
            (r) => r.is_correct !== null && r.is_correct !== undefined,
          ).length
          const totalAttemptQs = (full.question_ids ?? []).length
          if (totalAttemptQs > 0 && gradedCount >= totalAttemptQs) {
            setAttemptCompletedFromBackend(true)
          }
        }
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

  // detail 로 부터 seq → question_id 직접 매핑 (전 문항 — 마스터 포함).
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

  // resume 응답 복원: 백엔드 saveAttemptResponse(임시저장) + gradeAttemptResponse(채점) 결과를
  // selectedBySeq / gradedBySeq / hintUsedSeqs 로 UI 에 그대로 복원. data(question 메타) 가
  // 로드된 뒤 1회 실행 후 resumeResponses 폐기.
  // mastery 변동 효과는 이전 grade 시점에 이미 적용되었으므로 first_master_transition=false 로
  // 채워 복원 시점에 보상 모션이 다시 트리거되지 않도록 한다. 사용자가 다른 선지로 재시도하면
  // 백엔드 grading_service.apply_single_grading_with_replacement 가 이전 효과 차감 + 새 효과 적용.
  useEffect(() => {
    if (!resumeResponses || !data) return
    const qidToSeq = new Map<string, number>()
    data.questions.forEach((q) => {
      if (q.id) qidToSeq.set(q.id, q.seq)
    })

    const newSelected: Record<number, number> = {}
    const newResponse: Record<number, unknown> = {}
    const newGraded: Record<number, GradeSingleResponseDto> = {}
    const newHintUsed = new Set<number>()

    for (const r of resumeResponses) {
      const seq = qidToSeq.get(r.question_id)
      if (seq == null) continue
      const question = data.questions.find((q) => q.seq === seq)
      if (!question) continue

      // payload 유형(매칭/빈칸/복수/서술형)은 selected 에 JSON 직렬화 저장 → responseBySeq 복원.
      // 레거시 4지선다는 0-indexed string("0"~"3") → selectedBySeq.
      if (question.question_format) {
        try {
          newResponse[seq] = JSON.parse(r.selected)
        } catch {
          /* 파싱 실패 시 무시 */
        }
      } else {
        const selectedIdx = parseInt(r.selected, 10)
        if (Number.isInteger(selectedIdx)) {
          newSelected[seq] = selectedIdx
        }
      }

      if (r.is_correct === true || r.is_correct === false) {
        newGraded[seq] = {
          is_correct: r.is_correct,
          correct_answer: question.answer ?? '',
          explanation: question.explanation,
          mastery: {
            question_id: r.question_id,
            previous_state: 'learning',
            new_state: 'learning',
            correct_count: 0,
            incorrect_count: 0,
            first_master_transition: false,
          },
          hint_used: r.hint_used ?? false,
          graded_count: 0,
          total_count: data.questions.length,
          attempt_completed: false,
          test_mastered_now: false,
          test_mastered_at: null,
        }
      }

      if (r.hint_used === true) newHintUsed.add(seq)
    }

    if (Object.keys(newSelected).length > 0) setSelectedBySeq(newSelected)
    if (Object.keys(newResponse).length > 0) setResponseBySeq(newResponse)
    if (Object.keys(newGraded).length > 0) setGradedBySeq(newGraded)
    if (newHintUsed.size > 0) setHintUsedSeqs(newHintUsed)

    setResumeResponses(null)
  }, [resumeResponses, data])

  // 회차 메타
  const matchedLecture = useMemo(() => {
    if (!data) return null
    return lectures.find((l) => l.id === data.lecture_session_id) ?? null
  }, [data, lectures])

  // 북마크된 exam_prep 문항 초기 로드 — data 의 lecture_session_id 기준
  useEffect(() => {
    if (!data?.lecture_session_id) return
    let cancelled = false
    getBookmarksByLectureIds([data.lecture_session_id]).then(({ data: bookmarks, error }) => {
      if (cancelled || error || !bookmarks) return
      const examIds = bookmarks
        .filter((b) => b.quiz_source === 'exam_prep')
        .map((b) => b.quiz_id)
      setBookmarkedQuestionIds(new Set(examIds))
    })
    return () => {
      cancelled = true
    }
  }, [data?.lecture_session_id])

  const handleBookmarkToggle = useCallback(async () => {
    const qid = seqToQuestionId.get(currentSeq)
    if (!qid || !data?.lecture_session_id) return
    const currentlyBookmarked = bookmarkedQuestionIds.has(qid)
    // 낙관적 업데이트
    setBookmarkedQuestionIds((prev) => {
      const next = new Set(prev)
      if (currentlyBookmarked) next.delete(qid)
      else next.add(qid)
      return next
    })
    const grade = gradedBySeq[currentSeq] ?? null
    const selected = selectedBySeq[currentSeq]
    const result = await toggleBookmark(
      'exam_prep',
      qid,
      data.lecture_session_id,
      !currentlyBookmarked,
      selected != null ? selected + 1 : null,
      grade ? grade.is_correct : null,
    )
    if (result.error) {
      // 실패 시 롤백
      setBookmarkedQuestionIds((prev) => {
        const next = new Set(prev)
        if (currentlyBookmarked) next.add(qid)
        else next.delete(qid)
        return next
      })
      console.error('[Solve] bookmark toggle failed:', result.error)
    }
  }, [
    currentSeq,
    seqToQuestionId,
    bookmarkedQuestionIds,
    data?.lecture_session_id,
    gradedBySeq,
    selectedBySeq,
  ])

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

  // ─── 현재 풀이 중 문항 → 좌측 자료 패널 lectureId 결정 ───
  // core: data.lecture_session_id (부모 test 의 lecture)
  // mid/final: 문항별 source_lecture_id (LLM/복제 시 채워진 출처)
  const currentLectureId: string | null = useMemo(() => {
    if (data?.test_type === 'core') return data.lecture_session_id ?? null
    return currentQuestion?.source_lecture_id ?? data?.lecture_session_id ?? null
  }, [data, currentQuestion])

  // currentLectureId 가 바뀌면 콘텐츠 학습 store 의 lectureId 도 동기화 →
  // LeftPanelMaterials/LeftPanelRecordings 가 새 회차 자료를 fetch 하도록.
  useEffect(() => {
    if (currentLectureId) {
      setLectureStudyLectureId(currentLectureId)
    }
  }, [currentLectureId, setLectureStudyLectureId])

  // 좌측 녹음본 패널용 recordings — currentLectureId 기준으로 직접 fetch.
  // (LeftPanelRecordings 는 recordings props 를 직접 받는 구조)
  const { recordings: leftPanelRecordings } = useLectureDetail(currentLectureId ?? '')
  const targetChunkIndex = useLectureStudyStore((s) => s.targetChunkIndex)
  const resetNavigationState = useLectureStudyStore((s) => s.resetNavigationState)

  // ─── 테스트 라벨 (챗봇 배지/프롬프트용) ───
  const testLabel = useMemo<string>(() => {
    if (!data) return ''
    if (data.test_type === 'mid') return `중간테스트${data.segment_index ?? ''}`
    if (data.test_type === 'final') return '최종테스트'
    // core: lecture_no 우선, 없으면 시즌 라벨
    return matchedLecture?.lecture_number != null
      ? `핵심${matchedLecture.lecture_number}`
      : (sessionLabel || '핵심테스트')
  }, [data, matchedLecture, sessionLabel])

  // ─── 출처 클릭 → 좌측 자료 패널 점프 (cycling + page 1→0 indexed) ───
  // 출처가 여러 개면 클릭마다 다음 인덱스로 순환. 페이지 번호는 백엔드 1-indexed
  // → LeftPanelMaterials targetPage 규약(0-indexed)으로 -1 변환. 청크는 이미 0-indexed.
  const materialsCursorRef = useRef<Record<string, number>>({})
  const recordingsCursorRef = useRef<Record<string, number>>({})
  // 새 attempt(다시풀기) 또는 새 testId 진입 시 cursor 초기화 — 누적 메모리 방지
  useEffect(() => {
    materialsCursorRef.current = {}
    recordingsCursorRef.current = {}
  }, [testId, restartTrigger])
  const handleSourceClick = useCallback(
    (kind: 'materials' | 'recordings') => {
      const sr = (currentQuestion?.source_ref ?? null) as
        | { source_pages?: number[]; source_chunks?: number[] }
        | null
      if (!sr) return
      const sectionKey = `q-${currentSeq}`
      // 우측 패널을 해당 탭(강의자료/녹음본)으로 직접 열기
      setRightTab(kind)
      if (kind === 'materials') {
        // #0(또는 음수) 페이지는 UI/네비게이션에서 제외 — #1 부터 시작.
        const pages = (sr.source_pages ?? []).filter((p) => p > 0)
        if (pages.length === 0) return
        const prev = materialsCursorRef.current[sectionKey] ?? 0
        const cursor = prev >= 0 && prev < pages.length ? prev : 0
        const page = pages[cursor]
        if (page != null) setTargetPage(page - 1)
        materialsCursorRef.current[sectionKey] = (cursor + 1) % pages.length
      } else {
        // #0(또는 음수) 청크 제외.
        const chunks = (sr.source_chunks ?? []).filter((c) => c > 0)
        if (chunks.length === 0) return
        const prev = recordingsCursorRef.current[sectionKey] ?? 0
        const cursor = prev >= 0 && prev < chunks.length ? prev : 0
        const chunk = chunks[cursor]
        if (chunk != null) setTargetChunkIndex(chunk)
        recordingsCursorRef.current[sectionKey] = (cursor + 1) % chunks.length
      }
    },
    [
      currentQuestion,
      currentSeq,
      setRightTab,
      setTargetPage,
      setTargetChunkIndex,
    ],
  )

  // ─── 챗봇 트리거 → 우측 패널 열림 + 문항 컨텍스트 주입 ───
  const handleAskChatbot = useCallback(() => {
    if (!currentQuestion) return
    setRightTab('chat')
    const qid = seqToQuestionId.get(currentSeq) ?? currentQuestion.id ?? ''
    setQuizChatContext({
      testId,
      testLabel,
      questionId: qid,
      seq: currentSeq,
      stem: currentQuestion.stem,
      options: currentQuestion.options,
      answer: currentQuestion.answer,
      explanation: currentQuestion.explanation as Record<string, string>,
      hint: currentQuestion.hint ?? null,
      sourceRef: (currentQuestion.source_ref ?? null) as
        | { source_pages?: number[]; source_chunks?: number[] }
        | null,
      sourceLectureId: currentQuestion.source_lecture_id ?? null,
      courseTitle: courseTitle ?? '',
    })
  }, [
    currentQuestion,
    currentSeq,
    seqToQuestionId,
    setQuizChatContext,
    setRightTab,
    testId,
    testLabel,
    courseTitle,
  ])

  /** seq → mastery state. 사이드바 1~10 버튼의 숙련도 컬러 매핑 데이터 소스.
   *  누적 mastery 그대로 표시 (b2b20260502 #3 — 한 번도 푼 적 없으면 미답, 이미 Master 면 보라). */
  const seqStateMap = useMemo<Map<number, 'learning' | 'skilled' | 'master'>>(() => {
    const m = new Map<number, 'learning' | 'skilled' | 'master'>()
    seqToQuestionId.forEach((qid, seq) => {
      const s = byQuestionState[qid]
      if (s === 'learning' || s === 'skilled' || s === 'master') {
        m.set(seq, s)
      }
    })
    return m
  }, [seqToQuestionId, byQuestionState])

  // ─── 풀이 종료 시 (phase=completed) post-state fetch + today count 증가 ───
  // restartTrigger 가 바뀌면 (다시풀기) animationDone / postState / todayTestCount 리셋.
  const incrementedRef = useRef(false)
  useEffect(() => {
    setAnimationDone(false)
    setPostState(null)
    setTodayTestCount(0)
    setCalendarTestCounts({})
    incrementedRef.current = false
  }, [restartTrigger])

  useEffect(() => {
    // phase 가 completed 가 아니면 가드 해제 (재시작/재진입 대비)
    if (phase !== 'completed') {
      incrementedRef.current = false
      return
    }
    // 이미 한 번 처리했으면 skip — StrictMode dev 더블마운트 / 재렌더 케이스 방어
    if (incrementedRef.current) return
    incrementedRef.current = true

    let cancelled = false

    // 1) 백엔드 attempt-counts (course_id 필터) — -3..+3 일 윈도우.
    //    이번 attempt 의 submit 이 백엔드에 반영된 직후이므로 today 카운트가 +1 되어 있다.
    const today = new Date()
    const offsetIso = (off: number) => {
      const d = new Date(today)
      d.setDate(today.getDate() + off)
      return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
    }
    const startIso = offsetIso(-3)
    const endIso = offsetIso(3)
    fetchCourseAttemptCounts(courseId, startIso, endIso).then(({ data }) => {
      if (cancelled) return
      const map = data?.counts ?? {}
      const todayIso = getKstTodayIso()
      setTodayTestCount(map[todayIso] ?? 1)
      const windowMap: Record<number, number> = {}
      for (let off = -3; off <= 3; off++) {
        windowMap[off] = map[offsetIso(off)] ?? 0
      }
      setCalendarTestCounts(windowMap)
    })

    // 2) 백엔드 누적 상태 갱신 (XP/streak/rank 새로고침)
    fetchMyCourseState(courseId).then(({ data }) => {
      if (cancelled || !data) return
      setPostState({
        totalXp: data.total_xp,
        rankCode: data.rank?.code ?? 'F',
        currentStreak: data.current_streak,
      })
    })
    return () => {
      cancelled = true
    }
  }, [phase, courseId])

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

  // ─── 액션: payload 유형 응답 변경 (채점 전) ───
  const handleResponseChange = useCallback(
    (value: unknown) => {
      if (gradedBySeq[currentSeq]) return  // 이미 채점된 문항은 변경 X
      setResponseBySeq((prev) => ({ ...prev, [currentSeq]: value }))
    },
    [currentSeq, gradedBySeq],
  )

  // ─── 액션: 힌트 클릭 → 오답 1개 random disable (레거시 4지선다 + payload 객관식/빈칸채우기) ───
  const handleHintClick = useCallback(() => {
    if (gradedBySeq[currentSeq]) return  // 채점된 문항은 무시
    if (hintDisabledBySeq[currentSeq] != null) return  // 이미 힌트 사용
    if (!currentQuestion) return

    const qf = currentQuestion.question_format
    let pickIdx: number
    if (qf) {
      // payload 유형 — payload.choices + correct_answer 로 오답 인덱스 산출.
      // 매칭/서술형 등 choices 없는 유형은 무시.
      const payload = (currentQuestion.payload ?? {}) as Record<string, unknown>
      const choices = (payload.choices as string[] | undefined) ?? []
      if (choices.length === 0) return
      const rawCorrect = payload.correct_answer
      const correctSet = new Set<number>(
        Array.isArray(rawCorrect)
          ? (rawCorrect as unknown[]).filter((x): x is number => typeof x === 'number')
          : typeof rawCorrect === 'number'
            ? [rawCorrect]
            : [],
      )
      const wrong = choices.map((_, i) => i).filter((i) => !correctSet.has(i))
      if (wrong.length === 0) return
      pickIdx = wrong[Math.floor(Math.random() * wrong.length)]
    } else {
      // 레거시 단일 4지선다
      const correctIdx = parseInt(currentQuestion.answer, 10)
      const wrong = currentQuestion.options
        .map((_, i) => i)
        .filter((i) => i !== correctIdx)
      if (wrong.length === 0) return
      pickIdx = wrong[Math.floor(Math.random() * wrong.length)]
    }

    setHintDisabledBySeq((prev) => ({ ...prev, [currentSeq]: pickIdx }))
    setHintUsedSeqs((prev) => {
      const next = new Set(prev)
      next.add(currentSeq)
      return next
    })
    // 레거시: 제거된 선지를 선택했었다면 해제
    setSelectedBySeq((prev) => {
      if (prev[currentSeq] === pickIdx) {
        const { [currentSeq]: _drop, ...rest } = prev
        return rest
      }
      return prev
    })
    // payload: 응답에 제거된 인덱스가 있으면 해제 (number / number[] / (number|null)[])
    setResponseBySeq((prev) => {
      const r = prev[currentSeq]
      if (typeof r === 'number') {
        if (r !== pickIdx) return prev
        const { [currentSeq]: _drop, ...rest } = prev
        return rest
      }
      if (Array.isArray(r) && r.includes(pickIdx)) {
        const next =
          qf === 'category_fill_blank7_multi'
            ? (r as (number | null)[]).map((x) => (x === pickIdx ? null : x))
            : (r as number[]).filter((x) => x !== pickIdx)
        return { ...prev, [currentSeq]: next }
      }
      return prev
    })
  }, [currentSeq, currentQuestion, gradedBySeq, hintDisabledBySeq])

  // ─── 액션: 제출 → 즉시 채점 ───
  const handleSubmit = useCallback(async () => {
    if (!attemptId || isGrading) return
    if (gradedBySeq[currentSeq]) return  // 이미 채점됨
    // payload 유형은 responseBySeq(JSON 직렬화), 레거시 단일4지선다는 selectedBySeq(인덱스 문자열).
    const qf = currentQuestion?.question_format ?? null
    let selectedStr: string
    if (qf) {
      const resp = responseBySeq[currentSeq]
      if (resp == null) return
      selectedStr = JSON.stringify(resp)
    } else {
      const selected = selectedBySeq[currentSeq]
      if (selected == null) return
      selectedStr = String(selected)
    }
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
      selectedStr,
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

    // 백엔드가 attempt 자동 submit 처리한 경우 신호 보존 — hasNext / handleNext 에서
    // 결과 화면 전환 허용용. (이번 grade 가 마지막 미채점 문항을 채워 graded_count 가
    // total_count 도달했을 때 발화.)
    if (result.attempt_completed) {
      setAttemptCompletedFromBackend(true)
    }

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
    responseBySeq,
    currentQuestion,
    currentSeq,
    seqToQuestionId,
    hintUsedSeqs,
  ])

  const goNext = useCallback(() => {
    setCurrentSeq((s) => Math.min(total, s + 1))
  }, [total])

  /** [다음] 버튼 동작:
   *  - 다음 문항(seq+1) 이 있으면 단순 이동
   *  - 마지막 문항이고 모든 문항이 채점됐으면(local 또는 backend 신호) 결과 화면으로 전환
   *  - 그 외 (마지막 문항이지만 미채점 문항 남아있음) → 미채점 문항으로 이동
   */
  const handleNext = useCallback(() => {
    const allGradedLocal = Object.keys(gradedBySeq).length >= total
    const allGraded = allGradedLocal || attemptCompletedFromBackend
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
  }, [currentSeq, total, gradedBySeq, attemptCompletedFromBackend])

  const handleExit = useCallback(() => {
    // 마지막 핵심테스트를 마스터한 직후 종료라면 ExamPrepContainer 가 진입 시 mid 잠금해제 모션을
    // 자동 재생하도록 신호 저장 (이슈 4). 보수적으로 항상 저장 — 실제 mid 잠금해제 여부는
    // ExamPrepContainer 의 useExamPrepData 가 산출한 mid status 가 unlocked 인지로 판정.
    try {
      sessionStorage.setItem(
        `examPrep:unlockHint:${courseId}`,
        JSON.stringify({ at: Date.now(), fromTestId: testId }),
      )
    } catch {
      // sessionStorage 차단 시 다음 진입에 모션이 안 보일 뿐 — 사용자 영향 없음
    }
    router.push(`/studyspace/course/${courseId}/exam-prep`)
  }, [router, courseId, testId])

  const handleRestart = useCallback(() => {
    // restart 트리거 — startOrResumeAttempt 가 새 attempt 생성 (이전이 submitted 상태이므로)
    setRestartTrigger((r) => r + 1)
  }, [])

  // ─── 렌더 ───
  // 분기 순서 주의 (b2c20260503 race fix):
  //   진짜 에러 (phase='error' 또는 detailError) 를 먼저 검사하고,
  //   그 외에 데이터 미도착(!data) 인 경우는 항상 로딩으로 간주한다.
  //   과거엔 `!data` 만으로 error UI 로 빠져, 첫 진입 시 attempt API 가 detail API 보다
  //   먼저 끝나면 phase='solving' + data=null 짧은 순간에 "오류" 메시지가 깜빡였음.
  if (phase === 'error' || detailError) {
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

  if (phase === 'loading' || detailLoading || !data) {
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

  // ─── 결과 화면 (Phase 1~4 풀화면 오버레이 + Phase 5 본 패널) ───
  if (phase === 'completed') {
    const correctCount = Object.values(gradedBySeq).filter(
      (g) => g.is_correct,
    ).length

    // 사전 스냅샷 미도착 시 안전 fallback
    const safePre: PreSnapshot = preSnapshot ?? {
      byQuestionMastery: {},
      lastStudyDateKst: null,
      totalXp: 0,
      rankCode: 'F',
      currentStreak: 0,
      masterySummary: { learning: 0, skilled: 0, master: 0 },
    }

    // QuestionDelta 산출 — seq.asc, before/after mastery + 채점 결과
    const questionDeltas = data.questions
      .slice()
      .sort((a, b) => a.seq - b.seq)
      .map((q) => {
        const before = (safePre.byQuestionMastery[q.id] ?? 'learning') as MasteryState
        const after = ((byQuestionState[q.id] as MasteryState | undefined) ?? before)
        const graded = gradedBySeq[q.seq] ?? null
        return {
          seq: q.seq,
          questionId: q.id,
          before,
          after,
          isCorrect: graded ? graded.is_correct : null,
          hintUsed: graded ? graded.hint_used : false,
        }
      })

    // 마스터 XP — 이번 풀이의 first_master_transition 합산 × 10
    const newMasters = Object.values(gradedBySeq).filter(
      (g) => g.mastery.first_master_transition,
    ).length
    const masterXpEarned = newMasters * 10

    // 오늘 첫 학습 여부
    const todayKst = getKstTodayIso()
    const isFirstTestToday = safePre.lastStudyDateKst !== todayKst

    // 일일 참여 XP — 첫 학습이면 streak 기반, 아니면 0. 백엔드 STAMP_XP_DAY_* 와 동일.
    const postStreak = postState?.currentStreak ?? safePre.currentStreak
    const streakForDailyTier = isFirstTestToday ? postStreak : safePre.currentStreak
    const dailyXpEarned = isFirstTestToday
      ? streakForDailyTier <= 1
        ? 20
        : streakForDailyTier <= 4
          ? 30
          : 40
      : 0

    // 등급은 totalXp 로부터 직접 derive — 백엔드 rank.code stale 시에도 일관성 보장.
    // pre 등급도 동일하게 derive 해서 leveup 판정 로직과 디스플레이가 같은 룰을 따르게.
    const postTotalXpResolved = postState?.totalXp ?? safePre.totalXp
    const postRankResolved = deriveRankFromXp(postTotalXpResolved)
    const preRankResolved = deriveRankFromXp(safePre.totalXp)

    const finalData: FinalResultData = {
      pre: { ...safePre, rankCode: preRankResolved },
      postTotalXp: postTotalXpResolved,
      postRankCode: postRankResolved,
      postCurrentStreak: postStreak,
      postMasterySummary: masterySummary,
      questionDeltas,
      masterXpEarned,
      isFirstTestToday,
      dailyXpEarned,
      todayTestCount: todayTestCount || 1,
      calendarTestCounts,
      totalTimeSec: elapsedSec,
      correctCount,
      total,
      testType: data.test_type ?? 'core',
      testNumber:
        data.test_type === 'mid'
          ? data.segment_index ?? null
          : data.test_type === 'final'
            ? null
            : matchedLecture?.lecture_number ?? data.lecture_no ?? null,
      testTitle: data.title ?? lectureTitle,
      sessionLabel,
      lectureTitle,
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
            seqStateMap={seqStateMap}
            masterySummary={masterySummary}
            currentQuestionState={null}
            onSelectSeq={() => {}}
            elapsedSec={elapsedSec}
            hideOnMobile
          />
          <Phase5FinalResult
            data={finalData}
            onRestart={handleRestart}
            onExit={handleExit}
            startAnimation={animationDone || !preSnapshot}
          />
        </div>
        {!animationDone && preSnapshot && (
          <TestEndOverlay
            data={finalData}
            onAnimationComplete={() => setAnimationDone(true)}
          />
        )}
      </div>
    )
  }

  // ─── 풀이 화면 (1920×1080 캔버스 contain 스케일, 시안 매칭) ───
  return (
    // 한계치(1440px) 미만이면 더 안 줄이고 가로 스크롤 — 사이드바/헤더/본문이 너무 작아지지 않게.
    <div className="h-full w-full overflow-x-auto overflow-y-hidden">
    <div
      className="flex h-full w-full min-w-[1440px] flex-col bg-[#F9F9FB] dark:bg-gray-950"
      style={{ containerType: 'inline-size' }}
    >
        {/* 상단바 — 얇은 흰 바 (px 고정) */}
        <header
          className="flex shrink-0 items-center justify-between bg-white dark:bg-gray-900"
          style={{
            height: '3.646cqw',
            padding: '0 1.771cqw',
            borderBottom: '0.052cqw solid rgb(233 235 239)',
          }}
        >
          <span
            className="min-w-0 flex-1 truncate text-gray-400"
            style={{ fontSize: '0.833cqw' }}
          >
            {sessionLabel ? `${sessionLabel} · ${lectureTitle}` : lectureTitle}
          </span>
          <button
            type="button"
            onClick={handleExit}
            className="shrink-0 border border-gray-300 bg-white font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            style={{ fontSize: '0.781cqw', padding: '0.417cqw 0.938cqw', borderRadius: '0.417cqw' }}
          >
            {t('examPrepFinal.exit')}
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1">
        <SolveSidebar
          scaled
          sessionLabel={sessionLabel}
          lectureTitle={lectureTitle}
          total={total}
          currentSeq={currentSeq}
          seqStateMap={seqStateMap}
          masterySummary={masterySummary}
          currentQuestionState={
            (byQuestionState[seqToQuestionId.get(currentSeq) ?? ''] as
              | 'learning'
              | 'skilled'
              | 'master'
              | undefined) ?? null
          }
          onSelectSeq={(seq) => setCurrentSeq(seq)}
          elapsedSec={elapsedSec}
        />

        {currentQuestion && !currentQuestion.question_format && (
          <SolveQuestionPanel
            question={currentQuestion}
            currentSeq={currentSeq}
            total={total}
            selectedChoice={selectedBySeq[currentSeq] ?? null}
            graded={gradedBySeq[currentSeq] ?? null}
            hintDisabledOption={hintDisabledBySeq[currentSeq] ?? null}
            isGrading={isGrading}
            currentQuestionState={
              (byQuestionState[seqToQuestionId.get(currentSeq) ?? ''] as
                | 'learning'
                | 'skilled'
                | 'master'
                | undefined) ?? null
            }
            isBookmarked={bookmarkedQuestionIds.has(seqToQuestionId.get(currentSeq) ?? '')}
            onBookmarkToggle={handleBookmarkToggle}
            onSelectChoice={handleSelectChoice}
            onSubmit={handleSubmit}
            onHint={handleHintClick}
            onPrev={() => setCurrentSeq((s) => Math.max(1, s - 1))}
            onNext={handleNext}
            hasPrev={currentSeq > 1}
            // 마지막 문항 + 모두 채점됨(local 또는 backend) → 결과 화면 진입 허용
            hasNext={
              currentSeq < total ||
              Object.keys(gradedBySeq).length >= total ||
              attemptCompletedFromBackend
            }
            onSourceClick={handleSourceClick}
            onAskChatbot={handleAskChatbot}
            mobileBottomSpacer={rightTab !== null}
            // 모든 채점 가능한 문항이 채점됐거나 backend 가 attempt_completed 신호 또는
            // 모든 문항이 master 상태(다시풀 필요 없음) → 퀴즈 종료 버튼 활성화 (이슈 8)
            canFinish={
              total > 0 &&
              (Object.keys(gradedBySeq).length >= total ||
                attemptCompletedFromBackend ||
                Array.from(seqToQuestionId.values()).every(
                  (qid) => byQuestionState[qid] === 'master',
                ))
            }
            onFinish={() => setPhase('completed')}
          />
        )}

        {/* payload 유형(매칭/빈칸/복수/서술형) — question_format 디스패처 패널.
            본문만 비례: ContentScaledCanvas(1620×1080) 안에서 폼 cqw 스케일. */}
        {currentQuestion && !!currentQuestion.question_format && (
          <div className="relative flex min-h-0 flex-1 overflow-hidden bg-[#F6F7F9] dark:bg-gray-950">
            <ContentScaledCanvas>
          <PayloadQuestionPanel
            question={currentQuestion}
            currentSeq={currentSeq}
            total={total}
            response={responseBySeq[currentSeq]}
            graded={gradedBySeq[currentSeq] ?? null}
            isGrading={isGrading}
            isBookmarked={bookmarkedQuestionIds.has(seqToQuestionId.get(currentSeq) ?? '')}
            onBookmarkToggle={handleBookmarkToggle}
            onResponseChange={handleResponseChange}
            onSubmit={handleSubmit}
            onPrev={() => setCurrentSeq((s) => Math.max(1, s - 1))}
            onNext={handleNext}
            hasPrev={currentSeq > 1}
            hasNext={
              currentSeq < total ||
              Object.keys(gradedBySeq).length >= total ||
              attemptCompletedFromBackend
            }
            onSourceClick={handleSourceClick}
            onAskChatbot={handleAskChatbot}
            onHint={handleHintClick}
            eliminatedIdx={hintDisabledBySeq[currentSeq] ?? undefined}
            mobileBottomSpacer={rightTab !== null}
            canFinish={
              total > 0 &&
              (Object.keys(gradedBySeq).length >= total || attemptCompletedFromBackend)
            }
            onFinish={() => setPhase('completed')}
          />
            </ContentScaledCanvas>
          </div>
        )}

        {/* 우측: 강의자료 / 녹음본 / AI 챗봇 3탭 패널.
            데스크탑은 in-flow(공간 차지) — 열리면 본문 영역이 좁아진 만큼 왼쪽으로 밀려서 패널에 안 가려짐.
            세 탭 콘텐츠는 모두 마운트 유지 + hidden 토글(탭 전환 시 챗봇 히스토리/입력·자료 스크롤 보존). */}
        {rightTab && (
          <div className="fixed inset-x-0 bottom-0 z-40 flex h-[55dvh] w-full flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl md:relative md:inset-auto md:h-full md:w-[360px] md:rounded-none md:border-t-0 md:border-l md:shadow-none shrink-0 dark:border-gray-700 dark:bg-gray-900">
            {/* 상단 3탭 헤더: 강의자료 / 녹음본 / AI 챗봇 */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
              <div className="flex gap-1">
                {([
                  ['materials', '강의자료'],
                  ['recordings', '녹음본'],
                  ['chat', 'AI 챗봇'],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setRightTab(key)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
                      rightTab === key
                        ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setRightTab(null)}
                aria-label="패널 닫기"
                className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              {/* 강의자료 */}
              <div className={cn('h-full', rightTab === 'materials' ? 'block' : 'hidden')}>
                {currentLectureId ? (
                  <LeftPanelMaterials />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-400">
                    이 문항에 연결된 강의자료가 없습니다.
                  </div>
                )}
              </div>

              {/* 녹음본 */}
              <div className={cn('h-full', rightTab === 'recordings' ? 'block' : 'hidden')}>
                {currentLectureId ? (
                  <LeftPanelRecordings
                    recordings={leftPanelRecordings ?? []}
                    targetChunkIndex={targetChunkIndex}
                    onTargetConsumed={resetNavigationState}
                    lectureId={currentLectureId ?? undefined}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-400">
                    이 문항에 연결된 녹음본이 없습니다.
                  </div>
                )}
              </div>

              {/* AI 챗봇 */}
              <div className={cn('h-full', rightTab === 'chat' ? 'block' : 'hidden')}>
                <ExamPrepChatPanel
                  testId={testId}
                  currentLectureId={currentLectureId}
                  quizChatContext={quizChatContext}
                  onClearQuizContext={clearQuizChatContext}
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
