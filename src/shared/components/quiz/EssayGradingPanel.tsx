/**
 * @file EssayGradingPanel.tsx
 * @description 서술형 루브릭 채점 결과 표시 — 요소별 체크리스트·인용·총평·점수 산출 근거. props만 받는다
 * @module shared/components/quiz
 * @dependencies lucide-react, next-intl
 */

'use client'

import { Check, Loader2, Minus, X, AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { MathText } from '@/shared/components/math/MathText'

/* ───────────── 타입 ───────────── */

/** 요소별 판정. 서버가 확장할 수 있어 임의 문자열을 허용하고 표시는 미지 값 폴백을 둔다. */
export type EssayVerdict = 'met' | 'partial' | 'missed' | (string & {})

/** 채점 결과의 요소 1개. label·description 은 백엔드가 루브릭에서 합쳐 내려주며, 없으면 key로 폴백한다. */
export interface EssayGradingCriterion {
  key: string
  label?: string | null
  description?: string | null
  verdict: EssayVerdict
  /** met·partial 일 때 학생 답안에서 그대로 발췌한 구절. 지어낸 인용은 서버가 null로 떨군다. */
  quote?: string | null
}

/**
 * 화면이 아는 채점 상태.
 * - pending  : 채점 진행 중 (폴링 대기)
 * - graded   : 채점 완료
 * - failed   : 서버가 재시도 후에도 채점 실패
 * - timeout  : 폴링 상한을 넘김 (서버는 아직 돌고 있을 수 있다)
 */
export type EssayGradingStatus = 'pending' | 'graded' | 'failed' | 'timeout'

export interface EssayGradingView {
  status: EssayGradingStatus
  /** 0~100. 미채점이면 null */
  score: number | null
  criteria: EssayGradingCriterion[]
  feedback: string | null
}

export interface EssayGradingPanelProps {
  grading: EssayGradingView
}

/* ───────────── 상수 ───────────── */

/** 서버 ESSAY_PASS_SCORE 와 같은 값. 표시 문구(충분해요/보완해요) 분기에만 쓴다. */
const ESSAY_PASS_SCORE = 60

const VERDICT_STYLE: Record<string, { icon: typeof Check; iconClass: string; badgeClass: string }> = {
  met: {
    icon: Check,
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  partial: {
    icon: Minus,
    iconClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  missed: {
    icon: X,
    iconClass: 'text-gray-500 dark:text-gray-500',
    badgeClass: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  },
}

const UNKNOWN_VERDICT_STYLE = VERDICT_STYLE.missed

/**
 * 판정 → i18n 키. 서버가 새 verdict 를 추가해도 존재하지 않는 키를 조회하지 않도록
 * 매핑에 없으면 원문을 그대로 노출한다(next-intl 은 미존재 키에 에러를 남긴다).
 */
const VERDICT_LABEL_KEY = {
  met: 'verdictMet',
  partial: 'verdictPartial',
  missed: 'verdictMissed',
} as const

/* ───────────── 컴포넌트 ───────────── */

export function EssayGradingPanel({ grading }: EssayGradingPanelProps) {
  const t = useTranslations('lectureStudy.quiz.essayGrading')

  if (grading.status === 'pending') {
    return (
      <div
        className="flex items-start gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-900/20"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-indigo-500" />
        <div>
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">{t('pending')}</p>
          <p className="mt-0.5 text-xs text-indigo-500 dark:text-indigo-400">{t('pendingHint')}</p>
        </div>
      </div>
    )
  }

  if (grading.status === 'failed' || grading.status === 'timeout') {
    const isTimeout = grading.status === 'timeout'
    return (
      <div
        className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-900/20"
        role="status"
        aria-live="polite"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {isTimeout ? t('timeout') : t('failed')}
          </p>
          <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
            {isTimeout ? t('timeoutHint') : t('failedHint')}
          </p>
        </div>
      </div>
    )
  }

  // ── graded ──
  const metCount = grading.criteria.filter((c) => c.verdict === 'met').length
  const partialCount = grading.criteria.filter((c) => c.verdict === 'partial').length
  const total = grading.criteria.length
  // 점수는 서버의 가중합 계산 결과다. 숫자만 던지지 않도록 "무엇을 몇 개 충족했는지"를 함께 적는다.
  const breakdown =
    partialCount > 0
      ? t('breakdownWithPartial', { total, met: metCount, partial: partialCount })
      : t('breakdown', { total, met: metCount })
  const passed = grading.score !== null && grading.score >= ESSAY_PASS_SCORE

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
      {/* 판정 문구 + 점수 산출 근거 — "정답/오답"이라는 낱말은 서술형 화면에 쓰지 않는다 */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
            passed
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
          }`}
        >
          {passed ? t('enough') : t('needsMore')}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {breakdown}
          {grading.score !== null && (
            <>
              {' · '}
              <span className="font-bold text-gray-800 dark:text-gray-100">
                {t('scorePoints', { score: grading.score })}
              </span>
            </>
          )}
        </span>
      </div>

      {/* 요소별 체크리스트 */}
      <ul className="mt-3 space-y-2.5">
        {grading.criteria.map((criterion) => {
          const style = VERDICT_STYLE[criterion.verdict] ?? UNKNOWN_VERDICT_STYLE
          const Icon = style.icon
          const label = criterion.label?.trim() || criterion.key
          const isMissed = criterion.verdict === 'missed'
          const verdictLabelKey =
            VERDICT_LABEL_KEY[criterion.verdict as keyof typeof VERDICT_LABEL_KEY]
          return (
            <li key={criterion.key} className="flex items-start gap-2.5">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconClass}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`text-sm font-semibold ${
                      isMissed
                        ? 'text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-gray-50'
                    }`}
                  >
                    <MathText text={label} />
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${style.badgeClass}`}
                  >
                    {verdictLabelKey ? t(verdictLabelKey) : criterion.verdict}
                  </span>
                </div>

                {/* 충족·부분 충족이면 학생 답안에서 발췌한 근거를 붙인다 */}
                {!isMissed && criterion.quote && (
                  <p className="mt-1 border-l-2 border-gray-200 pl-2 text-xs italic leading-relaxed text-gray-600 dark:border-gray-600 dark:text-gray-300">
                    “<MathText text={criterion.quote} />”
                  </p>
                )}

                {/* 빠뜨린 요소는 무엇을 썼어야 하는지 알려준다 */}
                {isMissed && criterion.description && (
                  <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    <MathText text={t('missedHint', { hint: criterion.description })} />
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* 한 줄 총평 */}
      {grading.feedback && (
        <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-700 dark:bg-gray-700/50 dark:text-gray-200">
          <MathText text={grading.feedback} />
        </p>
      )}
    </div>
  )
}
