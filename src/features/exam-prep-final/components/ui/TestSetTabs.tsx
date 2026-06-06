/**
 * @file TestSetTabs.tsx
 * @description 1, 2, 3 탭 — 폴더 라벨 형태 (앞 탭은 회색 보더, 뒤로 갈수록 더 진한 보라)
 * @module features/exam-prep-final/components/ui
 */

'use client'

import { cn } from '@/shared/lib/utils'
import type { TestSetTab } from '../../types'

interface TestSetTabsProps {
  active: TestSetTab
  onChange: (tab: TestSetTab) => void
}

/**
 * 시각 변형 — 탭 배경은 panel 배경과 동일 (이어진 폴더 라벨 효과):
 * - 1번: 흰배경 + 회색 보더
 * - 2번: 연보라 #DEDEF8
 * - 3번: 중보라 #8F8DF0 (흰 글자)
 *
 * Active 탭은 z-index 최상위 + 하단 보더 제거 (컨텐츠 박스와 이어짐)
 */
const TAB_CONFIG: Array<{
  id: TestSetTab
  label: string
  inactiveBg: string
  inactiveText: string
  activeBg: string
  activeText: string
  activeBorder?: string
}> = [
  {
    id: 1,
    label: '1',
    inactiveBg: 'bg-white border border-gray-200',
    inactiveText: 'text-gray-500',
    activeBg: 'bg-white',
    activeText: 'text-gray-900',
    activeBorder: 'border-t border-x border-gray-200',
  },
  {
    id: 2,
    label: '2',
    inactiveBg: 'bg-[#DEDEF8]',
    inactiveText: 'text-[#6366F1]',
    activeBg: 'bg-[#DEDEF8]',
    activeText: 'text-[#383698]',
  },
  {
    id: 3,
    label: '3',
    inactiveBg: 'bg-[#8F8DF0]',
    inactiveText: 'text-white',
    activeBg: 'bg-[#8F8DF0]',
    activeText: 'text-white',
  },
]

export function TestSetTabs({ active, onChange }: TestSetTabsProps) {
  return (
    // h-16 고정 — 어떤 탭이 active이든 컨테이너 높이 불변, 컨텐츠 박스 들썩임 방지
    // gap-0 — 탭 사이 간격 제거 (폴더 라벨처럼 붙어있게)
    <div className="flex h-16 items-end gap-0">
      {TAB_CONFIG.map((cfg, index) => {
        const isActive = active === cfg.id
        return (
          <button
            key={String(cfg.id)}
            type="button"
            onClick={() => onChange(cfg.id)}
            className={cn(
              'relative min-w-[56px] rounded-t-2xl px-3 text-sm font-bold transition-colors md:min-w-[80px] md:px-[26px] md:text-lg',
              isActive
                ? `${cfg.activeBg} ${cfg.activeText} ${cfg.activeBorder ?? ''} z-10 -mb-px h-16`
                : `${cfg.inactiveBg} ${cfg.inactiveText} h-14 hover:opacity-90`,
            )}
            style={{
              // 비활성 탭은 살짝 뒤로 들어간 느낌
              zIndex: isActive ? 20 : 10 - index,
            }}
          >
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}
