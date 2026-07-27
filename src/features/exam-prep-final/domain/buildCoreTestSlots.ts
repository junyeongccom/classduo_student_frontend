/**
 * @file buildCoreTestSlots.ts
 * @description 백엔드 core 테스트 목록 → 핵심테스트 슬롯 배열로 변환하는 순수 함수
 * @module features/exam-prep-final/domain
 * @dependencies testSetGroups(SET_RANGES), types(CoreTest)
 *
 * 정책 (구 coreTestLectureMap 고정 26슬롯 방식 폐지):
 *   - 슬롯 개수 = 백엔드가 반환한 core 테스트 개수. 0개면 빈 배열.
 *   - 회차 번호 고정 매핑(1~26 ↔ lecture_no 2~13/16~29)을 더 이상 쓰지 않는다.
 *     따라서 26개 상한이 사라지고, 29개를 가진 운영 과목은 29개가 그대로 노출된다.
 *     (의도된 변화 — 실제 생성된 테스트를 있는 그대로 보여주는 것이 목표)
 *   - 같은 회차(lecture_session_id)에 core 테스트가 여러 개인 과목을 지원한다.
 *     회차 단위 Map 으로 접으면 1개만 살아남으므로, 테스트 리스트 자체를 슬롯 단위로 쓴다.
 */

import type { CoreTest, CoreTestStatus } from '../types'
import { SET_RANGES } from './testSetGroups'

/** 슬롯 생성에 필요한 백엔드 core 테스트 최소 필드 (CoreTestSummaryDto 의 부분집합) */
export interface CoreTestSlotSource {
  test_id: string
  lecture_session_id: string
  lecture_no: number
  title: string | null
  question_count: number
  is_mastered: boolean
  topic_title?: string | null
  topic_title_eng?: string | null
}

/** 슬롯에 붙일 회차 메타 (useLectures 의 Lecture 부분집합) */
export interface CoreTestSlotLecture {
  id: string
  title: string | null
  week_number: number | null
  session_number: number | null
  essence_7words: string | null
}

/**
 * 표시 번호(1-based) → 세트 번호.
 * SET_RANGES(1~10 / 11~18 / 19~26) 기준. 슬롯이 26개를 넘으면 전부 3세트로 흡수되고,
 * 26개보다 적으면 뒤쪽 세트는 비어 기존 빈 상태 UI(examPrepFinal.setEmpty)가 노출된다.
 */
export function resolveSetNumber(displayNumber: number): 1 | 2 | 3 {
  if (displayNumber <= SET_RANGES[1].end) return 1
  if (displayNumber <= SET_RANGES[2].end) return 2
  return 3
}

/**
 * 결정론적 정렬 — lecture_no 오름차순 → 동률이면 test_id 오름차순.
 * (같은 회차에 테스트가 여러 개인 과목에서 순서가 매 렌더 흔들리지 않도록)
 */
export function sortCoreTestSources<T extends CoreTestSlotSource>(tests: T[]): T[] {
  return [...tests].sort((a, b) => {
    const la = Number.isFinite(a.lecture_no) ? a.lecture_no : 0
    const lb = Number.isFinite(b.lecture_no) ? b.lecture_no : 0
    if (la !== lb) return la - lb
    return a.test_id.localeCompare(b.test_id)
  })
}

interface BuildCoreTestSlotsArgs {
  /** 백엔드 core 테스트 목록 (정렬 전) */
  tests: CoreTestSlotSource[]
  /** lecture_session_id → 회차 메타 */
  lectureById: Map<string, CoreTestSlotLecture>
  /** locale-aware 폴백 제목 — '{week}주차 {session}차시' / 'W{week} S{session}' */
  fallbackTitle: (week: number, session: number) => string
}

/** 백엔드 core 테스트 목록을 그대로 슬롯 배열로 변환한다. */
export function buildCoreTestSlots({
  tests,
  lectureById,
  fallbackTitle,
}: BuildCoreTestSlotsArgs): CoreTest[] {
  return sortCoreTestSources(tests).map((api, index) => {
    const displayNumber = index + 1
    const lecture = lectureById.get(api.lecture_session_id)
    const weekNo = lecture?.week_number ?? 0
    const sessionNo = lecture?.session_number ?? 0

    // 문항 0개(껍데기 테스트)는 '콘텐츠 없음' 으로 locked. 최종 status 는 호출부의
    // sequential 잠금 패스에서 재계산될 수 있으므로 여기서는 "후보 available" 의미.
    const status: CoreTestStatus = api.question_count > 0 ? 'available' : 'locked'

    const topicTitle = api.topic_title?.trim() || undefined
    const topicTitleEng = api.topic_title_eng?.trim() || undefined
    // 표시 제목 — 주제명이 있으면 주제명, 없으면 기존처럼 회차 제목.
    //   (같은 회차에 테스트가 여러 개면 회차 제목만으론 구분이 안 되므로 주제명 우선)
    const lectureTitle =
      topicTitle ||
      lecture?.title?.trim() ||
      api.title?.trim() ||
      lecture?.essence_7words?.trim() ||
      fallbackTitle(weekNo, sessionNo)

    return {
      id: api.test_id,
      number: displayNumber,
      setNumber: resolveSetNumber(displayNumber),
      weekNo,
      sessionNo,
      lectureTitle,
      masteryLevel: 0, // v1: mastery 데이터 없음
      status,
      metaCounts: {
        gray: status === 'locked' ? 0 : api.question_count,
        cyan: 0,
        green: 0,
      },
      isTestMastered: api.is_mastered,
      topicTitle,
      topicTitleEng,
    }
  })
}
