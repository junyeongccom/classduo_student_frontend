/**
 * 복습 콘텐츠 우측 사이드바
 * - 강의 선택 드롭다운
 * - 선택된 강의의 회차 리스트 (수업일, 본질한줄)
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Loader2, BookOpen, Calendar } from 'lucide-react'
import { useLectureList } from '@/features/review/hooks/useReview'
import { useReviewCourses } from '@/features/review/hooks/useReviewCourses'
import { useGameStatus } from '@/features/review/hooks/useGameStatus'

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

export function ReviewSidebar({ selectedLectureId, onSelectLectureId, onCourseIdChange }: ReviewSidebarProps) {
  const { courses, isLoading: isLoadingCourses, error: coursesError } = useReviewCourses()
  const { gameProgress, flameCount, claimedRewards, claimReward } = useGameStatus()
  
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [flyingFlames, setFlyingFlames] = useState<FlyingFlame[]>([]) // 날아가는 불꽃들
  const [flameHighlight, setFlameHighlight] = useState(false) // 불꽃 카운터 강조 효과
  
  // refs
  const flameCounterRef = useRef<HTMLDivElement>(null) // 불꽃 카운터 위치 참조
  const treasureRefs = useRef<{ [lectureId: string]: HTMLImageElement | null }>({}) // 보물상자 위치 참조

  const { data: lectureList, isLoading: isLoadingLectures } = useLectureList(selectedCourseId)

  // 첫 번째 강의 자동 선택
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      const firstCourseId = courses[0].course_id
      setSelectedCourseId(firstCourseId)
      onCourseIdChange?.(firstCourseId)
    }
  }, [courses, selectedCourseId, onCourseIdChange])

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
    setSelectedCourseId(courseId)
    setIsDropdownOpen(false)
    onSelectLectureId(null) // 회차 선택 초기화
    onCourseIdChange?.(courseId) // 강의 ID 변경 알림
  }

  // 회차 선택
  const handleSelectLecture = (lectureId: string, essence7words: string | null) => {
    // "분석 중" 상태인 경우 클릭 불가
    if (essence7words === "분석 중" || !essence7words) {
      return
    }
    onSelectLectureId(lectureId === selectedLectureId ? null : lectureId)
  }

  const selectedCourse = courses.find(c => c.course_id === selectedCourseId)

  if (isLoadingCourses) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-white p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full w-[320px] flex-col bg-white p-4">
      {/* 헤더 */}
      <h2 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        수업
      </h2>
      
      {coursesError && (
        <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{coursesError}</p>
      )}
      
      {/* 강의 선택 드롭다운 */}
      <div className="relative mb-4">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`truncate ${selectedCourse ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {selectedCourse?.title || '강의를 선택하세요'}
            </span>
            {/* 불꽃 개수 표시 */}
            {selectedCourse && (
              <div 
                ref={flameCounterRef}
                className={`flex items-center gap-1 shrink-0 transition-all duration-300 ${
                  flameHighlight ? 'scale-125' : ''
                }`}
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
                  course.course_id === selectedCourseId ? 'bg-primary-50' : ''
                }`}
              >
                <span className={`text-sm font-medium ${
                  course.course_id === selectedCourseId ? 'text-primary-700' : 'text-gray-900'
                }`}>
                  {course.title}
                </span>
                {course.section && (
                  <span className="text-xs text-gray-400">{course.section}</span>
                )}
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
            <span>회차 선택</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {isLoadingLectures ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            ) : !lectureList || lectureList.lectures.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                등록된 회차가 없습니다
              </p>
            ) : (
              lectureList.lectures.map(lecture => {
                const isSelected = selectedLectureId === lecture.lecture_id
                const isAnalyzing = lecture.essence_7words === "분석 중" || !lecture.essence_7words
                const progress = gameProgress[lecture.lecture_id] || 0
                
                return (
                  <button
                    key={lecture.lecture_id}
                    onClick={() => handleSelectLecture(lecture.lecture_id, lecture.essence_7words)}
                    disabled={isAnalyzing}
                    className={`flex w-full flex-col rounded-lg px-3 py-2.5 text-left transition-all ${
                      isAnalyzing
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                        : isSelected 
                          ? 'bg-primary-500 text-white shadow-sm' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex w-full items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs ${isSelected ? 'text-primary-100' : 'text-gray-500'}`}>
                          {lecture.lecture_date}
                        </p>
                        <p className={`text-sm font-medium mt-0.5 ${
                          isSelected ? 'text-white' : isAnalyzing ? 'text-gray-400' : 'text-gray-800'
                        }`}>
                          {lecture.essence_7words || '본질한줄 없음'}
                        </p>
                      </div>
                      {isSelected && !isAnalyzing && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 flex-shrink-0">
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* 진행도 바 - 선택된 상태에서만 표시 */}
                    {isSelected && !isAnalyzing && (
                      <div className="flex items-center justify-end mt-2 w-full">
                        <div className="relative h-2.5 w-[88px] rounded-l-full overflow-hidden bg-white/20" 
                          style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }}
                        >
                          <div 
                            className="h-full rounded-l-full transition-all bg-amber-400"
                            style={{ width: `${(progress / 10) * 100}%` }}
                          />
                          <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-medium ${
                            isSelected ? 'text-white/80' : 'text-gray-500'
                          }`}>
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

