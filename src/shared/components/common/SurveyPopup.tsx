/**
 * @file SurveyPopup.tsx
 * @description 설문조사 안내 팝업 (오늘 하루 보지 않기 기능 포함)
 * @module shared/components/common
 * @dependencies react, lucide-react
 */
'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink } from 'lucide-react'

const SURVEY_URL =
  'https://forms.office.com/pages/responsepage.aspx?id=BI6Km1cMUUee2la_YE4FxlBp7ANRiWhCmKTD8AKQjGNURDJDTVNDQjRBWEczVVVDQzc2UVlLU0tLMC4u&route=shorturl'

const STORAGE_KEY = 'survey_popup_dismissed_date'

function isDismissedToday(): boolean {
  const dismissed = localStorage.getItem(STORAGE_KEY)
  if (!dismissed) return false
  const today = new Date().toISOString().slice(0, 10)
  return dismissed === today
}

export function SurveyPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [dontShowToday, setDontShowToday] = useState(false)

  useEffect(() => {
    if (!isDismissedToday()) {
      setIsOpen(true)
    }
  }, [])

  const handleClose = () => {
    if (dontShowToday) {
      const today = new Date().toISOString().slice(0, 10)
      localStorage.setItem(STORAGE_KEY, today)
    }
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* 상단 크림슨 배너 */}
        <div className="relative bg-[#8B0029] px-6 pb-5 pt-6">
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <img
              src="/KU_logo.png"
              alt="고려대학교"
              className="h-10 shrink-0 rounded-lg bg-white/90 object-contain p-1"
            />
            <div>
              <h2 className="text-lg font-bold text-white">
                Aplus 서비스 사용 설문
              </h2>
              <p className="text-sm text-white/80">
                고려대학교 AI조교 프로그램
              </p>
            </div>
          </div>
        </div>

        {/* 본문 */}
        <div className="px-6 py-5">
          <p className="text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
            안녕하세요, <strong className="text-[#8B0029] dark:text-red-400">고려대학교</strong> 학우 여러분!
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-gray-700 dark:text-gray-300">
            더 나은 <strong>Aplus</strong> 서비스를 만들기 위해 여러분의 소중한 의견을 듣고자 합니다.
            잠깐의 시간을 내어 설문에 참여해 주시면 큰 도움이 됩니다.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            소요 시간: 약 2~3분
          </p>

          {/* 설문 참여 버튼 */}
          <a
            href={SURVEY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B0029] px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-[#6D0020] hover:shadow-xl active:scale-[0.98]"
          >
            설문 참여하기
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {/* 하단: 오늘 하루 보지 않기 */}
        <div className="border-t border-gray-100 px-6 py-3 dark:border-gray-800">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              checked={dontShowToday}
              onChange={(e) => setDontShowToday(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#8B0029] accent-[#8B0029]"
            />
            오늘 하루 보지 않기
          </label>
        </div>
      </div>
    </div>
  )
}
