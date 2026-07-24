/**
 * @file SocraticScorePanel.tsx
 * @description 소크라 문답 우측 패널 — 5축 점수(축당 20 상한) + 동료 캐릭터 피드백 + 과목 랭킹
 * @module features/ai-tutor
 * @dependencies public/topic_test/hero-{female,male}.png
 */
import type { SocraticTopic, SocraticAxisScores, SocraticLeaderboardEntry } from '../../types'

const AXIS_LABELS: [keyof SocraticAxisScores, string][] = [
  ['concept', '개념이해'], ['example', '예시활용'], ['logic', '논리적전개'],
  ['self_awareness', '자기인식'], ['exploration', '적극적탐구'],
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
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      {/* 주제 + 총점 */}
      <div>
        <div className="text-xs text-gray-500">소크라 문답 · {topic.title}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-indigo-600">{totalScore}</span>
          <span className="text-sm text-gray-400">/ 100</span>
          {mastered && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">마스터!</span>}
        </div>
      </div>
      {/* 5축 게이지 */}
      <div className="space-y-2">
        {AXIS_LABELS.map(([key, label]) => (
          <div key={key}>
            <div className="flex justify-between text-xs">
              <span>{label}</span>
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
        <div className="rounded-lg bg-red-50 p-2 text-xs text-red-600">비슷한 말을 반복하면 점수가 깎여요. 주제로 돌아가 볼까요?</div>
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
        <div className="mb-1 text-xs font-semibold text-gray-500">랭킹</div>
        <ol className="space-y-1">
          {leaderboard.map((e, i) => (
            <li key={e.student_id}
              className={`flex items-center justify-between rounded-lg px-2 py-1 text-xs ${e.student_id === myStudentId ? 'bg-indigo-50 font-semibold' : ''}`}>
              <span>{i + 1}위 · {e.name}</span>
              <span className="tabular-nums">{e.total_score}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
