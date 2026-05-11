/**
 * @file LectureSelectContainer.tsx
 * @description 과목 내부 — 히어로 카드 + 회차/자료 탭 + 회차 행 리스트 + 플로팅 게임 CTA + 녹음본/자료 모달
 * @module features/lecture-study/components/containers
 * @dependencies useLectures, LectureRow, StudyspaceTopbarSlot, RecordingChunksModal, MaterialsModal
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, BookOpen, ChevronRight } from 'lucide-react'
import { trackPageEnter, trackPageLeave, navigationAnalytics, courseLectureAnalytics } from '@/shared/lib/analytics'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { useLectures } from '../../hooks/useLectures'
import { LectureRow } from '../ui/LectureRow'
import { RecordingChunksModal } from '../ui/RecordingChunksModal'
import { MaterialsModal } from '../ui/MaterialsModal'
import Link from 'next/link'
import { getSupabaseClient } from '@/shared/lib/supabase'
import { useCourses } from '@/features/home/hooks/useCourses'
import { formatTermLabel } from '@/features/home/domain/formatTermLabel'
import { inferCurrentWeekFromLectures } from '@/features/course-dashboard'
import type { Lecture } from '../../types'

export type LectureStatus = 'completed' | 'in-progress' | 'upcoming'

/** 회차 → 표시용 라벨 (예: "1주차 01차시") */
function getLectureLabel(lecture: Lecture, locale: string): string {
  if (lecture.week_number != null && lecture.session_number != null) {
    return locale === 'ko'
      ? `${lecture.week_number}주차 ${String(lecture.session_number).padStart(2, '0')}차시`
      : `W${lecture.week_number} S${String(lecture.session_number).padStart(2, '0')}`
  }
  return lecture.title ?? `${lecture.lecture_number ?? '?'}`
}

export function LectureSelectContainer({ courseId }: { courseId: string }) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const { lectures, courseTitle, section, isLoading, error, refresh } = useLectures(courseId)

  // Analytics: 페이지 체류시간 추적
  useEffect(() => {
    trackPageEnter('course_select', { courseId })
    return () => { trackPageLeave('course_select', { courseId }) }
  }, [courseId])

  // 보상(불꽃) 획득 회차 조회
  const [rewardedLectureIds, setRewardedLectureIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = getSupabaseClient()
    supabase
      .from('student_quiz_rewards')
      .select('lecture_id')
      .then(({ data }) => {
        if (data) {
          const ids = new Set(data.map((r: { lecture_id: string }) => r.lecture_id))
          setRewardedLectureIds(ids)
        }
      })
  }, [courseId])

  // 모달 상태
  const [recordingModalLecture, setRecordingModalLecture] = useState<Lecture | null>(null)
  const [materialsModalLecture, setMaterialsModalLecture] = useState<Lecture | null>(null)

  const handleMicClick = useCallback((lecture: Lecture) => {
    courseLectureAnalytics.recordingIconClick(courseId, lecture.id)
    setRecordingModalLecture(lecture)
  }, [courseId])

  const handlePdfClick = useCallback((lecture: Lecture) => {
    courseLectureAnalytics.materialIconClick(courseId, lecture.id)
    setMaterialsModalLecture(lecture)
  }, [courseId])

  const lectureStatuses = useMemo(() => {
    const statuses = new Map<string, LectureStatus>()
    lectures.forEach(l => {
      statuses.set(l.id, l.has_content ? 'completed' : 'upcoming')
    })
    return statuses
  }, [lectures])

  const activeLectureCount = lectures.filter(l => l.has_content).length
  const progressPercent = lectures.length > 0
    ? Math.round((activeLectureCount / lectures.length) * 100)
    : 0

  // 학기 라벨 — useCourses 에서 매칭
  const { courses } = useCourses()
  const matchedCourse = courses.find(c => c.id === courseId)
  const termLabel = matchedCourse?.academic_term
    ? formatTermLabel(matchedCourse.academic_term, locale)
    : null

  // 현재 주차 / 총 주차
  const currentWeek = inferCurrentWeekFromLectures(lectures) ?? 0
  const totalWeeks = lectures.reduce((max, l) => {
    return l.week_number != null && l.week_number > max ? l.week_number : max
  }, 0)

  // eyebrow: "{학기} · {분반}분반" — 데이터 없으면 생략
  const eyebrowParts: string[] = []
  if (termLabel) eyebrowParts.push(termLabel)
  if (section) eyebrowParts.push(locale === 'ko' ? `${section}분반` : `Section ${section}`)
  const eyebrow = eyebrowParts.join(' · ')

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">
          {error === 'LOAD_LECTURES_FAILED' ? t('lectureStudy.error.loadLectures') : error}
        </p>
        <button
          onClick={refresh}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800"
        >
          {t('home.retry')}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Breadcrumb → Header topbar slot: 홈 > 과목명(대시보드) > 회차별 학습 */}
      <StudyspaceTopbarSlot>
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Link
            href="/studyspace/home"
            className="transition-colors hover:text-[#6366F1]"
          >
            {t('lectureStudy.breadcrumbHome')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link
            href={`/studyspace/course/${courseId}`}
            className="truncate transition-colors hover:text-[#6366F1]"
          >
            {courseTitle ?? '...'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-semibold text-gray-900 dark:text-gray-100">
            {t('courseNav.lectureStudy')}
          </span>
        </nav>
      </StudyspaceTopbarSlot>

      <div className="relative h-full overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-5 md:px-8 md:py-6">
          {/* Course Hero Card — 흰배경 + 학기/분반 eyebrow + 진도 막대 */}
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 md:px-8 md:py-6 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0 flex-1">
                {eyebrow && (
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    {eyebrow}
                  </p>
                )}
                <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-gray-50 md:text-4xl xl:text-5xl">
                  {courseTitle}
                </h2>
              </div>
              {/* 우상단: 현재 주차수 / 총 주차수 */}
              <div className="shrink-0 pb-1 text-right text-lg md:text-2xl">
                <span className="font-bold text-gray-900 dark:text-gray-50">
                  {currentWeek > 0 ? currentWeek : '-'}
                </span>
                <span className="mx-1 text-gray-400">/</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {totalWeeks > 0 ? totalWeeks : lectures.length || '-'}
                </span>
                <span className="ml-2 align-middle text-xs font-medium text-gray-400">
                  {locale === 'ko' ? '주차' : 'weeks'}
                </span>
              </div>
            </div>

            {/* 진도 막대 + 진도율 */}
            <div className="mt-5 flex items-center gap-4">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#6366F1] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                {locale === 'ko' ? `진도율 ` : `Progress `}
                <span className="font-bold text-gray-900 dark:text-gray-50">
                  {progressPercent}%
                </span>
              </span>
            </div>
          </div>

          {/* Lessons Section */}
          <div className="mt-8">
            <div className="mb-6 flex items-center gap-2">
              <h3 className="flex shrink-0 items-center gap-2 text-xl font-bold text-gray-900 dark:text-gray-50">
                <BookOpen className="h-5 w-5 text-[#6366F1]" />
                {t('lectureStudy.weeklyLessons')}
              </h3>
            </div>

            {/* Lecture List */}
            <div className="space-y-3">
              {lectures.length === 0 ? (
                <div className="flex items-center justify-center rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 py-20 text-sm text-gray-400">
                  {t('lectureStudy.lectureSelect.empty')}
                </div>
              ) : (
                <>
                  {lectures.every(l => !l.has_content) && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                      {t('lectureStudy.lectureSelect.allInactive')}
                    </div>
                  )}
                  {lectures.map(lecture => {
                    const status = lectureStatuses.get(lecture.id) ?? 'upcoming'
                    return (
                      <LectureRow
                        key={lecture.id}
                        lecture={lecture}
                        status={status}
                        hasReward={rewardedLectureIds.has(lecture.id)}
                        onClick={() => {
                          navigationAnalytics.lectureSelect(lecture.id, courseId)
                          router.push(`/studyspace/course/${courseId}/lecture/${lecture.id}`)
                        }}
                        onMicClick={() => handleMicClick(lecture)}
                        onPdfClick={() => handlePdfClick(lecture)}
                      />
                    )
                  })}
                </>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Recording Chunks Modal */}
      <RecordingChunksModal
        open={recordingModalLecture !== null}
        onClose={() => setRecordingModalLecture(null)}
        lectureId={recordingModalLecture?.id ?? ''}
        lectureLabel={recordingModalLecture ? getLectureLabel(recordingModalLecture, locale) : ''}
      />

      {/* Materials Modal */}
      <MaterialsModal
        open={materialsModalLecture !== null}
        onClose={() => setMaterialsModalLecture(null)}
        lectureId={materialsModalLecture?.id ?? ''}
      />

    </>
  )
}
