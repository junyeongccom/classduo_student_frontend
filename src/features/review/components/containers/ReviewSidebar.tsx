/**
 * 복습 콘텐츠 우측 사이드바
 * - 강의 선택 드롭다운
 * - 선택된 강의의 회차 리스트 (수업일, 본질한줄)
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, BookOpen, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLectureList } from '@/features/review/hooks/useReview'
import { useReviewCourses } from '@/features/review/hooks/useReviewCourses'
import { useGameStatus } from '@/features/review/hooks/useGameStatus'
import { ReviewLoading } from '@/features/review'
import { useAuthStore } from '@/features/auth/store/authStore'
import {
  hasVisitedStudyspaceTab,
  markVisitedStudyspaceTab,
  pickLatestLectureId,
} from '@/shared/lib/studyspaceSelection'
import { useStudyspaceSelectionStore } from '@/shared/store/useStudyspaceSelectionStore'

// 날아가는 불꽃 애니메이션 상태
interface FlyingFlame {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  lectureId: string
  courseId: string
}

interface ReviewSidebarProps {
  selectedLectureId: string | null
  onSelectLectureId: (lectureId: string | null) => void
  onCourseIdChange?: (courseId: string | null) => void // 강의 ID 변경 콜백
}

// 데이터베이스에서 오는 "분석 중" 상태 값 (하드코딩된 한국어 문자열)
const ANALYZING_STATUS = '분석 중'

export function ReviewSidebar({ selectedLectureId, onSelectLectureId, onCourseIdChange }: ReviewSidebarProps) {
  const t = useTranslations('review')
  const { courses, isLoading: isLoadingCourses, error: coursesError } = useReviewCourses()
  const { gameProgress, flameCount, claimedRewards, claimReward } = useGameStatus()
  const userId = useAuthStore(state => state.user?.user_id ?? null)
  
  const {
    courseId: selectedCourseId,
    lectureIds: sharedLectureIds,
    updatedAt: sharedUpdatedAt,
    isHydrated: isSharedHydrated,
    setSelection: setSharedSelection,
  } = useStudyspaceSelectionStore(state => ({
    courseId: state.courseId,
    lectureIds: state.lectureIds,
    updatedAt: state.updatedAt,
    isHydrated: state.isHydrated,
    setSelection: state.setSelection,
  }))
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [flyingFlames, setFlyingFlames] = useState<FlyingFlame[]>([]) // 날아가는 불꽃들
  const [flameHighlight, setFlameHighlight] = useState(false) // 불꽃 카운터 강조 효과
  const [showFlameTooltip, setShowFlameTooltip] = useState(false) // 불꽃 툴팁 표시 여부
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; arrowLeft: number } | null>(null)
  const lectureButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [pendingSharedLectureIds, setPendingSharedLectureIds] = useState<string[] | null>(null)
  const [shouldAutoSelectLatest, setShouldAutoSelectLatest] = useState(false)
  const syncingFromSharedRef = useRef<number | null>(null)
  
  // refs
  const flameCounterRef = useRef<HTMLDivElement>(null) // 불꽃 카운터 위치 참조
  const treasureRefs = useRef<{ [lectureId: string]: HTMLImageElement | null }>({}) // 보물상자 위치 참조

  const { data: lectureList, isLoading: isLoadingLectures } = useLectureList(selectedCourseId)

  useEffect(() => {
    if (!isSharedHydrated) return
    if (selectedCourseId || sharedLectureIds.length > 0) {
      syncingFromSharedRef.current = sharedUpdatedAt
      onCourseIdChange?.(selectedCourseId)
      if (sharedLectureIds.length <= 1) {
        onSelectLectureId(sharedLectureIds[0] ?? null)
        setPendingSharedLectureIds(null)
      } else {
        setPendingSharedLectureIds(sharedLectureIds)
      }
      setShouldAutoSelectLatest(false)
      return
    }

    const visited = hasVisitedStudyspaceTab('review', userId)
    if (!visited) {
      setShouldAutoSelectLatest(true)
      markVisitedStudyspaceTab('review', userId)
    } else {
      setShouldAutoSelectLatest(false)
    }
  }, [
    isSharedHydrated,
    selectedCourseId,
    sharedLectureIds,
    sharedUpdatedAt,
    userId,
    onSelectLectureId,
    onCourseIdChange,
  ])

  const getLatestCourseId = (list: typeof courses) => {
    const candidates = list
      .map(course => {
        const latestLecture = (course.lectures || []).reduce<{
          lecture_id: string
          lecture_date: string
        } | null>((latest, lec) => {
          if (!lec?.lecture_date) return latest
          if (!latest) return { lecture_id: lec.lecture_id, lecture_date: lec.lecture_date }
          return new Date(lec.lecture_date).getTime() > new Date(latest.lecture_date).getTime()
            ? { lecture_id: lec.lecture_id, lecture_date: lec.lecture_date }
            : latest
        }, null)
        return latestLecture ? { course_id: course.course_id, lecture_date: latestLecture.lecture_date } : null
      })
      .filter(Boolean) as Array<{ course_id: string; lecture_date: string }>

    if (candidates.length === 0) return list[0]?.course_id ?? null
    return candidates.sort((a, b) => new Date(b.lecture_date).getTime() - new Date(a.lecture_date).getTime())[0].course_id
  }

  // 최초 진입 시 최신 수업 자동 선택
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId && !pendingSharedLectureIds) {
      const nextCourseId = shouldAutoSelectLatest ? getLatestCourseId(courses) : courses[0].course_id
      setSharedSelection({
        courseId: nextCourseId,
        lectureIds: [],
        source: 'review',
      })
      onCourseIdChange?.(nextCourseId)
    }
  }, [
    courses,
    selectedCourseId,
    onCourseIdChange,
    pendingSharedLectureIds,
    shouldAutoSelectLatest,
    setSharedSelection,
  ])

  // 보물상자 클릭 핸들러 (보상 수령)
  const handleTreasureClick = (lectureId: string, courseId: string, e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation() // 부모 버튼 클릭 방지
    
    const progress = gameProgress[lectureId] || 0
    const alreadyClaimed = claimedRewards[lectureId]
    
    // 진행도 10 미만이거나 이미 수령했으면 무시
    if (progress < 10 || alreadyClaimed) return
    
    // 보물상자 위치 가져오기
    const treasureEl = treasureRefs.current[lectureId]
    const counterEl = flameCounterRef.current
    
    if (!treasureEl || !counterEl) return
    
    const treasureRect = treasureEl.getBoundingClientRect()
    const counterRect = counterEl.getBoundingClientRect()
    
    // 보상 수령 처리 (Hook 사용)
    claimReward(lectureId, courseId)
    
    // 불꽃 애니메이션 시작 (시각적 효과만)
    const flameId = `flame-${lectureId}-${Date.now()}`
    const newFlame: FlyingFlame = {
      id: flameId,
      startX: treasureRect.left + treasureRect.width / 2,
      startY: treasureRect.top + treasureRect.height / 2,
      endX: counterRect.left + counterRect.width / 2,
      endY: counterRect.top + counterRect.height / 2,
      lectureId,
      courseId,
    }
    
    setFlyingFlames(prev => [...prev, newFlame])
    
    // 애니메이션 완료 후 UI 업데이트 (800ms 후)
    setTimeout(() => {
      // 불꽃 카운터 강조 효과
      setFlameHighlight(true)
      setTimeout(() => setFlameHighlight(false), 600)
      
      // 날아가는 불꽃 제거
      setFlyingFlames(prev => prev.filter(f => f.id !== flameId))
    }, 800)
  }

  // 강의 선택 시 회차 선택 초기화
  const handleSelectCourse = (courseId: string) => {
    setSharedSelection({
      courseId,
      lectureIds: [],
      source: 'review',
    })
    setIsDropdownOpen(false)
    onSelectLectureId(null) // 회차 선택 초기화
    onCourseIdChange?.(courseId) // 강의 ID 변경 알림
  }

  // 회차 선택
  const handleSelectLecture = (lectureId: string, essence7words: string | null) => {
    // "분석 중" 상태인 경우 클릭 불가 (데이터베이스 값은 하드코딩된 한국어 "분석 중")
    if (essence7words === ANALYZING_STATUS || !essence7words) {
      return
    }
    const nextLectureId = lectureId === selectedLectureId ? null : lectureId
    onSelectLectureId(nextLectureId)
    setSharedSelection({
      courseId: selectedCourseId ?? null,
      lectureIds: nextLectureId ? [nextLectureId] : [],
      source: 'review',
    })
  }

  const selectedCourse = courses.find(c => c.course_id === selectedCourseId)

  useEffect(() => {
    lectureButtonRefs.current = {}
  }, [selectedCourseId])

  useEffect(() => {
    if (!selectedCourseId || isLoadingLectures || !lectureList?.lectures?.length) {
      return
    }

    const allLectures = lectureList.lectures || []
    const availableLectures = allLectures.filter(
      (lecture) => lecture.essence_7words && lecture.essence_7words !== ANALYZING_STATUS
    )

    if (availableLectures.length === 0) {
      if (selectedLectureId) {
        onSelectLectureId(null)
      }
      setPendingSharedLectureIds(null)
      return
    }

    if (pendingSharedLectureIds && pendingSharedLectureIds.length > 0) {
      const latestShared = pickLatestLectureId(pendingSharedLectureIds, allLectures)
      if (latestShared) {
        onSelectLectureId(latestShared)
      }
      setShouldAutoSelectLatest(false)
      setPendingSharedLectureIds(null)
      return
    }

    const selectedLectureStillValid = selectedLectureId
      ? allLectures.some((lecture) => lecture.lecture_id === selectedLectureId)
      : false

    if (selectedLectureStillValid) {
      return
    }

    if (shouldAutoSelectLatest) {
      const latestLecture = [...availableLectures].sort((a, b) => {
        const dateA = new Date(a.lecture_date).getTime()
        const dateB = new Date(b.lecture_date).getTime()
        return dateB - dateA
      })[0]

      if (latestLecture) {
        onSelectLectureId(latestLecture.lecture_id)
        setSharedSelection({
          courseId: selectedCourseId ?? null,
          lectureIds: [latestLecture.lecture_id],
          source: 'review',
        })
      }
      setShouldAutoSelectLatest(false)
    } else {
      onSelectLectureId(null)
    }
  }, [
    selectedCourseId,
    lectureList,
    isLoadingLectures,
    selectedLectureId,
    onSelectLectureId,
    pendingSharedLectureIds,
    shouldAutoSelectLatest,
    setSharedSelection,
  ])

  useEffect(() => {
    if (!selectedLectureId) return
    const target = lectureButtonRefs.current[selectedLectureId]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [selectedLectureId])

  useEffect(() => {
    const inSync = syncingFromSharedRef.current === sharedUpdatedAt
    if (inSync && selectedLectureId !== null) {
      syncingFromSharedRef.current = null
    }
  }, [sharedUpdatedAt, selectedLectureId])

  if (isLoadingCourses) {
    return (
      <div className="flex h-full w-[320px] items-center justify-center bg-white">
        <ReviewLoading message={t('loadingCourseList')} size="compact" />
      </div>
    )
  }

  if (isLoadingLectures) {
    return (
      <div className="flex h-full w-[320px] items-center justify-center bg-white">
        <ReviewLoading message={t('loadingLectureList')} size="compact" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-[320px] flex-col bg-white p-4">
      {/* 헤더 */}
      <h2 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        {t('class')}
      </h2>
      
      {coursesError && (
        <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{coursesError}</p>
      )}
      
      {/* 강의 선택 드롭다운 */}
      <div className="relative mb-4">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm hover:border-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`truncate ${selectedCourse ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {selectedCourse?.title || t('selectCoursePlaceholder')}
            </span>
            {/* 불꽃 개수 표시 */}
            {selectedCourse && (
              <div 
                ref={flameCounterRef}
                className={`flex items-center gap-1 shrink-0 transition-all duration-300 ${
                  flameHighlight ? 'scale-125' : ''
                }`}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  
                  // 툴팁 위치 계산 (우측 정렬, 하단 배치)
                  const tooltipWidth = 320 // 툴팁 예상 너비 (줄바꿈 반영하여 조정)
                  const gap = 8 // 아이콘과 툴팁 사이 간격
                  
                  // 가로 정렬: 툴팁 오른쪽 끝을 컨테이너 오른쪽 끝(숫자 끝)에 맞춤
                  let left = rect.right - tooltipWidth
                  
                  // 화면 왼쪽 벗어남 방지
                  if (left < 10) left = 10
                  
                  // 세로 정렬: 아이콘 바로 아래
                  const top = rect.bottom + gap
                  
                  // 꼬리 위치: 불꽃 아이콘의 중심을 가리키도록
                  // 불꽃 아이콘은 flex 컨테이너의 첫 번째 자식이므로 rect.left 근처에 있음
                  // 정확하게는 이미지 태그를 찾거나, 대략적으로 계산
                  // 이미지 너비가 14px(w-3.5)이므로 rect.left + 7px 정도가 중심
                  const flameCenterX = rect.left + 7 
                  const arrowLeft = flameCenterX - left
                  
                  setTooltipPosition({
                    top: top,
                    left: left,
                    arrowLeft: arrowLeft
                  })
                  setShowFlameTooltip(true)
                }}
                onMouseLeave={() => {
                  setShowFlameTooltip(false)
                }}
              >
                <img 
                  src="/icon_flame.png" 
                  alt="flame" 
                  className={`h-3.5 w-3.5 object-contain transition-all duration-300 ${
                    flameHighlight ? 'animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]' : ''
                  }`}
                  style={{ imageRendering: 'auto' }}
                />
                <span className={`text-xs font-medium transition-all duration-300 ${
                  flameHighlight ? 'text-amber-500 scale-110' : 'text-amber-600'
                }`}>
                  {flameCount[selectedCourse.course_id] || 0}
                </span>
              </div>
            )}
          </div>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {/* 드롭다운 메뉴 */}
        {isDropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {courses.map(course => (
              <button
                key={course.course_id}
                onClick={() => handleSelectCourse(course.course_id)}
                className={`flex w-full flex-col px-3 py-2.5 text-left hover:bg-gray-50 ${
                  course.course_id === selectedCourseId ? 'bg-gray-50' : ''
                }`}
              >
                <span className={`text-sm font-medium ${
                  course.course_id === selectedCourseId ? 'text-gray-700' : 'text-gray-900'
                }`}>
                  {course.title}
                </span>
                {(() => {
                  const professorName = course.professor_name?.trim()
                  const rawSection = course.section
                  const sectionValue = rawSection === null || rawSection === undefined ? '' : String(rawSection).trim()
                  const sectionLabel = sectionValue ? `${sectionValue}분반` : ''
                  const meta = [professorName, sectionLabel].filter(Boolean).join(' · ')
                  return meta ? <span className="text-xs text-gray-400">{meta}</span> : null
                })()}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 회차 목록 */}
      {selectedCourse && (
        <>
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>{t('selectSession')}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {isLoadingLectures ? (
              <ReviewLoading message={t('loadingLectureList')} size="compact" />
            ) : !lectureList || lectureList.lectures.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                {t('noLectures')}
              </p>
            ) : (
              lectureList.lectures.map(lecture => {
                const isSelected = selectedLectureId === lecture.lecture_id
                const isAnalyzing = lecture.essence_7words === ANALYZING_STATUS || !lecture.essence_7words
                const progress = gameProgress[lecture.lecture_id] || 0
                
                return (
                  <button
                    ref={(el) => {
                      lectureButtonRefs.current[lecture.lecture_id] = el
                    }}
                    key={lecture.lecture_id}
                    onClick={() => handleSelectLecture(lecture.lecture_id, lecture.essence_7words)}
                    disabled={isAnalyzing}
                    className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-all border ${
                      isAnalyzing
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                        : isSelected
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-gray-50 border-transparent hover:border-gray-200 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex w-full items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                          {lecture.lecture_date}
                        </p>
                        <p className={`text-sm font-medium mt-0.5 ${
                          isSelected ? 'text-blue-900' : isAnalyzing ? 'text-gray-400' : 'text-gray-800'
                        }`}>
                        {isAnalyzing ? '준비중' : lecture.essence_7words}
                        </p>
                      </div>
                      {isSelected && !isAnalyzing && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 flex-shrink-0">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* 진행도 바 - 선택된 상태에서만 표시 */}
                    {isSelected && !isAnalyzing && (
                      <div className="flex items-center justify-end mt-2 w-full">
                        <div className="relative h-2.5 w-[88px] rounded-l-full overflow-hidden bg-gray-300"
                        >
                          <div
                            className="h-full rounded-l-full transition-all bg-amber-400"
                            style={{ width: `${(progress / 10) * 100}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-gray-600">
                            {progress}/10
                          </span>
                        </div>
                        {/* 보물상자: 클릭 가능 여부에 따라 스타일 변경 */}
                        {(() => {
                          const alreadyClaimed = claimedRewards[lecture.lecture_id]
                          
                          return (
                            <img 
                              ref={(el) => { treasureRefs.current[lecture.lecture_id] = el }}
                              src={alreadyClaimed ? "/icon_reward_empty.png" : "/icon_reward.png"}
                              alt="보상" 
                              onClick={(e) => selectedCourseId && handleTreasureClick(lecture.lecture_id, selectedCourseId, e)}
                              className={`h-5 w-5 transition-all ${
                                alreadyClaimed 
                                  ? '' // 이미 수령한 상태 - 빈 상자
                                  : progress < 10 
                                    ? 'grayscale opacity-50' // 아직 진행 중
                                    : 'cursor-pointer hover:scale-110 animate-bounce drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' // 수령 가능!
                              }`}
                              title={
                                alreadyClaimed 
                                  ? '보상을 수령했습니다' 
                                  : progress >= 10 
                                    ? '클릭하여 보상을 수령하세요!' 
                                    : `${10 - progress}개 더 풀면 보상 획득!`
                              }
                            />
                          )
                        })()}
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
      
      {/* 불꽃 툴팁 */}
      {showFlameTooltip && tooltipPosition && (
        <div
          className="fixed z-[10000] pointer-events-none"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 text-gray-900 text-sm shadow-lg max-w-[320px]">
            <p className="mb-3 leading-relaxed whitespace-pre-wrap">
              {`매 수업일마다 미니게임 퀴즈 5개,
50초 복습 빈칸 정의조립 5개를 진행하고
상자를 열어 불꽃을 모으세요!`}
            </p>
            <div className="border-t border-gray-300 pt-3 space-y-2">
              <div className="flex items-start gap-2">
                <img 
                  src="/icon_flame.png" 
                  alt="불꽃" 
                  className="h-4 w-4 object-contain mt-0.5 shrink-0"
                />
                <span className="leading-relaxed">불꽃 2개: 미니게임, 과제보조 기능 업그레이드</span>
              </div>
              <div className="flex items-start gap-2">
                <img 
                  src="/icon_flame.png" 
                  alt="불꽃" 
                  className="h-4 w-4 object-contain mt-0.5 shrink-0"
                />
                <span className="leading-relaxed">불꽃 4개: 캐릭터, 시험준비 기능 업그레이드</span>
              </div>
              <div className="flex items-start gap-2">
                <img 
                  src="/icon_flame.png" 
                  alt="불꽃" 
                  className="h-4 w-4 object-contain mt-0.5 shrink-0"
                />
                <span className="leading-relaxed">불꽃 8개: 클래스듀오 울트라 업그레이드</span>
              </div>
              <p className="text-xs text-gray-400 mt-2 pl-6">
                (더 많은 퀴즈 게임, 벼락치기 모드, 연구 모드 등)
              </p>
            </div>
          </div>
          {/* 삼각형 꼬리 (위쪽을 가리킴) */}
          <div
            className="absolute"
            style={{
              bottom: '100%',
              left: `${tooltipPosition.arrowLeft}px`,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid rgb(17, 24, 39)', // gray-900
            }}
          />
        </div>
      )}

      {/* 날아가는 불꽃 애니메이션 */}
      {flyingFlames.map(flame => (
        <div
          key={flame.id}
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: flame.startX,
            top: flame.startY,
            animation: 'flyToCounter 800ms ease-in-out forwards',
            '--end-x': `${flame.endX - flame.startX}px`,
            '--end-y': `${flame.endY - flame.startY}px`,
          } as React.CSSProperties}
        >
          <img 
            src="/icon_flame.png" 
            alt="불꽃" 
            className="h-6 w-6 object-contain drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]"
            style={{ 
              animation: 'flameGlow 200ms ease-in-out infinite alternate',
            }}
          />
        </div>
      ))}
      
      {/* 불꽃 애니메이션을 위한 스타일 */}
      <style jsx>{`
        @keyframes flyToCounter {
          0% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 1;
          }
          20% {
            transform: translate(-50%, calc(-50% - 30px)) scale(1.8);
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--end-x)), calc(-50% + var(--end-y))) scale(0.8);
            opacity: 0.8;
          }
        }
        @keyframes flameGlow {
          0% {
            filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.6));
          }
          100% {
            filter: drop-shadow(0 0 16px rgba(251, 191, 36, 1));
          }
        }
      `}</style>
    </div>
  )
}

