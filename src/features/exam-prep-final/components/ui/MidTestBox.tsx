/**
 * @file MidTestBox.tsx
 * @description 중간 테스트 박스 — 검정 그라데이션 + 불꽃 슬롯 + 자물쇠
 * @module features/exam-prep-final/components/ui
 */

'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { MidTest } from '../../types'
import { SET_RANGES } from '../../domain/testSetGroups'

interface MidTestBoxProps {
  midTest: MidTest
  onClick?: () => void
}

export function MidTestBox({ midTest, onClick }: MidTestBoxProps) {
  const t = useTranslations()
  const range = SET_RANGES[midTest.setNumber]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!midTest.unlocked}
      className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-r from-[#3A3A3A] via-[#2A2A2A] to-[#1A1A1A] px-10 py-8 text-left text-white transition-all hover:brightness-110 disabled:cursor-not-allowed"
    >
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-4">
            <h3 className="text-2xl font-bold">
              {t('examPrepFinal.midTestTitle')}
            </h3>
            <span className="text-sm text-gray-300">
              {t('examPrepFinal.midTestMeta', {
                minutes: midTest.minutes,
                questions: midTest.questions,
              })}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-300">
            {t('examPrepFinal.midTestDescription', {
              start: String(range.start).padStart(2, '0'),
              end: String(range.end).padStart(2, '0'),
              setNumber: midTest.setNumber,
            })}
          </p>

          {/* 불꽃 슬롯 — totalCoreInSet 만큼, 앞부터 masteredCount 만큼 보라 */}
          <div className="mt-5 flex items-center gap-2">
            {Array.from({ length: midTest.totalCoreInSet }).map((_, i) => {
              const isMastered = i < midTest.masteredCount
              return (
                <Image
                  key={i}
                  src={
                    isMastered
                      ? '/마스터 불꽃 보라.png'
                      : '/마스터 불꽃 비활성.png'
                  }
                  alt=""
                  width={32}
                  height={32}
                />
              )
            })}
          </div>
        </div>

        {!midTest.unlocked && (
          <div className="shrink-0 self-center">
            <Image src="/자물쇠.png" alt="" width={72} height={72} />
          </div>
        )}
      </div>
    </button>
  )
}
