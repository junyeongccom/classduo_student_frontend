/**
 * @file MidFinalSlots.tsx
 * @description mid 3슬롯 + final 1슬롯 컨테이너 — status 5종 분기 + 동적 툴팁 + retry 핸들러
 * @module features/exam-prep-final/components/containers
 * @dependencies useExamPrepGeneratingPolling, midFinalService, next-intl, lucide-react
 *
 * 슬롯 상태 (b2b20260430 §FR-5):
 *   - locked     : 회색 + 자물쇠 + 동적 툴팁 (회차 X~Y번 마스터 시)
 *   - generating : 스피너 + "잠시 후 자동으로 열립니다"
 *   - available  : 활성 버튼 → /exam-prep/tests/{testId}
 *   - mastered   : ★ 배지
 *   - failed     : 경고 + 재시도 버튼
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertTriangle,
  Flag,
  Loader2,
  Lock,
  PenLine,
  Star,
} from 'lucide-react'

import { useExamPrepGeneratingPolling } from '../../hooks/useExamPrepGeneratingPolling'
import {
  retryFinalTest,
  retryMidTest,
  type FinalTestMetaDto,
  type MidFinalStatus,
  type MidTestMetaDto,
} from '../../services/midFinalService'

interface MidFinalSlotsProps {
  courseId: string
  /** 풀이 라우트 prefix — /exam-prep/tests/{testId} 의 base. 기본값: 현재 페이지 기준. */
  testRouteBase?: string
}

type Translator = ReturnType<typeof useTranslations>

const SLOT_BASE_CLASSES =
  'flex h-full min-h-[112px] flex-col items-center justify-center gap-1 rounded-2xl px-4 py-5 text-center transition-colors'

function _statusLabel(status: MidFinalStatus, forceFailed: boolean): MidFinalStatus {
  if (forceFailed && status === 'generating') return 'failed'
  return status
}

function _rangeTooltip(t: Translator, range: [number, number]): string {
  const [start, end] = range
  if (!start || !end) return t('examPrepFinal.lockedHintFallback')
  if (start === end)
    return t('examPrepFinal.lockedHintSingle', { start })
  return t('examPrepFinal.lockedHintRange', { start, end })
}

function MidSlot({
  meta,
  forceFailed,
  testRouteBase,
  onRetry,
  t,
}: {
  meta: MidTestMetaDto
  forceFailed: boolean
  testRouteBase: string
  onRetry: () => Promise<void>
  t: Translator
}) {
  const status = _statusLabel(meta.status, forceFailed)
  const label = t('examPrepFinal.midSlotLabel', { index: meta.segment_index })
  const rangeText = _rangeTooltip(t, meta.range_session_nos)

  if (status === 'locked') {
    return (
      <div
        role="button"
        aria-disabled="true"
        aria-label={t('examPrepFinal.midLockedAria', {
          label,
          hint: rangeText,
        })}
        title={rangeText}
        className={`${SLOT_BASE_CLASSES} cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-500`}
      >
        <Lock className="h-5 w-5 text-gray-400" aria-hidden />
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs leading-snug text-gray-500">{rangeText}</span>
      </div>
    )
  }
  if (status === 'generating') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={t('examPrepFinal.midGeneratingAria', { label })}
        className={`${SLOT_BASE_CLASSES} border border-blue-200 bg-blue-50 text-blue-700`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs leading-snug text-blue-600">
          {t('examPrepFinal.generatingHint')}
        </span>
      </div>
    )
  }
  if (status === 'mastered') {
    return (
      <div
        aria-label={t('examPrepFinal.midMasteredAria', { label })}
        className={`${SLOT_BASE_CLASSES} border border-amber-200 bg-amber-50 text-amber-800`}
      >
        <Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden />
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs font-medium text-amber-700">
          {t('examPrepFinal.masteredLabel')}
        </span>
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div
        className={`${SLOT_BASE_CLASSES} border border-red-200 bg-red-50 text-red-700`}
      >
        <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-1 inline-flex min-h-[44px] items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          {t('examPrepFinal.retryCta')}
        </button>
      </div>
    )
  }
  // available
  return (
    <Link
      href={`${testRouteBase}/${meta.test_id}`}
      aria-label={t('examPrepFinal.midStartAria', { label })}
      className={`${SLOT_BASE_CLASSES} border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
    >
      <PenLine className="h-5 w-5 text-emerald-600" aria-hidden />
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs font-medium text-emerald-700">
        {t('examPrepFinal.startCta')}
      </span>
    </Link>
  )
}

function FinalSlot({
  meta,
  forceFailed,
  testRouteBase,
  onRetry,
  t,
}: {
  meta: FinalTestMetaDto
  forceFailed: boolean
  testRouteBase: string
  onRetry: () => Promise<void>
  t: Translator
}) {
  const status = _statusLabel(meta.status, forceFailed)
  const label = t('examPrepFinal.finalSlotLabel')

  if (status === 'locked') {
    return (
      <div
        role="button"
        aria-disabled="true"
        aria-label={t('examPrepFinal.midLockedAria', {
          label,
          hint: t('examPrepFinal.lockedHintFinal'),
        })}
        title={t('examPrepFinal.lockedHintFinal')}
        className={`${SLOT_BASE_CLASSES} cursor-not-allowed border border-gray-200 bg-gray-50 text-gray-500`}
      >
        <Lock className="h-5 w-5 text-gray-400" aria-hidden />
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs leading-snug text-gray-500">
          {t('examPrepFinal.lockedFinalShort')}
        </span>
      </div>
    )
  }
  if (status === 'generating') {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={t('examPrepFinal.midGeneratingAria', { label })}
        className={`${SLOT_BASE_CLASSES} border border-blue-200 bg-blue-50 text-blue-700`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs leading-snug text-blue-600">
          {t('examPrepFinal.generatingHint')}
        </span>
      </div>
    )
  }
  if (status === 'mastered') {
    return (
      <div
        aria-label={t('examPrepFinal.midMasteredAria', { label })}
        className={`${SLOT_BASE_CLASSES} border border-amber-200 bg-amber-50 text-amber-800`}
      >
        <Star className="h-5 w-5 fill-amber-400 text-amber-500" aria-hidden />
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs font-medium text-amber-700">
          {t('examPrepFinal.masteredLabel')}
        </span>
      </div>
    )
  }
  if (status === 'failed') {
    return (
      <div
        className={`${SLOT_BASE_CLASSES} border border-red-200 bg-red-50 text-red-700`}
      >
        <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden />
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          onClick={() => void onRetry()}
          className="mt-1 inline-flex min-h-[44px] items-center rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
        >
          {t('examPrepFinal.retryCta')}
        </button>
      </div>
    )
  }
  return (
    <Link
      href={`${testRouteBase}/${meta.test_id}`}
      aria-label={t('examPrepFinal.midStartAria', { label })}
      className={`${SLOT_BASE_CLASSES} border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-100 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400`}
    >
      <Flag className="h-5 w-5 text-emerald-600" aria-hidden />
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs font-medium text-emerald-700">
        {t('examPrepFinal.startCta')}
      </span>
    </Link>
  )
}

export function MidFinalSlots({
  courseId,
  testRouteBase,
}: MidFinalSlotsProps) {
  const t = useTranslations()
  const { midData, finalData, forceFailed, refresh } =
    useExamPrepGeneratingPolling(courseId)
  const router = useRouter()
  const [retryError, setRetryError] = useState<string | null>(null)

  const baseRoute =
    testRouteBase
    ?? `/studyspace/course/${courseId}/exam-prep/test`

  const handleRetryMid = async (segmentIndex: 1 | 2 | 3) => {
    setRetryError(null)
    const r = await retryMidTest(courseId, segmentIndex)
    if (!r.ok) {
      setRetryError(r.error || t('examPrepFinal.retryError'))
      return
    }
    await refresh()
    router.refresh()
  }

  const handleRetryFinal = async () => {
    setRetryError(null)
    const r = await retryFinalTest(courseId)
    if (!r.ok) {
      setRetryError(r.error || t('examPrepFinal.retryError'))
      return
    }
    await refresh()
    router.refresh()
  }

  // 백엔드 응답이 도착하기 전 — locked 기본값으로 4슬롯 자리 잡아둠
  const midSlots: MidTestMetaDto[] =
    midData?.items
    ?? ([1, 2, 3] as Array<1 | 2 | 3>).map((idx) => ({
      test_id: null,
      segment_index: idx,
      status: 'locked' as MidFinalStatus,
      mastered_at: null,
      range_session_nos: [0, 0] as [number, number],
    }))

  const finalSlot: FinalTestMetaDto =
    finalData ?? {
      course_id: courseId,
      test_id: null,
      status: 'locked' as MidFinalStatus,
      mastered_at: null,
    }

  return (
    <section
      aria-label={t('examPrepFinal.slotsSectionTitle')}
      className="mt-8"
    >
      <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">
        {t('examPrepFinal.slotsSectionTitle')}
      </h2>
      {retryError && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {retryError}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {midSlots.map((m) => (
          <MidSlot
            key={`mid-${m.segment_index}`}
            meta={m}
            forceFailed={forceFailed}
            testRouteBase={baseRoute}
            onRetry={() => handleRetryMid(m.segment_index)}
            t={t}
          />
        ))}
        <FinalSlot
          meta={finalSlot}
          forceFailed={forceFailed}
          testRouteBase={baseRoute}
          onRetry={handleRetryFinal}
          t={t}
        />
      </div>
    </section>
  )
}
