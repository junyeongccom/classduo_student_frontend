/**
 * @file CoreTestSolveContainer.tsx
 * @description 핵심 테스트 풀이 페이지 컨테이너 — 사이드바 + 메인 패널 + 상단바
 * @module features/exam-prep-final/components/containers
 * @dependencies useCoreTestDetail, useLectures
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { useLectures } from '@/features/lecture-study/hooks/useLectures'
import { useCoreTestDetail } from '../../hooks/useCoreTestDetail'
import { SolveTopBar } from '../ui/SolveTopBar'
import { SolveSidebar } from '../ui/SolveSidebar'
import { SolveQuestionPanel } from '../ui/SolveQuestionPanel'

interface CoreTestSolveContainerProps {
  courseId: string
  testId: string
}

export function CoreTestSolveContainer({
  courseId,
  testId,
}: CoreTestSolveContainerProps) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const { courseTitle, lectures } = useLectures(courseId)
  const { data, isLoading, error } = useCoreTestDetail(testId)

  // 풀이 상태
  const [currentSeq, setCurrentSeq] = useState(1)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [elapsedSec, setElapsedSec] = useState(0)

  // 경과 시간 타이머 (1초)
  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // 회차 메타 매칭 (lectures 와 lecture_session_id 로 조인)
  const matchedLecture = useMemo(() => {
    if (!data) return null
    return (
      lectures.find((l) => l.id === data.lecture_session_id) ?? null
    )
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

  // 현재 문항
  const currentQuestion = useMemo(() => {
    if (!data) return null
    return data.questions.find((q) => q.seq === currentSeq) ?? null
  }, [data, currentSeq])

  const total = data?.questions.length ?? 0
  const answeredSeqs = useMemo(
    () => new Set(Object.keys(answers).map((k) => Number(k))),
    [answers],
  )

  const handleSelectChoice = (idx: number) => {
    setAnswers((prev) => ({ ...prev, [currentSeq]: idx }))
  }

  const handleSubmit = () => {
    // v1: 단순 다음 문항 이동. v2에서 제출 API 호출 + 채점 결과 처리
    if (currentSeq < total) {
      setCurrentSeq(currentSeq + 1)
    } else {
      console.log('[Solve] complete answers:', answers)
    }
  }

  const handleExit = () => {
    router.push(`/studyspace/course/${courseId}/exam-prep`)
  }

  // ─── 렌더 ───
  if (isLoading) {
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

  if (error || !data) {
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
            {error ?? t('examPrepFinal.solveLoadError')}
          </p>
        </div>
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
