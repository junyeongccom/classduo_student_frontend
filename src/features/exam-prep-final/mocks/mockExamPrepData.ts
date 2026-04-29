/**
 * @file mockExamPrepData.ts
 * @description 기말 대비 학습 mock 데이터 (백엔드 연동 전 임시)
 * @module features/exam-prep-final/mocks
 */

import type { CoreTest, ExamPrepData } from '../types'
import { SET_RANGES } from '../domain/testSetGroups'

/** 오늘부터 target 까지 일수 (자정 기준, 음수면 0) */
function computeDdayToTarget(targetIso: string): number {
  const target = new Date(targetIso)
  if (Number.isNaN(target.getTime())) return 0
  target.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = target.getTime() - today.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  return Math.max(0, days)
}

/** 1~26 핵심테스트 mock 생성 */
function buildCoreTests(): CoreTest[] {
  const tests: CoreTest[] = []
  for (let n = 1; n <= 26; n++) {
    const setNumber: 1 | 2 | 3 =
      n <= SET_RANGES[1].end ? 1 : n <= SET_RANGES[2].end ? 2 : 3
    // 주차/차시 mock: 핵심테스트 1=1주차1차시, 2=1주차2차시... (1주차=2개씩)
    const weekNo = Math.floor((n - 1) / 2) + 1
    const sessionNo = ((n - 1) % 2) + 1

    // 마스터 상태 mock: 1, 2번만 mastered, 3번부터는 일부 available
    let status: CoreTest['status']
    if (n <= 2) status = 'mastered'
    else if (n === 3) status = 'available'
    else status = 'locked'

    tests.push({
      id: `core-${n}`,
      number: n,
      setNumber,
      weekNo,
      sessionNo,
      lectureTitle: `${weekNo}주차 ${sessionNo}차시 단원`,
      masteryLevel: status === 'mastered' ? 1 : status === 'available' ? 0.4 : 0,
      status,
      metaCounts: {
        gray: status === 'locked' ? 0 : 16,
        cyan: status === 'locked' ? 0 : 3,
        green: status === 'mastered' ? 1 : 0,
      },
      isTestMastered: status === 'mastered',
    })
  }
  return tests
}

export function getMockExamPrepData(): ExamPrepData {
  const coreTests = buildCoreTests()
  const masteredCount = coreTests.filter((t) => t.status === 'mastered').length

  // 기말고사 D-day 계산 — 2026-06-22 기준
  const examDate = '2026-06-22'
  const ddays = computeDdayToTarget(examDate)

  return {
    examDate,
    ddays,
    totalCoreTests: 26,
    masteredCount,
    recommendedTest:
      coreTests.find((t) => t.status === 'available') ?? coreTests[0],
    coreTests,
    midTests: [
      {
        setNumber: 1,
        minutes: 15,
        questions: 20,
        totalCoreInSet: 9,
        masteredCount: coreTests.filter(
          (t) => t.setNumber === 1 && t.status === 'mastered',
        ).length,
        unlocked: false,
      },
      {
        setNumber: 2,
        minutes: 15,
        questions: 20,
        totalCoreInSet: 9,
        masteredCount: 0,
        unlocked: false,
      },
      {
        setNumber: 3,
        minutes: 15,
        questions: 20,
        totalCoreInSet: 8,
        masteredCount: 0,
        unlocked: false,
      },
    ],
    finalTest: {
      minutes: 15,
      questions: 20,
      unlocked: false,
      setMasterStates: [true, false, false],
    },
  }
}
