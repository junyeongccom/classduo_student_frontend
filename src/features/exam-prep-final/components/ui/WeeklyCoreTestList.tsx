/**
 * @file WeeklyCoreTestList.tsx
 * @description 핵심주제 학습 주차 그룹 리스트 (2026-09 UI 개편 B안) — 주차 헤더 + 회차 행(제목·진행률·상태)
 * @module features/exam-prep-final/components/ui
 * @dependencies types(CoreTest, MidTest), MidTestBox, next-intl
 */
'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Lock } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { CoreTest, MidTest } from '../../types'
import { MidTestBox } from './MidTestBox'

interface WeeklyCoreTestListProps {
  coreTests: CoreTest[]
  midTests: MidTest[]
  courseId: string
  selectedCoreId: string | null
  selectedMidSet: 1 | 2 | 3 | null
  onSelectCore: (id: string) => void
  onSelectMid: (setNumber: 1 | 2 | 3) => void
}

/** weekNo 기준 그룹핑 (0 = 주차 미상 → 맨 뒤 '기타') */
function groupByWeek(tests: CoreTest[]): Array<{ weekNo: number; tests: CoreTest[] }> {
  const map = new Map<number, CoreTest[]>()
  for (const t of tests) {
    const key = t.weekNo || 0
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === 0 ? 1 : b === 0 ? -1 : a - b))
    .map(([weekNo, list]) => ({
      weekNo,
      tests: list.sort((x, y) => x.sessionNo - y.sessionNo || x.number - y.number),
    }))
}

export function WeeklyCoreTestList({
  coreTests,
  midTests,
  courseId,
  selectedCoreId,
  selectedMidSet,
  onSelectCore,
  onSelectMid,
}: WeeklyCoreTestListProps) {
  const t = useTranslations()
  const tw = useTranslations('examPrepFinal.weekly')

  const visible = useMemo(
    () => coreTests.filter((c) => c.status !== 'locked'),
    [coreTests],
  )
  const groups = useMemo(() => groupByWeek(visible), [visible])

  return (
    <div className="flex flex-col gap-8">
      {groups.map(({ weekNo, tests }) => {
        const masteredInWeek = tests.filter((x) => x.isTestMastered).length
        return (
          <section key={weekNo}>
            {/* 주차 헤더 */}
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-lg bg-[#6366F1]/10 px-3 py-1 text-sm font-bold text-[#6366F1]">
                {weekNo > 0 ? tw('weekLabel', { week: weekNo }) : t('examPrepFinal.testSets')}
              </span>
              <span className="text-sm text-gray-400">
                {tw('weekSummary', { done: masteredInWeek, total: tests.length })}
              </span>
              <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* 테스트 행 */}
            <ul className="flex flex-col gap-2.5">
              {tests.map((test) => {
                const isSelected = selectedCoreId === test.id
                const pct = Math.round(test.masteryLevel * 100)
                return (
                  <li key={test.id}>
                    <button
                      type="button"
                      onClick={() => onSelectCore(test.id)}
                      className={cn(
                        'flex w-full items-center gap-4 rounded-2xl border bg-white px-4 py-3.5 text-left transition-all md:px-5',
                        'hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900',
                        test.isTestMastered
                          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-900/15'
                          : 'border-gray-200 dark:border-gray-700',
                        isSelected && 'border-[#6366F1] ring-2 ring-[#6366F1]/25',
                      )}
                    >
                      {/* 번호 */}
                      <span
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold tabular-nums',
                          test.isTestMastered
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-[#6366F1]/10 text-[#6366F1]',
                        )}
                      >
                        {test.isTestMastered ? <Check className="h-5 w-5" strokeWidth={3} /> : String(test.number).padStart(2, '0')}
                      </span>

                      {/* 제목·메타 */}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-gray-900 dark:text-gray-50">
                          {test.lectureTitle}
                        </span>
                        <span className="block truncate text-xs text-gray-400">
                          {test.sessionNo > 0 && `${tw('sessionLabel', { session: test.sessionNo })} · `}
                          {test.isTestMastered
                            ? tw('allMastered')
                            : test.masteredQuestionCount > 0
                              ? tw('masteredOf', { done: test.masteredQuestionCount, count: test.questionCount })
                              : `${tw('questions', { count: test.questionCount })} · ${tw('notStarted')}`}
                        </span>
                      </span>

                      {/* 진행바 + % (데스크톱) */}
                      <span className="hidden w-40 shrink-0 items-center gap-2.5 md:flex">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                          <span
                            className={cn('block h-full rounded-full', test.isTestMastered ? 'bg-emerald-500' : 'bg-[#6366F1]')}
                            style={{ width: `${test.isTestMastered ? 100 : pct}%` }}
                          />
                        </span>
                        <span
                          className={cn(
                            'w-10 text-right text-xs font-bold tabular-nums',
                            test.isTestMastered ? 'text-emerald-600' : 'text-[#6366F1]',
                          )}
                        >
                          {test.isTestMastered ? 100 : pct}%
                        </span>
                      </span>

                      {/* 상태 버튼(시각) */}
                      <span
                        className={cn(
                          'shrink-0 rounded-xl px-4 py-2 text-xs font-bold',
                          test.isTestMastered
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-[#6366F1] text-white',
                        )}
                      >
                        {test.isTestMastered ? tw('redo') : pct > 0 ? tw('resume') : tw('start')}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      {/* 중간점검 테스트 — 구간 마스터 시 해금되는 서술형 (기존 세트 게이트 로직 유지) */}
      {midTests.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-lg bg-[#383698]/10 px-3 py-1 text-sm font-bold text-[#383698] dark:bg-[#383698]/30 dark:text-[#a5a3f0]">
              <Lock className="h-3.5 w-3.5" />
              {tw('midSection')}
            </span>
            <span className="text-sm text-gray-400">{tw('midSectionDesc')}</span>
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((setNo) => {
              const mid = midTests.find((m) => m.setNumber === setNo)
              if (!mid) return null
              return (
                <MidTestBox
                  key={setNo}
                  midTest={mid}
                  courseId={courseId}
                  isSelected={selectedMidSet === setNo}
                  onClick={() => onSelectMid(setNo as 1 | 2 | 3)}
                />
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
