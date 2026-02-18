/**
 * @file SummaryTabContainer.tsx
 * @description 회차별 학습 - 요약 탭 컨테이너
 *   input_snapshot_id 기반으로 회차에 연결된 모든 강의자료의 요약을
 *   하나의 통합 요약으로 병합하여 렌더링한다.
 *   출처 버튼, PDF 다운로드 등 강의자료 원본 참조 UI는 표시하지 않는다.
 * @module features/lecture-study/components/containers
 * @dependencies lectureService, examPrepService
 */

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { lectureService } from '../../services/lectureService'
import { examPrepService } from '@/features/exam_prep/services/examPrepService'
import type { ExamPrepSummary, ExamPrepSummarySection } from '@/features/exam_prep/types'

interface SummaryTabContainerProps {
  lectureId: string
}

export function SummaryTabContainer({ lectureId }: SummaryTabContainerProps) {
  const t = useTranslations('examPrep')
  const locale = useLocale()
  const language = locale === 'en' ? 'en' : 'ko'

  const [summaries, setSummaries] = useState<ExamPrepSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchAll() {
      setIsLoading(true)
      setError(null)
      setSummaries([])

      // 1. snapshot API로 materials 가져오기
      const snapshotResult = await lectureService.getSnapshotSelections(lectureId)
      if (cancelled) return

      const materials = snapshotResult.data?.materials ?? []
      if (materials.length === 0) {
        setIsLoading(false)
        return
      }

      // 2. 모든 material의 summary를 병렬 로드
      const results = await Promise.allSettled(
        materials.map(mat => examPrepService.getSummary(mat.material_id, language)),
      )
      if (cancelled) return

      const loaded: ExamPrepSummary[] = []
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value.data?.summary) {
          loaded.push(r.value.data.summary as ExamPrepSummary)
        }
      }

      if (loaded.length === 0) {
        setError(locale === 'ko' ? '요약 데이터가 없습니다.' : 'No summary data available.')
      }

      setSummaries(loaded)
      setIsLoading(false)
    }

    fetchAll()
    return () => { cancelled = true }
  }, [lectureId, language, locale])

  // 여러 material의 요약을 하나로 병합
  const merged = useMemo(() => {
    if (summaries.length === 0) return null

    const overviews: string[] = []
    const sections: ExamPrepSummarySection[] = []
    const recentIssues: string[] = []
    const examPoints: string[] = []

    for (const s of summaries) {
      if (s.overview) overviews.push(s.overview)
      sections.push(...s.sections)
      if (s.recent_issues) recentIssues.push(...s.recent_issues)
      if (s.exam_points) examPoints.push(...s.exam_points)
    }

    return { overviews, sections, recentIssues, examPoints }
  }, [summaries])

  // 로딩 중
  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>{t('summary.loading')}</p>
      </div>
    )
  }

  // 데이터 없음
  if (!merged || error) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-gray-400">
        {error ?? t('summary.empty')}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 py-6 text-sm text-gray-700 dark:text-gray-300">
      {/* 요약 타이틀 + overview(s) */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('summary.title')}
        </h3>
        {merged.overviews.map((overview, idx) => (
          <p key={`overview-${idx}`} className="mt-2 leading-relaxed text-gray-700 dark:text-gray-300">
            {overview}
          </p>
        ))}
      </section>

      {/* 모든 sections (출처 버튼 없이) */}
      {merged.sections.map((section, index) => (
        <section key={`section-${index}`} className="space-y-3">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {section.title}
          </h4>
          <ul className="list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
            {section.bullets.map((bullet, bIdx) => (
              <li key={`${section.title}-bullet-${bIdx}`}>{bullet}</li>
            ))}
          </ul>
          {(section.tables ?? []).map((table, tIdx) => (
            <div
              key={`${section.title}-table-${tIdx}`}
              className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              {table.title && (
                <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {table.title}
                </div>
              )}
              <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-700 text-[11px] uppercase text-gray-400 dark:text-gray-500">
                  <tr>
                    {table.headers.map(header => (
                      <th key={header} className="px-3 py-2 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rIdx) => (
                    <tr key={`row-${index}-${tIdx}-${rIdx}`} className="border-t border-gray-100 dark:border-gray-700">
                      {row.map((cell, cIdx) => (
                        <td key={`cell-${index}-${tIdx}-${rIdx}-${cIdx}`} className="px-3 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}

      {/* 최근 쟁점 (병합) */}
      {merged.recentIssues.length > 0 && (
        <section>
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {t('summary.recentIssuesTitle')}
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
            {merged.recentIssues.map((issue, idx) => (
              <li key={`issue-${idx}`}>{issue}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 시험 포인트 (병합) */}
      {merged.examPoints.length > 0 && (
        <section>
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {t('summary.examPointsTitle')}
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
            {merged.examPoints.map((point, idx) => (
              <li key={`point-${idx}`}>{point}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
