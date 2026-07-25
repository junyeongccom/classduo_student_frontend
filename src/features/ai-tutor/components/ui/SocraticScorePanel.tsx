/**
 * @file SocraticScorePanel.tsx
 * @description 소크라 문답 우측 패널 — 5축 점수(축당 20 상한) + 동료 캐릭터 피드백 + 과목 랭킹
 * @module features/ai-tutor
 * @dependencies public/topic_test/hero-{female,male}.png
 */
'use client'

import { useTranslations } from 'next-intl'
import type { SocraticTopic, SocraticAxisScores, SocraticLeaderboardEntry } from '../../types'

const AXIS_KEYS: (keyof SocraticAxisScores)[] = [
  'clarity', 'accuracy', 'relevance', 'depth', 'reflection',
]
const AXIS_CAP = 20

interface Props {
  topic: SocraticTopic
  axisScores: SocraticAxisScores
  totalScore: number
  lastDeltas: SocraticAxisScores | null
  praise: string
  suggestion: string
  abuseWarning: boolean
  mastered: boolean
  leaderboard: SocraticLeaderboardEntry[]
  myStudentId: string | null
}

export default function SocraticScorePanel({ topic, axisScores, totalScore, lastDeltas, praise, suggestion, abuseWarning, mastered, leaderboard, myStudentId }: Props) {
  const t = useTranslations('aiTutorChat')
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* 주제 + 총점 */}
      <div>
        <div className="text-xs text-gray-500">{t('socraticPanelTitle')} {topic.title}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-indigo-600">{totalScore}</span>
          <span className="text-sm text-gray-400">{t('socraticScoreOutOf')}</span>
          {mastered && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">{t('socraticMastered')}</span>}
        </div>
      </div>
      {/* 5축 게이지 */}
      <div className="space-y-2">
        {AXIS_KEYS.map((key) => (
          <div key={key}>
            <div className="flex justify-between text-xs">
              <span>{t(`socraticAxis.${key}`)}</span>
              <span className="tabular-nums">
                {axisScores[key]}
                {lastDeltas && lastDeltas[key] > 0 && <span className="ml-1 font-semibold text-emerald-600">+{lastDeltas[key]}</span>}
              </span>
            </div>
            <div className="mt-0.5 h-1.5 rounded-full bg-gray-100">
              <div className="h-1.5 rounded-full bg-indigo-500 transition-all" style={{ width: `${(axisScores[key] / AXIS_CAP) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      {/* 동료 캐릭터 피드백 */}
      {abuseWarning && (
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{t('socraticAbuseWarning')}</div>
      )}
      {praise && (
        <div className="flex items-start gap-2">
          <img src="/topic_test/hero-female.png" alt="" width={36} height={36} className="shrink-0 rounded-full bg-pink-50 object-contain" />
          <div className="rounded-2xl rounded-tl-sm bg-pink-50 p-2.5 text-xs leading-relaxed">{praise}</div>
        </div>
      )}
      {suggestion && (
        <div className="flex items-start gap-2">
          <img src="/topic_test/hero-male.png" alt="" width={36} height={36} className="shrink-0 rounded-full bg-sky-50 object-contain" />
          <div className="rounded-2xl rounded-tl-sm bg-sky-50 p-2.5 text-xs leading-relaxed">{suggestion}</div>
        </div>
      )}
      {/* 과목 랭킹 */}
      <div>
        <div className="mb-1 text-xs font-semibold text-gray-500">{t('socraticRanking')}</div>
        {leaderboard.length === 0 ? (
          <div className="rounded-lg px-2 py-1 text-xs text-gray-400">{t('socraticRankingEmpty')}</div>
        ) : (
          <ol className="space-y-1">
            {leaderboard.map((e, i) => (
              <li key={e.student_id}
                className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${e.student_id === myStudentId ? 'bg-indigo-50 font-semibold' : ''}`}>
                <span>{t('socraticRankSuffix', { rank: i + 1 })} · {e.name}</span>
                <span className="tabular-nums">{e.total_score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  )
}
