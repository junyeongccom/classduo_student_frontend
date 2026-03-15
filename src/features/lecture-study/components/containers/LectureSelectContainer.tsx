/**
 * @file LectureSelectContainer.tsx
 * @description 과목 내부 — 히어로 카드 + 회차/자료 탭 + 회차 행 리스트 + 플로팅 게임 CTA + 녹음본/자료 모달
 * @module features/lecture-study/components/containers
 * @dependencies useLectures, LectureRow, MaterialCard, StudyspaceTopbarSlot, RecordingChunksModal, MaterialsModal
 */

'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, BookOpen, Gamepad2, ChevronRight, X } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { trackPageEnter, trackPageLeave, navigationAnalytics } from '@/shared/lib/analytics'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { useLectures } from '../../hooks/useLectures'
import { LectureRow } from '../ui/LectureRow'
import { RecordingChunksModal } from '../ui/RecordingChunksModal'
import { MaterialsModal } from '../ui/MaterialsModal'
import { GameSelectionModal } from '@/shared/components/common/GameSelectionModal'
import { useSidebarStore, SIDEBAR_WIDTH_EXPANDED, SIDEBAR_WIDTH_COLLAPSED } from '@/shared/store/useSidebarStore'
import Link from 'next/link'
import { getSupabaseClient } from '@/shared/lib/supabase'
import type { Lecture } from '../../types'

type CourseTab = 'lecture' | 'material'
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
  const { lectures, courseTitle, section, professorName, isLoading, error, refresh } = useLectures(courseId)
  const [activeTab, setActiveTab] = useState<CourseTab>('lecture')
  const [isCtaDismissed, setIsCtaDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    const dismissed = localStorage.getItem('gameCta_dismissedDate')
    return dismissed === new Date().toISOString().slice(0, 10)
  })
  const [isGameModalOpen, setIsGameModalOpen] = useState(false)

  const sidebarCollapsed = useSidebarStore((s) => s.isCollapsed)
  const sidebarWidth = sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED

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
    setRecordingModalLecture(lecture)
  }, [])

  const handlePdfClick = useCallback((lecture: Lecture) => {
    setMaterialsModalLecture(lecture)
  }, [])

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
      {/* Breadcrumb → Header topbar slot */}
      <StudyspaceTopbarSlot>
        <nav className="flex items-center gap-2 text-sm font-medium text-gray-400">
          <Link
            href="/studyspace/home"
            className="transition-colors hover:text-[#6366F1]"
          >
            {t('lectureStudy.breadcrumbHome')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="truncate font-semibold text-gray-900">
            {courseTitle ?? '...'}
          </span>
        </nav>
      </StudyspaceTopbarSlot>

      <div className={cn('relative h-full overflow-y-auto', !isCtaDismissed && 'pb-24')}>
        <div className="mx-auto max-w-5xl px-8 py-6">
          {/* Course Hero Card */}
          <div className="relative overflow-hidden rounded-3xl bg-[#6366F1] px-10 py-6 text-white shadow-2xl shadow-[#6366F1]/20">
            <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                {section && (
                  <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    {locale === 'ko' ? `${section}분반` : `Section ${section}`}
                  </span>
                )}
                <h2 className="mb-1 text-3xl font-black tracking-tight">{courseTitle}</h2>
                {professorName && (
                  <p className="text-sm font-medium text-white/70">{professorName}</p>
                )}
                <div className="mt-4 flex items-center gap-4">
                  <div className="h-3 max-w-[200px] flex-1 overflow-hidden rounded-full bg-white/20">
                    <div
                      className="h-full rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold">
                    {locale === 'ko' ? `진도율 ${progressPercent}%` : `${progressPercent}% Completed`}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center rounded-2xl border border-white/20 bg-white/10 px-5 py-3 backdrop-blur-xl">
                <span className="text-2xl font-bold">{lectures.length}</span>
                <span className="text-xs font-medium uppercase opacity-70">
                  {locale === 'ko' ? '전체 회차' : 'Total Lessons'}
                </span>
              </div>
            </div>
            {/* Decorative blurs */}
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-blue-400/20 blur-3xl" />
          </div>

          {/* Lessons Section */}
          <div className="mt-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <h3 className="flex shrink-0 items-center gap-2 text-xl font-bold">
                  <BookOpen className="h-5 w-5 text-[#6366F1]" />
                  {t('lectureStudy.weeklyLessons')}
                </h3>
                {/* Tab pills */}
                <div className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 p-1 shadow-inner">
                  <button
                    onClick={() => setActiveTab('lecture')}
                    className={cn(
                      'rounded-full px-6 py-2 text-sm font-bold transition-all active:scale-95',
                      activeTab === 'lecture'
                        ? 'bg-[#6366F1] text-white shadow-md'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    )}
                  >
                    {t('lectureStudy.tabLecture')}
                  </button>
                  <button
                    onClick={() => setActiveTab('material')}
                    className={cn(
                      'rounded-full px-6 py-2 text-sm font-bold transition-all active:scale-95',
                      activeTab === 'material'
                        ? 'bg-[#6366F1] text-white shadow-md'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    )}
                  >
                    {t('lectureStudy.tabMaterial')}
                  </button>
                </div>
              </div>
            </div>

            {/* Lecture List */}
            {activeTab === 'lecture' && (
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
                          onDialogueClick={() => {
                            navigationAnalytics.lectureSelect(lecture.id, courseId)
                            router.push(`/studyspace/course/${courseId}/lecture/${lecture.id}/dialogue`)
                          }}
                          onMicClick={() => handleMicClick(lecture)}
                          onPdfClick={() => handlePdfClick(lecture)}
                        />
                      )
                    })}
                  </>
                )}
              </div>
            )}

            {/* Material Grid → MOOC 안내문구로 대체 */}
            {activeTab === 'material' && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 py-20 px-6">
                <BookOpen className="mb-4 h-12 w-12 text-gray-300" />
                <p className="text-center text-base font-semibold text-gray-700 dark:text-gray-300">
                  {locale === 'ko'
                    ? 'MOOC 강의는 회차별 학습을 이용해주세요!'
                    : 'For MOOC lectures, please use Lecture-based Study!'}
                </p>
                <p className="mt-2 text-center text-sm text-gray-400">
                  {locale === 'ko'
                    ? '상단 탭에서 "회차별학습"을 선택해주세요.'
                    : 'Please select "By Lecture" from the tabs above.'}
                </p>
                <button
                  onClick={() => setActiveTab('lecture')}
                  className="mt-4 rounded-xl bg-[#6366F1] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#5558E6]"
                >
                  {locale === 'ko' ? '회차별학습으로 이동' : 'Go to Lecture-based Study'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Game CTA — fixed bottom */}
        {!isCtaDismissed && (
          <div className="fixed bottom-3 right-0 z-20 px-4 md:px-8 transition-[left] duration-300 ease-in-out" style={{ left: sidebarWidth }}>
            <div className="mx-auto max-w-5xl">
              <div className="relative overflow-hidden rounded-2xl bg-gray-900 px-8 py-4 text-white shadow-2xl">
                <button
                  onClick={() => setIsCtaDismissed(true)}
                  className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="relative z-10 flex items-center justify-between gap-6 pr-6">
                  <div>
                    <h4 className="text-lg font-bold">{t('lectureStudy.gameCta.title')}</h4>
                    <p className="mt-1 text-sm text-gray-400">{t('lectureStudy.gameCta.description')}</p>
                  </div>
                  <button
                    onClick={() => setIsGameModalOpen(true)}
                    className="shrink-0 rounded-2xl bg-white px-8 py-3 font-black text-gray-900 shadow-xl transition-all hover:bg-[#6366F1] hover:text-white"
                  >
                    {t('lectureStudy.gameCta.button')}
                  </button>
                </div>
                <div className="relative z-10 mt-2 text-right pr-6">
                  <button
                    onClick={() => {
                      localStorage.setItem('gameCta_dismissedDate', new Date().toISOString().slice(0, 10))
                      setIsCtaDismissed(true)
                    }}
                    className="text-xs text-gray-300 underline underline-offset-2 transition-colors hover:text-white"
                  >
                    {locale === 'ko' ? '오늘하루 닫기' : 'Hide for today'}
                  </button>
                </div>
                <Gamepad2 className="absolute bottom-2 right-4 h-20 w-20 opacity-10" />
              </div>
            </div>
          </div>
        )}
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

      {/* Game Selection Modal */}
      <GameSelectionModal
        open={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
      />
    </>
  )
}
