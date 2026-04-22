/**
 * @file SummaryTabContainer.tsx
 * @description 회차별 학습 - 요약 탭 컨테이너
 *   lecture_content_summaries API에서 통합 요약을 조회하여 렌더링한다.
 *   각 섹션에 강의자료/녹음본 출처 버튼을 제공한다.
 * @module features/lecture-study/components/containers
 * @dependencies lectureService, useLectureStudyStore
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { lectureService } from '../../services/lectureService'
import { trackSummaryViewed } from '@/shared/hooks/useAnalytics'
import { summaryTabAnalytics } from '@/shared/lib/analytics'
import { useSourceNavigation } from '../../hooks/useSourceNavigation'
import { SourceButton } from '../ui/SourceButton'
import type { ContentSummary, ContentSummarySection } from '../../types'

interface SummaryTabContainerProps {
  lectureId: string
  courseId: string
}

/** 방어적 파싱: summary_json → ContentSummary (Task 774) */
function parseContentSummary(raw: string | null): ContentSummary | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const overview = typeof parsed.overview === 'string' ? parsed.overview : ''
    const rawSections = Array.isArray(parsed.sections) ? parsed.sections : []
    const sections: ContentSummarySection[] = rawSections.map((s: Record<string, unknown>) => ({
      title: typeof s.title === 'string' ? s.title : '',
      bullets: Array.isArray(s.bullets) ? s.bullets.filter((b: unknown) => typeof b === 'string') : [],
      tables: Array.isArray(s.tables)
        ? s.tables
            .filter((t: unknown) => {
              const tbl = t as Record<string, unknown>
              return Array.isArray(tbl?.headers) && Array.isArray(tbl?.rows)
            })
            .map((t: unknown) => {
              const tbl = t as Record<string, unknown>
              return {
                title: typeof tbl.title === 'string' ? tbl.title : null,
                headers: (tbl.headers as unknown[]).filter((h: unknown) => typeof h === 'string') as string[],
                rows: (tbl.rows as unknown[])
                  .filter((r: unknown) => Array.isArray(r))
                  .map((r: unknown) =>
                    (r as unknown[]).map((c: unknown) =>
                      typeof c === 'string' ? c : typeof c === 'number' ? String(c) : '',
                    ),
                  ) as string[][],
              }
            })
        : undefined,
      source_pages: Array.isArray(s.source_pages) ? s.source_pages.filter(Number.isFinite) : [],
      source_chunks: Array.isArray(s.source_chunks) ? s.source_chunks.filter(Number.isFinite) : [],
    }))
    const recent_issues = Array.isArray(parsed.recent_issues)
      ? parsed.recent_issues.filter((i: unknown) => typeof i === 'string')
      : undefined
    const exam_points = Array.isArray(parsed.exam_points)
      ? parsed.exam_points.filter((p: unknown) => typeof p === 'string')
      : undefined

    return { overview, sections, recent_issues, exam_points }
  } catch {
    return null
  }
}

/** 빈 요약 체크 (Task 775) */
function isSummaryEmpty(summary: ContentSummary): boolean {
  return summary.sections.length === 0 && (!summary.overview || summary.overview.trim() === '')
}

export function SummaryTabContainer({ lectureId, courseId }: SummaryTabContainerProps) {
  const t = useTranslations('lectureStudy')
  const locale = useLocale()

  const [summary, setSummary] = useState<ContentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const summaryViewedRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const reportedDepthsRef = useRef<Set<number>>(new Set())

  // 출처 네비게이션 훅
  const {
    isMobile,
    handleMaterialSourceClick,
    handleRecordingSourceClick,
    totalMaterialPages,
    totalRecordingChunks,
    resetCursors,
  } = useSourceNavigation(lectureId)

  // ─── API 호출 (Task 773) ───
  useEffect(() => {
    let cancelled = false

    async function fetchSummary() {
      setIsLoading(true)
      setError(null)
      setSummary(null)
      summaryViewedRef.current = false
      resetCursors()

      try {
        const result = await lectureService.getContentSummary(lectureId)
        if (cancelled) return

        if (result.error || !result.data) {
          setIsLoading(false)
          return // "요약 준비 중" 표시 (summary === null)
        }

        const jsonStr = locale === 'en'
          ? result.data.summary_json_en
          : result.data.summary_json_ko
        const parsed = parseContentSummary(jsonStr)

        if (!parsed || isSummaryEmpty(parsed)) {
          setIsLoading(false)
          return // "요약 준비 중" 표시
        }

        setSummary(parsed)
        if (!summaryViewedRef.current) {
          summaryViewedRef.current = true
          trackSummaryViewed({ lecture_id: lectureId, course_id: courseId })
        }
        setIsLoading(false)
      } catch (err) {
        if (cancelled) return
        console.error('[SummaryTabContainer] fetchSummary failed')
        setError('SUMMARY_LOAD_ERROR')
        setIsLoading(false)
      }
    }

    fetchSummary()
    return () => { cancelled = true }
  }, [lectureId, locale])

  // lectureId 변경 시 스크롤 깊이 보고 상태 초기화
  useEffect(() => {
    reportedDepthsRef.current = new Set()
  }, [lectureId])

  // 요약 탭 내부 스크롤 깊이 트래킹 (25/50/75/100%)
  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el || !summary) return

    const thresholds = [25, 50, 75, 100]
    const handleScroll = () => {
      const scrollable = el.scrollHeight - el.clientHeight
      if (scrollable <= 0) return
      const pct = Math.round((el.scrollTop / scrollable) * 100)
      for (const t of thresholds) {
        if (pct >= t && !reportedDepthsRef.current.has(t)) {
          reportedDepthsRef.current.add(t)
          summaryTabAnalytics.scrollDepth(lectureId, t)
        }
      }
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [summary, lectureId])

  // ─── 렌더링 ───

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p>{t('summary.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-gray-400">
        {t('summary.preparing')}
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="flex h-full items-center justify-center px-6 py-10 text-sm text-gray-400">
        {t('summary.preparing')}
      </div>
    )
  }

  return (
    <div ref={scrollContainerRef} className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-6 pb-24 text-sm text-gray-700 dark:text-gray-300">
      {/* 요약 타이틀 + overview */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
          {t('summary.title')}
        </h3>
        {summary.overview && (
          <p className="mt-2 leading-relaxed text-gray-700 dark:text-gray-300">
            {summary.overview}
          </p>
        )}
      </section>

      {/* Sections + 출처 버튼 */}
      {summary.sections.map((section, index) => {
        const sectionKey = `${section.title || ''}-${index}`
        const hasSourcePages = section.source_pages.length > 0
        const hasSourceChunks = section.source_chunks.length > 0

        return (
          <section key={`section-${index}`} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">
                {section.title}
              </h4>

              {/* 강의자료 출처 버튼 (Task 777) */}
              <SourceButton
                label={t('summary.sourceButtonMaterials')}
                tooltipId={`material-source-${index}`}
                tooltipContent={
                  hasSourcePages
                    ? t('summary.sourceTooltipPages', { pages: section.source_pages.join(', ') })
                    : t('summary.sourceEmptyTooltip')
                }
                disabled={!hasSourcePages}
                disabledClick={isMobile}
                onClick={() => handleMaterialSourceClick(sectionKey, section.source_pages, totalMaterialPages)}
              />

              {/* 녹음본 출처 버튼 (Task 777) */}
              <SourceButton
                label={t('summary.sourceButtonRecordings')}
                tooltipId={`recording-source-${index}`}
                tooltipContent={
                  hasSourceChunks
                    ? t('summary.sourceTooltipChunks', { chunks: section.source_chunks.join(', ') })
                    : t('summary.sourceEmptyTooltip')
                }
                disabled={!hasSourceChunks}
                disabledClick={isMobile}
                onClick={() => handleRecordingSourceClick(sectionKey, section.source_chunks, totalRecordingChunks)}
              />
            </div>

            <ul className="list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
              {section.bullets.map((bullet, bIdx) => (
                <li key={`${sectionKey}-bullet-${bIdx}`}>{bullet}</li>
              ))}
            </ul>

            {(section.tables ?? []).map((table, tIdx) => (
              <div
                key={`${sectionKey}-table-${tIdx}`}
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
                      {table.headers.map((header) => (
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
        )
      })}

      {/* 최근 쟁점 */}
      {summary.recent_issues && summary.recent_issues.length > 0 && (
        <section>
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {t('summary.recentIssuesTitle')}
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
            {summary.recent_issues.map((issue, idx) => (
              <li key={`issue-${idx}`}>{issue}</li>
            ))}
          </ul>
        </section>
      )}

      {/* 시험 포인트 */}
      {summary.exam_points && summary.exam_points.length > 0 && (
        <section>
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-50">
            {t('summary.examPointsTitle')}
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700 dark:text-gray-300">
            {summary.exam_points.map((point, idx) => (
              <li key={`point-${idx}`}>{point}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

