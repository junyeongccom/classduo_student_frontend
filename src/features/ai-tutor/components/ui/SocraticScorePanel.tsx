/**
 * @file SocraticScorePanel.tsx
 * @description 소크라 문답 우측 패널 — 체크포인트 맵(통과 방식별) + 디딤돌 계단 + 아하 배지 + 총점/피드백/랭킹
 * @module features/ai-tutor
 * @dependencies public/topic_test/hero-{female,male}.png
 */
'use client'

import { useTranslations } from 'next-intl'
import type { SocraticTopic, SocraticCheckpointResult, SocraticLeaderboardEntry } from '../../types'

// 문답 진행 4단계 — 백엔드 stage_questions(체크포인트) 순서와 동일해야 한다
const STAGE_KEYS = ['termMemory', 'concept', 'analysisApply', 'judgeDesign'] as const
const MAX_SCAFFOLD_DEPTH = 2

type CheckpointMethod = SocraticCheckpointResult['method']

// 통과 방식별 노드 표현 — self(자력)가 가장 영예로운 스타일, fallback(힌트)은 중립색
const METHOD_STYLE: Record<CheckpointMethod, { node: string; label: string }> = {
  self: { node: 'bg-indigo-600 text-white ring-2 ring-indigo-200', label: 'text-indigo-700' },
  scaffold1: { node: 'bg-emerald-500 text-white', label: 'text-emerald-700' },
  scaffold2: { node: 'bg-emerald-500 text-white', label: 'text-emerald-700' },
  fallback: { node: 'bg-gray-200 text-gray-500', label: 'text-gray-500' },
}

/** 디딤돌 통과를 나타내는 계단 아이콘 (3칸) */
function StairIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="4" height="4" rx="0.5" />
      <rect x="4" y="5" width="4" height="7" rx="0.5" />
      <rect x="8" y="2" width="4" height="10" rx="0.5" />
    </svg>
  )
}

interface Props {
  topic: SocraticTopic
  totalScore: number
  praise: string
  suggestion: string
  abuseWarning: boolean
  mastered: boolean
  leaderboard: SocraticLeaderboardEntry[]
  myStudentId: string | null
  currentStage: number
  stageTotal: number
  phase: 'root' | 'scaffold' | 'retry_root' | 'fallback'
  scaffoldDepth: number
  ahaCount: number
  checkpointResults: SocraticCheckpointResult[]
}

export default function SocraticScorePanel({
  topic, totalScore, praise, suggestion, abuseWarning, mastered,
  leaderboard, myStudentId, currentStage, stageTotal,
  phase, scaffoldDepth, ahaCount, checkpointResults,
}: Props) {
  const t = useTranslations('aiTutorChat')
  // index → 통과 결과. 백엔드가 배열로 주므로 조회용 map으로 한 번 접는다.
  const resultByIndex = new Map<number, SocraticCheckpointResult>(
    checkpointResults.map((r) => [r.index, r]),
  )
  // 계단 칸 수 — phase가 root가 아니면 최소 1칸은 밟은 상태다.
  const stepCount = Math.min(MAX_SCAFFOLD_DEPTH, Math.max(1, scaffoldDepth))
  const phaseKey = phase === 'retry_root' ? 'retryRoot' : phase

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

      {/* 아하 배지 — 디딤돌을 밟고 원질문에 자력 도달한 횟수 */}
      {ahaCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-2.5 py-1.5">
          <span aria-hidden="true" className="text-sm leading-none">
            {'✨'.repeat(Math.min(ahaCount, 4))}
          </span>
          <span className="text-xs font-semibold text-amber-700">{t('socraticAhaBadge', { count: ahaCount })}</span>
        </div>
      )}

      {/* 체크포인트 맵 (단계 질문이 없는 옛 주제는 stageTotal 0 → 숨김) */}
      {stageTotal > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-gray-500">{t('socraticStageTitle')}</div>
          <ol className="space-y-1">
            {STAGE_KEYS.slice(0, stageTotal).map((key, i) => {
              const result = resultByIndex.get(i)
              // 세션 복원 경로는 checkpointResults를 채우지 않고 currentStage만 복원한다.
              // 결과가 없어도 currentStage보다 앞선 체크포인트는 이미 통과한 것 —
              // "방식 미상 통과"로 중립 표시해야 잠김(회색 번호)으로 퇴행하지 않는다.
              const impliedPass = !result && i < currentStage
              const active = !result && !impliedPass && i === currentStage
              const style = result ? METHOD_STYLE[result.method] : null
              return (
                <li key={key}>
                  <div className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${active ? 'bg-indigo-50 font-semibold text-indigo-700' : style ? style.label : impliedPass ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        style ? style.node : impliedPass ? 'bg-gray-300 text-white' : active ? 'animate-pulse border border-indigo-500 text-indigo-600' : 'border border-gray-300 text-gray-400'
                      }`}
                    >
                      {result
                        ? (result.method === 'self' ? '✓' : result.method === 'fallback' ? '◑' : <StairIcon />)
                        : impliedPass ? '✓' : i + 1}
                    </span>
                    <span className="flex-1 truncate">{t(`socraticStage.${key}`)}</span>
                    {result?.aha && <span aria-hidden="true">✨</span>}
                    {result && <span className="shrink-0 tabular-nums text-[10px] text-gray-400">+{result.score}</span>}
                  </div>
                  {/* 통과 방식 라벨 */}
                  {result && (
                    <div className="pl-8 text-[10px] text-gray-400">{t(`socraticMethod.${result.method}`)}</div>
                  )}
                  {/* 진행중 노드 아래 디딤돌 계단 — 원질문(root)에 머무는 동안은 표시하지 않는다 */}
                  {active && phase !== 'root' && (
                    <div className="mt-1 pl-8">
                      <div className="flex items-end gap-1" aria-hidden="true">
                        {Array.from({ length: stepCount }, (_, s) => (
                          <span
                            key={s}
                            className={`w-4 rounded-sm ${phase === 'fallback' ? 'bg-gray-300' : 'bg-emerald-400'}`}
                            style={{ height: `${6 + s * 4}px` }}
                          />
                        ))}
                      </div>
                      <div className={`mt-0.5 text-[10px] font-medium ${phase === 'retry_root' ? 'text-indigo-600' : phase === 'fallback' ? 'text-gray-500' : 'text-emerald-600'}`}>
                        {t(`socraticPhase.${phaseKey}`)}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {/* 동료 캐릭터 피드백 */}
      {abuseWarning && (
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600">{t('socraticAbuseWarning')}</div>
      )}
      {praise && (
        <div className="flex items-start gap-2">
          <img src="/topic_test/hero-female.png" alt="" width={36} height={36} className="shrink-0 rounded-full bg-green-50 object-contain" />
          <div className="rounded-2xl rounded-tl-sm bg-green-50 p-2.5 text-xs leading-relaxed">{praise}</div>
        </div>
      )}
      {suggestion && (
        <div className="flex items-start gap-2">
          <img src="/topic_test/hero-male.png" alt="" width={36} height={36} className="shrink-0 rounded-full bg-yellow-50 object-contain" />
          <div className="rounded-2xl rounded-tl-sm bg-yellow-50 p-2.5 text-xs leading-relaxed">{suggestion}</div>
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
