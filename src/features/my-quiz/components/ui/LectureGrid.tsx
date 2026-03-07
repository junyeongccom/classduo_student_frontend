/**
 * @file LectureGrid.tsx
 * @description 퀴즈 생성 탭 우측 회차 그리드 (4열, 번호+제목 카드)
 * @module features/my-quiz
 * @dependencies next-intl, lucide-react
 */

'use client'

import { useTranslations } from 'next-intl'
import { CheckCircle2 } from 'lucide-react'

export interface LectureGridItem {
  lecture_id: string
  lecture_no: number
  title: string | null
  has_completed_session: boolean
}

interface LectureGridProps {
  lectures: LectureGridItem[]
  onSelectLecture: (lectureId: string) => void
  onGoToSessionList: () => void
  totalSessionCount: number
}

export default function LectureGrid({
  lectures,
  onSelectLecture,
  onGoToSessionList,
  totalSessionCount,
}: LectureGridProps) {
  const t = useTranslations('myQuiz')

  if (lectures.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-400">{t('generation.selectCourseFirst')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 상단: 세션 바로가기 — 분리된 버튼 */}
      <div className="mx-4 mt-4 mb-3">
        <button
          type="button"
          onClick={onGoToSessionList}
          className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition hover:border-blue-300 hover:shadow"
        >
          <span className="flex items-center gap-2 text-gray-600">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-300" />
            {t('generation.goToSessions')}
          </span>
          <span className="text-xs text-gray-400">
            {t('generation.totalSessions', { count: totalSessionCount })}
          </span>
        </button>
        <p className="mt-2 text-xs text-gray-400">{t('generation.lectureHint')}</p>
      </div>

      {/* 회차 그리드 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-4 gap-3">
          {lectures.map(lecture => (
            <button
              key={lecture.lecture_id}
              type="button"
              onClick={() => onSelectLecture(lecture.lecture_id)}
              className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white p-4 text-center transition hover:border-blue-300 hover:shadow-sm"
            >
              {lecture.has_completed_session && (
                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-blue-500" />
              )}
              <span className="text-lg font-bold text-blue-600">
                {String(lecture.lecture_no).padStart(2, '0')}
              </span>
              <span className="text-xs text-gray-600 line-clamp-2">
                {lecture.title ?? t('selector.lectureLabel', { no: lecture.lecture_no })}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
