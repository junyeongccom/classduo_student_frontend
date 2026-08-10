/**
 * @file SummaryTabContainer.tsx
 * @description 회차별 학습 - 요약 탭 컨테이너. 핵심/보충 2그룹 + 쉬운설명 구조로 강의 요약을 렌더링한다.
 * @module features/lecture-study/components/containers
 * @dependencies lectureService, useLectureStudyStore
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, Mic } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui'
import { lectureService } from '../../services/lectureService'
import { trackSummaryViewed } from '@/shared/hooks/useAnalytics'
import { summaryTabAnalytics } from '@/shared/lib/analytics'
import { useSourceNavigation } from '../../hooks/useSourceNavigation'
import { SummarySection } from '../ui/SummarySection'
import type {
  ContentSummary,
  ContentSummaryCoreSection,
  ContentSummarySection,
  ContentSummarySupplementarySection,
  ContentSummaryTable,
} from '../../types'

interface SummaryTabContainerProps {
  lectureId: string
  courseId: string
}

function parseTables(raw: unknown): ContentSummaryTable[] | undefined {
  if (!Array.isArray(raw)) return undefined
  return raw
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
}

function parseSection(s: Record<string, unknown>): ContentSummarySection {
  return {
    title: typeof s.title === 'string' ? s.title : '',
    bullets: Array.isArray(s.bullets) ? s.bullets.filter((b: unknown) => typeof b === 'string') : [],
    tables: parseTables(s.tables),
    source_pages: Array.isArray(s.source_pages) ? s.source_pages.filter(Number.isFinite) : [],
    source_chunks: Array.isArray(s.source_chunks) ? s.source_chunks.filter(Number.isFinite) : [],
    source_quotes: Array.isArray(s.source_quotes)
      ? (s.source_quotes as Record<string, unknown>[])
          .filter((q) => q && Number.isFinite(q.chunk) && typeof q.text === 'string' && q.text)
          .map((q) => ({ chunk: q.chunk as number, text: q.text as string }))
      : undefined,
  }
}

function parseCoreSection(s: Record<string, unknown>): ContentSummaryCoreSection {
  return {
    ...parseSection(s),
    easy_explanation: typeof s.easy_explanation === 'string' ? s.easy_explanation : '',
    lecture_seconds: Number.isFinite(s.lecture_seconds) ? (s.lecture_seconds as number) : 0,
    time_share_pct: Number.isFinite(s.time_share_pct) ? (s.time_share_pct as number) : 0,
    emphasis_cues: Array.isArray(s.emphasis_cues)
      ? s.emphasis_cues.filter((c: unknown) => typeof c === 'string')
      : [],
  }
}

/** 방어적 파싱: summary_json → ContentSummary (Task 774) */
function parseContentSummary(raw: string | null): ContentSummary | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    const overview = typeof parsed.overview === 'string' ? parsed.overview : ''
    const asArray = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : [])

    const sections = asArray(parsed.sections).map(parseSection)
    const core_sections = asArray(parsed.core_sections).map(parseCoreSection)
    const supplementary_sections: ContentSummarySupplementarySection[] = asArray(parsed.supplementary_sections).map((s) => ({
      ...parseSection(s),
      easy_explanation: typeof s.easy_explanation === 'string' ? s.easy_explanation : '',
    }))

    const recent_issues = Array.isArray(parsed.recent_issues)
      ? parsed.recent_issues.filter((i: unknown) => typeof i === 'string')
      : undefined
    const exam_points = Array.isArray(parsed.exam_points)
      ? parsed.exam_points.filter((p: unknown) => typeof p === 'string')
      : undefined

    return { overview, sections, core_sections, supplementary_sections, recent_issues, exam_points }
  } catch {
    return null
  }
}

/** 빈 요약 체크 (Task 775) */
function isSummaryEmpty(summary: ContentSummary): boolean {
  const hasAnySection =
    summary.core_sections.length > 0 ||
    summary.supplementary_sections.length > 0 ||
    summary.sections.length > 0
  return !hasAnySection && (!summary.overview || summary.overview.trim() === '')
}

export function SummaryTabContainer({ lectureId, courseId }: SummaryTabContainerProps) {
  const t = useTranslations('lectureStudy')
  const locale = useLocale()

  const [summary, setSummary] = useState<ContentSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supplementaryOpen, setSupplementaryOpen] = useState<string>('')
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

  // 구버전 요약(core 없음)은 평탄화 배열(sections = core+supplementary superset)을 그대로 단일 목록으로 렌더한다
  const useLegacyLayout = summary.core_sections.length === 0
  const hasSupplementary = summary.supplementary_sections.length > 0

  const handleMaterial = (key: string, pages: number[]) =>
    handleMaterialSourceClick(key, pages, totalMaterialPages)
  const handleRecording = (key: string, chunks: number[], quotes?: { chunk: number; text: string }[]) =>
    handleRecordingSourceClick(key, chunks, totalRecordingChunks, quotes)

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
      {useLegacyLayout &&
        summary.sections.map((section, index) => (
          <SummarySection
            key={`legacy-${index}`}
            section={section}
            sectionKey={`${section.title || ''}-${index}`}
            idPrefix={`legacy-${index}`}
            index={index}
            lectureId={lectureId}
            onMaterialClick={handleMaterial}
            onRecordingClick={handleRecording}
          />
        ))}

      {!useLegacyLayout && (
        <>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            {t('summary.coreGroupTitle')}
          </div>

          {summary.core_sections.map((section, index) => (
            <SummarySection
              key={`core-${index}`}
              section={section}
              sectionKey={`core-${section.title || ''}-${index}`}
              idPrefix={`core-${index}`}
              index={index}
              lectureId={lectureId}
              easyExplanation={section.easy_explanation}
              timeSharePct={section.time_share_pct}
              onMaterialClick={handleMaterial}
              onRecordingClick={handleRecording}
            />
          ))}

          {hasSupplementary && (
            <Accordion
              type="single"
              collapsible
              value={supplementaryOpen}
              onValueChange={(v) => {
                setSupplementaryOpen(v)
                summaryTabAnalytics.supplementaryToggle(lectureId, {
                  action: v ? 'open' : 'close',
                })
              }}
            >
              <AccordionItem value="supplementary" className="border-t border-b-0 border-gray-200 dark:border-gray-700">
                <AccordionTrigger className="py-3 text-sm text-gray-600 dark:text-gray-300 hover:no-underline">
                  {t('summary.supplementaryGroupTitle', {
                    count: summary.supplementary_sections.length,
                  })}
                </AccordionTrigger>
                <AccordionContent className="space-y-6 pt-2">
                  {summary.supplementary_sections.map((section, index) => (
                    <SummarySection
                      key={`supp-${index}`}
                      section={section}
                      sectionKey={`supp-${section.title || ''}-${index}`}
                      idPrefix={`supp-${index}`}
                      index={index}
                      lectureId={lectureId}
                      easyExplanation={section.easy_explanation}
                      onMaterialClick={handleMaterial}
                      onRecordingClick={handleRecording}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </>
      )}

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

