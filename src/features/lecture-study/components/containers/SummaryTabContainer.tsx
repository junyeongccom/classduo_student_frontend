/**
 * @file SummaryTabContainer.tsx
 * @description 회차별 학습 - 요약 탭 컨테이너
 *   lecture_content_summaries API에서 통합 요약을 조회하여 렌더링한다.
 *   각 섹션에 강의자료/녹음본 출처 버튼을 제공한다.
 * @module features/lecture-study/components/containers
 * @dependencies lectureService, useLectureStudyStore
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { lectureService } from '../../services/lectureService'
import { useLectureStudyStore } from '../../store/useLectureStudyStore'
import { useIsMobile } from '../../hooks/useMediaQuery'
import type { ContentSummary, ContentSummarySection } from '../../types'

interface SummaryTabContainerProps {
  lectureId: string
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
      tables: Array.isArray(s.tables) ? s.tables : undefined,
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

export function SummaryTabContainer({ lectureId }: SummaryTabContainerProps) {
  const t = useTranslations('lectureStudy')
  const locale = useLocale()
  const isMobile = useIsMobile()

  const [summary, setSummary] = useState<ContentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 출처 cycling 커서 (Task 779)
  const materialsCursorRef = useRef<Record<string, number>>({})
  const recordingsCursorRef = useRef<Record<string, number>>({})

  // Store actions
  const setTargetPage = useLectureStudyStore((s) => s.setTargetPage)
  const setTargetChunkIndex = useLectureStudyStore((s) => s.setTargetChunkIndex)
  const setLeftTab = useLectureStudyStore((s) => s.setLeftTab)
  const isLeftPanelOpen = useLectureStudyStore((s) => s.isLeftPanelOpen)
  const toggleLeftPanel = useLectureStudyStore((s) => s.toggleLeftPanel)

  // ─── API 호출 (Task 773) ───
  useEffect(() => {
    let cancelled = false

    async function fetchSummary() {
      setIsLoading(true)
      setError(null)
      setSummary(null)
      materialsCursorRef.current = {}
      recordingsCursorRef.current = {}

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
        setIsLoading(false)
      } catch (err) {
        if (cancelled) return
        console.error('[SummaryTabContainer] fetchSummary error:', err)
        setError('SUMMARY_LOAD_ERROR')
        setIsLoading(false)
      }
    }

    fetchSummary()
    return () => { cancelled = true }
  }, [lectureId, locale])

  // ─── 출처 클릭 핸들러 (Task 780, 781, 787) ───
  const handleMaterialSourceClick = useCallback(
    (sectionKey: string, sourcePages: number[], totalPageCount: number) => {
      if (isMobile || sourcePages.length === 0) return

      // cycling
      const cursor = materialsCursorRef.current[sectionKey] ?? 0
      const safeCursor = cursor >= 0 && cursor < sourcePages.length ? cursor : 0

      // 유효한 페이지 찾기 (범위 초과 건너뛰기)
      let attempts = 0
      let current = safeCursor
      while (attempts < sourcePages.length) {
        const page = sourcePages[current]
        const targetIdx = page - 1 // 1-indexed → 0-indexed
        if (targetIdx >= 0 && targetIdx < totalPageCount) {
          materialsCursorRef.current[sectionKey] = (current + 1) % sourcePages.length

          // 좌측 패널 열기 + 강의자료 탭 전환 + 타겟 설정
          if (!isLeftPanelOpen) toggleLeftPanel()
          setLeftTab('materials')
          setTargetPage(targetIdx)
          return
        }
        current = (current + 1) % sourcePages.length
        attempts++
      }
      // 모든 페이지가 범위 초과 → 무시
      materialsCursorRef.current[sectionKey] = (safeCursor + 1) % sourcePages.length
    },
    [isMobile, isLeftPanelOpen, toggleLeftPanel, setLeftTab, setTargetPage],
  )

  const handleRecordingSourceClick = useCallback(
    (sectionKey: string, sourceChunks: number[], totalChunkCount: number) => {
      if (isMobile || sourceChunks.length === 0) return

      const cursor = recordingsCursorRef.current[sectionKey] ?? 0
      const safeCursor = cursor >= 0 && cursor < sourceChunks.length ? cursor : 0

      let attempts = 0
      let current = safeCursor
      while (attempts < sourceChunks.length) {
        const chunkIdx = sourceChunks[current]
        if (chunkIdx >= 0 && chunkIdx < totalChunkCount) {
          recordingsCursorRef.current[sectionKey] = (current + 1) % sourceChunks.length

          if (!isLeftPanelOpen) toggleLeftPanel()
          setLeftTab('recordings')
          setTargetChunkIndex(chunkIdx)
          return
        }
        current = (current + 1) % sourceChunks.length
        attempts++
      }
      recordingsCursorRef.current[sectionKey] = (safeCursor + 1) % sourceChunks.length
    },
    [isMobile, isLeftPanelOpen, toggleLeftPanel, setLeftTab, setTargetChunkIndex],
  )

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

  // TODO: totalPageCount/totalChunkCount는 실제로 material/recording 데이터에서 가져와야 하지만,
  // 현재 SummaryTabContainer에서는 직접 접근하지 않으므로 충분히 큰 값으로 대체.
  // 실제 범위 초과는 LeftPanelMaterials/LeftPanelRecordings에서 자체 검증함.
  const LARGE_COUNT = 99999

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto px-6 pt-6 pb-24 text-sm text-gray-700 dark:text-gray-300">
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
        const sectionKey = section.title || String(index)
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
                onClick={() => handleMaterialSourceClick(sectionKey, section.source_pages, LARGE_COUNT)}
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
                onClick={() => handleRecordingSourceClick(sectionKey, section.source_chunks, LARGE_COUNT)}
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

// ─── 출처 버튼 컴포넌트 (Task 777, 778) ───

interface SourceButtonProps {
  label: string
  tooltipId: string
  tooltipContent: string
  disabled: boolean
  /** 모바일에서 클릭 비활성화 (툴팁만 제공) */
  disabledClick: boolean
  onClick: () => void
}

function SourceButton({ label, tooltipId, tooltipContent, disabled, disabledClick, onClick }: SourceButtonProps) {
  return (
    <div className="group relative inline-flex items-center">
      <button
        type="button"
        aria-describedby={tooltipId}
        className={[
          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
          disabled
            ? 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-default'
            : disabledClick
              ? 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-default'
              : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer',
        ].join(' ')}
        onClick={() => {
          if (!disabled && !disabledClick) onClick()
        }}
      >
        {label}
      </button>
      {/* 툴팁 (Task 778) */}
      <div
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-0 z-20 w-max max-w-[240px] -translate-x-1/2 -translate-y-[calc(100%+10px)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        <div className="rounded-md bg-gray-900 px-2 py-1 text-[11px] text-white shadow-sm">
          {tooltipContent}
        </div>
        <div className="mx-auto mt-1 h-2 w-2 rotate-45 bg-gray-900" />
      </div>
    </div>
  )
}
