/**
 * @file SocraticScorePanel.tsx
 * @description 소크라 문답 우측 패널 — 체크포인트 맵(통과 방식별) + 디딤돌 계단 + 아하 배지 + 총점/피드백/랭킹
 * @module features/ai-tutor
 * @dependencies public/topic_test/hero-{female,male}.png
 */
'use client'

import { useTranslations } from 'next-intl'
import type {
  SocraticTopic, SocraticCheckpointResult, SocraticStageOutlineItem, SocraticLeaderboardEntry,
} from '../../types'

// 문답 진행 유형 4종 — 백엔드 stage_questions 의 유형 블록 순서와 동일해야 한다.
// v5부터 유형은 그대로 4개지만 유형 안의 질문이 1~3개로 가변이다(총 4~8문항).
const STAGE_KEYS = ['termMemory', 'concept', 'analysisApply', 'judgeDesign'] as const
type StageKey = (typeof STAGE_KEYS)[number]

// 백엔드 stage type → i18n 키. 서버 label(한국어 고정)보다 i18n 라벨을 우선한다(영어 UI 대응).
const TYPE_TO_KEY: Record<string, StageKey> = {
  TERM_MEMORY: 'termMemory',
  CONCEPT: 'concept',
  ANALYSIS_APPLY: 'analysisApply',
  JUDGE_DESIGN: 'judgeDesign',
}

// 유형·서버값을 알 수 없을 때의 디딤돌 깊이 폴백 (v4 값)
const FALLBACK_MAX_SCAFFOLD_DEPTH = 2

type CheckpointMethod = SocraticCheckpointResult['method']

// 통과 방식별 노드 표현 — self(자력)가 가장 영예로운 스타일, fallback(힌트)은 중립색
const METHOD_STYLE: Record<CheckpointMethod, { node: string; label: string; dot: string }> = {
  self: { node: 'bg-indigo-600 text-white ring-2 ring-indigo-200', label: 'text-indigo-700', dot: 'bg-indigo-600' },
  scaffold1: { node: 'bg-emerald-500 text-white', label: 'text-emerald-700', dot: 'bg-emerald-500' },
  scaffold2: { node: 'bg-emerald-500 text-white', label: 'text-emerald-700', dot: 'bg-emerald-500' },
  scaffold3: { node: 'bg-emerald-500 text-white', label: 'text-emerald-700', dot: 'bg-emerald-500' },
  fallback: { node: 'bg-gray-200 text-gray-500', label: 'text-gray-500', dot: 'bg-gray-300' },
}

// 대표 통과 방식 선정용 순위 — 유형 안에 여러 문항이 있으면 가장 많은 도움을 받은 쪽으로 노드를 그린다.
// (자력만 모인 유형이 디딤돌·힌트가 섞인 유형과 같아 보이면 안 된다)
const METHOD_RANK: Record<CheckpointMethod, number> = {
  self: 0, scaffold1: 1, scaffold2: 1, scaffold3: 1, fallback: 2,
}

interface StageBlock {
  key: StageKey
  count: number
  start: number
}

/**
 * 패널에 그릴 유형 블록 4개를 만든다.
 *
 * 1순위는 서버 `stage_outline`(유형/문항수/시작인덱스). 구 백엔드·구 주제라 outline 이 없으면
 * stageTotal 을 유형 4개에 균등 배분해 폴백한다 — stageTotal 이 4면 유형당 1문항이 되어
 * v4 표현과 완전히 같아진다.
 */
function buildStageBlocks(
  outline: SocraticStageOutlineItem[], stageTotal: number,
): StageBlock[] {
  const fromOutline = outline
    .filter((b) => b && b.count > 0 && TYPE_TO_KEY[String(b.type ?? '').toUpperCase()])
    .map((b) => ({
      key: TYPE_TO_KEY[String(b.type ?? '').toUpperCase()],
      count: b.count,
      start: b.start_index,
    }))
  if (fromOutline.length > 0) return fromOutline

  // 폴백: 유형별 문항 수를 모르므로 균등 배분(나머지는 앞 유형에). 백엔드 배점 배분과 같은 규칙.
  const total = Math.max(0, stageTotal)
  const base = Math.floor(total / STAGE_KEYS.length)
  const remainder = total % STAGE_KEYS.length
  let cursor = 0
  return STAGE_KEYS.map((key, i) => {
    const count = base + (i < remainder ? 1 : 0)
    const block = { key, count, start: cursor }
    cursor += count
    return block
  }).filter((b) => b.count > 0)
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
  /** v5: 유형별 문항 개요. 없으면 stageTotal 을 4유형에 균등 배분해 폴백한다. */
  stageOutline?: SocraticStageOutlineItem[]
  phase: 'root' | 'scaffold' | 'retry_root' | 'fallback'
  scaffoldDepth: number
  /** v5: 현재 유형의 디딤돌 깊이 한계(2 또는 3). 0/미전달이면 2로 폴백. */
  maxScaffoldDepth?: number
  ahaCount: number
  checkpointResults: SocraticCheckpointResult[]
}

export default function SocraticScorePanel({
  topic, totalScore, praise, suggestion, abuseWarning, mastered,
  leaderboard, myStudentId, currentStage, stageTotal, stageOutline = [],
  phase, scaffoldDepth, maxScaffoldDepth = 0,
  ahaCount, checkpointResults,
}: Props) {
  const t = useTranslations('aiTutorChat')
  // index → 통과 결과. 백엔드가 배열로 주므로 조회용 map으로 한 번 접는다.
  const resultByIndex = new Map<number, SocraticCheckpointResult>(
    checkpointResults.map((r) => [r.index, r]),
  )
  const blocks = buildStageBlocks(stageOutline, stageTotal)
  // 디딤돌 깊이 한계는 유형마다 다르다(용어/판단 2, 개념/적용 3). 서버가 0을 주는 종료 상태와
  // 신규 필드가 없는 구 백엔드는 v4 값으로 폴백.
  const maxDepth = maxScaffoldDepth > 0 ? maxScaffoldDepth : FALLBACK_MAX_SCAFFOLD_DEPTH
  // 계단 칸 수 — phase가 root가 아니면 최소 1칸은 밟은 상태다.
  const stepCount = Math.min(maxDepth, Math.max(1, scaffoldDepth))
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
            {blocks.map((block, blockNo) => {
              const end = block.start + block.count - 1
              // 유형 내 각 문항의 통과 현황 — checkpoint_results 를 start_index~end 범위로 매칭한다.
              // 세션 복원 경로는 checkpointResults를 채우지 않고 currentStage만 복원한다.
              // 결과가 없어도 currentStage보다 앞선 체크포인트는 이미 통과한 것 —
              // "방식 미상 통과"로 중립 표시해야 잠김(회색 번호)으로 퇴행하지 않는다.
              const slots = Array.from({ length: block.count }, (_, n) => {
                const index = block.start + n
                const result = resultByIndex.get(index)
                return { index, result, impliedPass: !result && index < currentStage }
              })
              const results = slots.map((s) => s.result).filter(Boolean) as SocraticCheckpointResult[]
              const passedCount = slots.filter((s) => s.result || s.impliedPass).length
              const allPassed = passedCount === block.count
              const active = !allPassed && currentStage >= block.start && currentStage <= end
              // 유형 안에 문항이 여럿이면 가장 많은 도움을 받은 문항의 스타일로 노드를 대표시킨다.
              const topResult = results.length > 0
                ? results.reduce((a, b) => (METHOD_RANK[b.method] > METHOD_RANK[a.method] ? b : a))
                : null
              const style = allPassed && topResult ? METHOD_STYLE[topResult.method] : null
              const impliedPass = allPassed && !topResult
              const scoreSum = results.reduce((sum, r) => sum + r.score, 0)
              // "용어암기 1/2" 카운터 — 유형에 문항이 2개 이상일 때만 붙인다.
              // 분자는 **통과 수**다(진행 위치가 아니라). 진행 중 2문항 유형이 완료된 유형과
              // 똑같이 "2/2"로 보이면 안 되기 때문 — 통과 수는 단조 증가라 읽는 순간 뜻이 하나다.
              // (v4 4문항 주제는 전부 count 1 이라 카운터가 아예 렌더되지 않아 기존 표현 그대로다)
              const showCounter = block.count > 1
              return (
                <li key={`${block.key}-${block.start}`}>
                  <div className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${active ? 'bg-indigo-50 font-semibold text-indigo-700' : style ? style.label : impliedPass ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span
                      aria-hidden="true"
                      className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                        style ? style.node : impliedPass ? 'bg-gray-300 text-white' : active ? 'animate-pulse border border-indigo-500 text-indigo-600' : 'border border-gray-300 text-gray-400'
                      }`}
                    >
                      {topResult && allPassed
                        ? (topResult.method === 'self' ? '✓' : topResult.method === 'fallback' ? '◑' : <StairIcon />)
                        : impliedPass ? '✓' : blockNo + 1}
                    </span>
                    <span className="flex-1 truncate">
                      {t(`socraticStage.${block.key}`)}
                      {showCounter && (
                        <span className="ml-1 font-normal tabular-nums text-[10px] opacity-70">{passedCount}/{block.count}</span>
                      )}
                    </span>
                    {results.some((r) => r.aha) && <span aria-hidden="true">✨</span>}
                    {results.length > 0 && <span className="shrink-0 tabular-nums text-[10px] text-gray-400">+{scoreSum}</span>}
                  </div>
                  {/* 통과 방식 라벨 — 유형에 문항이 하나뿐일 때(구 주제 포함) */}
                  {block.count === 1 && results.length === 1 && (
                    <div className="pl-8 text-[10px] text-gray-400">{t(`socraticMethod.${results[0].method}`)}</div>
                  )}
                  {/* 문항이 여럿인 유형은 문항별 통과 방식을 점으로 압축해 보여준다 (세로 길이 유지) */}
                  {block.count > 1 && (active || allPassed) && (
                    <div className="flex items-center gap-1 pl-8 pt-0.5" aria-hidden="true">
                      {slots.map((s) => (
                        <span
                          key={s.index}
                          className={`h-1.5 w-1.5 rounded-full ${
                            s.result ? METHOD_STYLE[s.result.method].dot
                              : s.impliedPass ? 'bg-gray-300'
                              : s.index === currentStage ? 'bg-indigo-300'
                              : 'border border-gray-300'
                          }`}
                        />
                      ))}
                    </div>
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
