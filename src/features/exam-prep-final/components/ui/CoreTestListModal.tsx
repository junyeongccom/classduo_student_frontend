/**
 * @file CoreTestListModal.tsx
 * @description '테스트 세트' 옆 "목록" 클릭 시 노출되는 핵심테스트 26개 주제 목록 모달.
 *   각 행 = 테스트번호 · 강의자료명 · 주제명. 주제명은 summary에 없어 test별 detail fetch
 *   (SelectedTestInfoCard와 동일 소스)로 채우며, 백엔드 미생성 슬롯은 강의자료명/폴백만 표시.
 * @module features/exam-prep-final/components/ui
 * @dependencies next-intl, I18nProvider, examPrepService.fetchCoreTestDetail
 */

'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { fetchCoreTestDetail } from '../../services/examPrepService'
import type { CoreTest } from '../../types'

interface CoreTestListModalProps {
  /** 핵심테스트 26개 (서술형 중간테스트 제외 — coreTests만 전달). */
  coreTests: CoreTest[]
  onClose: () => void
}

/** test.id 가 백엔드 UUID 인지 (lecture-/placeholder- prefix 가 아닌지) */
function isBackendTestId(id: string): boolean {
  return !id.startsWith('lecture-') && !id.startsWith('placeholder-')
}

export function CoreTestListModal({ coreTests, onClose }: CoreTestListModalProps) {
  const t = useTranslations('examPrepFinal')
  const { locale } = useI18n()
  const isEn = locale === 'en'

  // test.id → 1순위 주제(주제명). 미해결/미생성 슬롯은 키 없음.
  const [topics, setTopics] = useState<Record<string, string>>({})

  // 번호순 정렬 (data.coreTests 는 이미 1~26 순서지만 방어적으로 정렬)
  const sorted = [...coreTests].sort((a, b) => a.number - b.number)

  // 모달 오픈 시 백엔드 생성된 테스트의 주제명을 병렬 조회. (summary 응답엔 주제 없음)
  useEffect(() => {
    let alive = true
    const ids = sorted.filter((c) => isBackendTestId(c.id)).map((c) => c.id)
    if (ids.length === 0) return
    Promise.all(
      ids.map(async (id) => {
        const { data } = await fetchCoreTestDetail(id)
        // exam_prep_topic(detail.topic_title) 우선. 구 테스트는 첫 문항 source_ref.topic_title 폴백.
        const fromTable = isEn
          ? ((data?.topic_title_eng ?? data?.topic_title) ?? '').trim()
          : (data?.topic_title ?? '').trim()
        const fromQuestion = (
          data?.questions?.find((q) => q.source_ref?.topic_title?.trim())?.source_ref
            ?.topic_title ?? ''
        ).trim()
        return [id, fromTable || fromQuestion] as const
      }),
    ).then((entries) => {
      if (!alive) return
      const map: Record<string, string> = {}
      for (const [id, topic] of entries) {
        if (topic) map[id] = topic
      }
      setTopics(map)
    })
    return () => {
      alive = false
    }
    // sorted 는 매 렌더 새 배열이라 의존성에서 제외 — coreTests 길이/locale 변경 시에만 재조회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreTests, isEn])

  // ESC 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4 py-8"
      style={{ fontFamily: 'Pretendard, sans-serif' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('coreTestList.title')}
    >
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800 md:px-7 md:py-5">
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 md:text-lg">
            {t('coreTestList.title')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('coreTestList.close')}
            className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 컬럼 헤더 — 번호 · 강의자료명 · 주제명 */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-2.5 text-xs font-semibold text-gray-400 dark:border-gray-800 md:px-7">
          <span className="w-8 shrink-0 text-center">{t('coreTestList.colNumber')}</span>
          <div className="grid flex-1 gap-1 md:grid-cols-2 md:gap-4">
            <span>{t('coreTestList.colLecture')}</span>
            <span className="hidden md:block">{t('coreTestList.colTopic')}</span>
          </div>
        </div>

        {/* 목록 — 26개 스크롤 영역 */}
        <ul className="min-h-0 flex-1 overflow-y-auto px-5 md:px-7">
          {sorted.length === 0 ? (
            <li className="py-10 text-center text-sm text-gray-400">
              {t('coreTestList.empty')}
            </li>
          ) : (
            sorted.map((test) => {
              const numberLabel = String(test.number).padStart(2, '0')
              const lectureName =
                (test.lectureTitle ?? '').trim() ||
                t('weekSession', { week: test.weekNo, session: test.sessionNo })
              const topic = topics[test.id] ?? ''
              return (
                <li
                  key={test.id}
                  className="flex items-start gap-3 border-b border-gray-50 py-3 last:border-b-0 dark:border-gray-800/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {numberLabel}
                  </span>
                  <div className="grid flex-1 gap-0.5 md:grid-cols-2 md:items-center md:gap-4">
                    <span className="min-w-0 break-keep text-sm font-medium text-gray-500 dark:text-gray-400">
                      {lectureName}
                    </span>
                    <span className="min-w-0 break-keep text-sm font-semibold text-gray-900 dark:text-gray-50">
                      {topic || '—'}
                    </span>
                  </div>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
