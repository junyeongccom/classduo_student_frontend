/**
 * @file FinalTestPanel.tsx
 * @description Final 탭 클릭 시 컨텐츠 박스 전체를 차지하는 진보라 패널
 * @module features/exam-prep-final/components/ui
 */

'use client'

import Image from 'next/image'
import { Check, Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/shared/lib/utils'
import type { FinalTest } from '../../types'

interface FinalTestPanelProps {
  finalTest: FinalTest
  /** unlocked 상태에서 클릭 시 풀이 페이지 라우팅 */
  onStart?: () => void
}

export function FinalTestPanel({ finalTest, onStart }: FinalTestPanelProps) {
  const t = useTranslations()

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center text-white">
      <h2 className="whitespace-pre-line text-4xl font-black leading-tight tracking-tight">
        {t('examPrepFinal.finalTitle')}
      </h2>
      <div className="mt-4 flex items-center gap-6 text-sm font-medium opacity-90">
        <span>{t('examPrepFinal.finalMeta', { minutes: finalTest.minutes })}</span>
        <span>
          {t('examPrepFinal.finalQuestions', { questions: finalTest.questions })}
        </span>
        <span>{t('examPrepFinal.finalUnlockHint')}</span>
      </div>
      <p className="mt-4 max-w-md text-sm leading-relaxed opacity-80">
        {t('examPrepFinal.finalDescription')}
      </p>

      {/* 1, 2, 3 세트 마스터 표시 */}
      <div className="mt-10 flex items-center gap-12">
        {finalTest.setMasterStates.map((mastered, i) => (
          <div key={i} className="flex flex-col items-center gap-3">
            <span className={cn('text-3xl font-bold', mastered ? 'text-white' : 'text-white/40')}>
              {i + 1}
            </span>
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed',
                mastered
                  ? 'border-white text-white'
                  : 'border-white/40 text-white/40',
              )}
            >
              {mastered && <Check className="h-6 w-6" />}
            </div>
          </div>
        ))}
      </div>

      {/* unlocked: 시작하기 버튼 / locked: 큰 자물쇠 */}
      {finalTest.unlocked && finalTest.testId ? (
        <button
          type="button"
          onClick={onStart}
          className="mt-10 flex h-20 w-72 items-center justify-center gap-3 rounded-2xl bg-white text-[#383698] shadow-lg transition-transform hover:scale-[1.02]"
        >
          <Play className="h-6 w-6 fill-[#383698]" />
          <span className="text-lg font-bold">{t('examPrepFinal.startCta')}</span>
        </button>
      ) : (
        <div className="mt-10 flex h-20 w-72 items-center justify-center rounded-2xl bg-white/15">
          <Image src="/자물쇠.png" alt="" width={40} height={40} />
        </div>
      )}
    </div>
  )
}
