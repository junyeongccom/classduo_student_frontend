/**
 * 강의/수업일 선택 사이드바
 * - 드롭다운으로 강의(course) 선택
 * - 선택된 강의의 회차(lecture) 목록 표시
 * - 복수 회차 선택 가능
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Loader2, BookOpen, Calendar, Gamepad2 } from 'lucide-react'
import { apiRequest } from '@/shared/lib/api'

// API 응답 타입
interface Lecture {
  lecture_id: string
  course_id: string
  lecture_no: number
  lecture_date: string
  status: string
  is_available?: boolean // AI 튜터 사용 가능 여부
}

interface Course {
  course_id: string
  title: string
  term: string
  lectures: Lecture[]
}

interface LectureSidebarProps {
  selectedLectureIds: string[]
  onSelectLectureIds: (lectureIds: string[]) => void
  selectedCourseId: string | null
  onSelectCourse: (courseId: string | null) => void
  isLocked?: boolean // 세션이 생성되면 잠금 (선택 불가)
  initialLectureIds?: string[] // 초기 회차 IDs (세션 로드 시 사용)
  autoSelectLatest?: boolean // 가장 최신 회차 자동 선택 (새 채팅 시 사용)
  onAutoSelectComplete?: () => void
  onGameIconClick?: (lectureId: string, courseId: string, lectureNo: number, courseName: string, position: { top: number; left: number; width: number; height: number }) => void // 게임 아이콘 클릭 핸들러
}

// 임시 데이터 (API 없을 때 사용)
const TEMP_COURSES: Course[] = [
  {
    course_id: 'temp-course-1',
    title: '생명과학의 세계',
    term: '2025-1학기',
    lectures: [
      { lecture_id: 'temp-lec-1', course_id: 'temp-course-1', lecture_no: 1, lecture_date: '2025-01-10', status: 'completed' },
      { lecture_id: 'temp-lec-2', course_id: 'temp-course-1', lecture_no: 2, lecture_date: '2025-01-15', status: 'completed' },
      { lecture_id: 'temp-lec-3', course_id: 'temp-course-1', lecture_no: 3, lecture_date: '2025-01-20', status: 'scheduled' },
    ]
  },
  {
    course_id: 'temp-course-2',
    title: '컴퓨터과학개론',
    term: '2025-1학기',
    lectures: [
      { lecture_id: 'temp-lec-4', course_id: 'temp-course-2', lecture_no: 1, lecture_date: '2025-01-11', status: 'completed' },
      { lecture_id: 'temp-lec-5', course_id: 'temp-course-2', lecture_no: 2, lecture_date: '2025-01-18', status: 'completed' },
    ]
  }
]

import { useGameProgress } from '../../hooks/useGameProgress'
import { claimReward as claimRewardAPI } from '@/shared/services/progressService'


// 불꽃 날아가는 애니메이션 상태
interface FlyingFlame {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  lectureId: string
  courseId: string
}

export function LectureSidebar({
  selectedLectureIds,
  onSelectLectureIds,
  selectedCourseId,
  onSelectCourse,
  isLocked = false,
  initialLectureIds,
  autoSelectLatest = false,
  onAutoSelectComplete,
  onGameIconClick,
}: LectureSidebarProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoSelected, setHasAutoSelected] = useState(false) // 자동 선택 완료 플래그
  const { gameProgress, claimedRewards, refreshStatus } = useGameProgress() // Supabase 데이터 사용
  const [flyingFlames, setFlyingFlames] = useState<FlyingFlame[]>([]) // 날아가는 불꽃들
  const [flameHighlight, setFlameHighlight] = useState(false) // 불꽃 카운터 강조 효과
  const lectureButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // refs
  const flameCounterRef = useRef<HTMLDivElement>(null) // 불꽃 카운터 위치 참조
  const treasureRefs = useRef<{ [lectureId: string]: HTMLImageElement | null }>({}) // 보물상자 위치 참조
  
  // 보물상자 클릭 핸들러 (보상 수령)
  const handleTreasureClick = async (lectureId: string, courseId: string, e: React.MouseEvent<HTMLImageElement>) => {
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
    
    // API 호출
    try {
      const result = await claimRewardAPI(lectureId)
      
      if (result.error) {
        console.error('[LectureSidebar] 보상 클레임 실패:', result.error)
        // 에러 발생 시 사용자에게 알림 (선택사항)
        return
      }
      
      // 성공 시 Realtime 이벤트로 자동 업데이트됨
      // 하지만 즉각적인 UI 반응을 위해 optimistic update
      refreshStatus()
      
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
    } catch (error) {
      console.error('[LectureSidebar] 보상 클레임 예외:', error)
    }
  }

  // 선택된 강의 객체
  const selectedCourse = courses.find(c => c.course_id === selectedCourseId)

  // 강의 목록 가져오기
  useEffect(() => {
    const fetchCourses = async () => {
      if (courses.length === 0) {
        setIsLoading(true)
      }
      setError(null)
      
      try {
        const coursesResult = await apiRequest<{ courses: any[], total: number }>('/courses/all', { auth: true })
        const coursesList = coursesResult.data?.courses
        
        if (coursesResult.error || !coursesList || !Array.isArray(coursesList) || coursesList.length === 0) {
          setCourses(TEMP_COURSES)
          return
        }
        
        const coursesWithLectures: Course[] = coursesList.map((course: any) => ({
          course_id: course.course_id,
          title: course.title,
          term: `${course.academic_year}-${course.term_code}`,
          lectures: (course.lectures || []).map((lec: any) => ({
            lecture_id: lec.lecture_id,
            course_id: lec.course_id,
            lecture_no: lec.lecture_no,
            lecture_date: lec.lecture_date,
            status: lec.status,
            is_available: lec.is_available ?? false,
          }))
        }))
        
        setCourses(coursesWithLectures)
      } catch (err) {
        console.error('Failed to fetch courses:', err)
        setError('강의 목록을 불러오는데 실패했습니다')
        setCourses(TEMP_COURSES)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCourses()
  }, [])
  
  // 선택된 강의가 없거나 사라진 경우 보정
  useEffect(() => {
    if (courses.length === 0 || isLoading) {
      return
    }

    const hasCurrentSelection =
      !!selectedCourseId && courses.some(course => course.course_id === selectedCourseId)

    if (hasCurrentSelection) {
      return
    }

    if (initialLectureIds && initialLectureIds.length > 0) {
      const matchingCourse = courses.find(course =>
        course.lectures.some(lec => initialLectureIds.includes(lec.lecture_id))
      )
      if (matchingCourse) {
        onSelectCourse(matchingCourse.course_id)
        return
      }
    }

    if (courses.length > 0) {
      onSelectCourse(courses[0].course_id)
    }
  }, [courses, isLoading, selectedCourseId, initialLectureIds, onSelectCourse])

  const getLatestAvailableLecture = (course?: Course | null) => {
    if (!course) return null
    const available = course.lectures.filter(lec => lec.is_available)
    if (available.length === 0) {
      return null
    }
    return available.reduce((latest, lec) => {
      const latestTime = new Date(latest.lecture_date).getTime()
      const currentTime = new Date(lec.lecture_date).getTime()
      return currentTime > latestTime ? lec : latest
    })
  }

  // autoSelectLatest가 true일 때 가장 최신 회차 선택 (강의 목록이 로드된 후)
  useEffect(() => {
    if (!autoSelectLatest || courses.length === 0 || isLoading || isLocked || hasAutoSelected) {
      if (!autoSelectLatest) {
        setHasAutoSelected(false)
      }
      return
    }

    let courseToUse =
      courses.find(course => course.course_id === selectedCourseId) ||
      courses.find(course => course.lectures.length > 0) ||
      null

    if (!courseToUse) {
      return
    }

    let latestLecture = getLatestAvailableLecture(courseToUse)

    if (!latestLecture) {
      const fallbackCourse = courses.find(course => getLatestAvailableLecture(course))
      if (!fallbackCourse) {
        return
      }
      courseToUse = fallbackCourse
      if (fallbackCourse.course_id !== selectedCourseId) {
        onSelectCourse(fallbackCourse.course_id)
      }
      latestLecture = getLatestAvailableLecture(fallbackCourse)
    } else if (!selectedCourseId) {
      onSelectCourse(courseToUse.course_id)
    }

    if (!latestLecture) {
      return
    }

    onSelectLectureIds([latestLecture.lecture_id])
    setHasAutoSelected(true)
    onAutoSelectComplete?.()
  }, [
    autoSelectLatest,
    courses,
    isLoading,
    isLocked,
    hasAutoSelected,
    selectedCourseId,
    onSelectCourse,
    onSelectLectureIds,
    onAutoSelectComplete,
  ])

  useEffect(() => {
    if (selectedLectureIds.length === 0) {
      return
    }
    const targetId = selectedLectureIds[selectedLectureIds.length - 1]
    const targetRef = lectureButtonRefs.current[targetId]
    if (targetRef) {
      targetRef.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [selectedLectureIds])

  // 강의 선택 시 기존 회차 선택 초기화 - 잠금 상태면 무시
  const handleSelectCourse = (courseId: string | null) => {
    if (isLocked) return // 잠금 상태면 변경 불가
    
    onSelectCourse(courseId)
    setIsDropdownOpen(false)
    onSelectLectureIds([]) // 회차 선택 초기화
  }

  // 회차 토글 (복수 선택) - 잠금 상태면 무시
  const toggleLecture = (lectureId: string) => {
    if (isLocked) return // 잠금 상태면 선택 불가
    
    if (selectedLectureIds.includes(lectureId)) {
      onSelectLectureIds(selectedLectureIds.filter(id => id !== lectureId))
    } else {
      onSelectLectureIds([...selectedLectureIds, lectureId])
    }
  }

  // 활성화된 회차 전체 선택/해제
  const toggleSelectAll = () => {
    if (isLocked || !selectedCourse) return
    
    // 활성화된 회차만 필터링
    const availableLectures = selectedCourse.lectures.filter(lec => lec.is_available)
    const availableLectureIds = availableLectures.map(lec => lec.lecture_id)
    
    // 모두 선택되어 있는지 확인
    const allSelected = availableLectureIds.every(id => selectedLectureIds.includes(id))
    
    if (allSelected) {
      // 전체 해제: 활성화된 회차만 제거
      onSelectLectureIds(selectedLectureIds.filter(id => !availableLectureIds.includes(id)))
    } else {
      // 전체 선택: 활성화된 회차 추가 (중복 제거)
      const newSelected = [...new Set([...selectedLectureIds, ...availableLectureIds])]
      onSelectLectureIds(newSelected)
    }
  }

  // 활성화된 회차 중 선택된 개수 계산
  const selectedCourseAvailableLectures = selectedCourse?.lectures.filter(lec => lec.is_available) || []
  const availableLectureIdsForDisplay = selectedCourseAvailableLectures.map(lec => lec.lecture_id)
  const selectedAvailableCount = availableLectureIdsForDisplay.filter(id => selectedLectureIds.includes(id)).length
  const isAllSelected = selectedCourseAvailableLectures.length > 0 && 
    selectedAvailableCount === selectedCourseAvailableLectures.length

  return (
    <div className="flex h-full w-[320px] flex-col bg-white p-4 overflow-y-auto">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          수업 선택
        </h2>
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
      
      {error && (
        <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{error}</p>
      )}
      
      {/* 강의 선택 드롭다운 */}
      <div className="relative mb-4">
        <button
          onClick={() => !isLocked && setIsDropdownOpen(!isDropdownOpen)}
          disabled={isLocked}
          className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm ${
            isLocked 
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 bg-white hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`truncate ${selectedCourse ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
              {selectedCourse?.title || '강의를 선택하세요'}
            </span>
            {/* 불꽃 개수 표시 (더 이상 사용하지 않음, 하위 호환성 유지) */}
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
                  0
                </span>
              </div>
            )}
          </div>
          {!isLocked && (
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ml-2 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          )}
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
                {course.term && (
                  <span className="text-xs text-gray-400">{course.term}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 회차 목록 */}
      {selectedCourse && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Calendar className="h-3.5 w-3.5" />
              <span>회차 선택 (복수 선택 가능)</span>
            </div>
            {selectedCourseAvailableLectures.length > 0 && !isLocked && (
              <button
                onClick={toggleSelectAll}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                {isAllSelected ? '전체 해제' : '전체 선택'}
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {selectedCourse.lectures.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                등록된 회차가 없습니다
              </p>
            ) : (
              selectedCourse.lectures.map(lecture => {
                const isSelected = selectedLectureIds.includes(lecture.lecture_id)
                // const isFirstLecture = lecture.lecture_no === 1 // 1회차 특별 로직 비활성화
                const isDisabled = (isLocked && !isSelected) || !lecture.is_available // 잠금 상태 또는 사용 불가능한 회차는 비활성화
                const showGameButton = isSelected && selectedLectureIds.length === 1
                // 비활성화된 1회차는 게임 버튼을 위해 부모 버튼을 disabled하지 않음 - 주석처리
                // const shouldDisableParent = isDisabled && !(isFirstLecture && !lecture.is_available)
                
                return (
                  <button
                    ref={(el) => {
                      lectureButtonRefs.current[lecture.lecture_id] = el
                    }}
                    key={lecture.lecture_id}
                    onClick={() => toggleLecture(lecture.lecture_id)}
                    disabled={isDisabled}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all ${
                      isSelected 
                        ? 'bg-primary-500 text-white shadow-sm' 
                        : isDisabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                    title={!lecture.is_available ? '강의자료가 준비되지 않은 회차입니다' : undefined}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        isSelected ? 'text-white' : isDisabled ? 'text-gray-400' : 'text-gray-800'
                      }`}>
                        {lecture.lecture_no}회차
                      </p>
                      <p className={`text-xs ${
                        isSelected ? 'text-primary-100' : 'text-gray-400'
                      }`}>
                        {lecture.lecture_date}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-2 flex flex-col items-end gap-1">
                        {/* 상단: 체크 + 게임 버튼 */}
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          {/* 게임 버튼: 선택된 회차가 1개일 때 표시 */}
                          {showGameButton && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onGameIconClick && selectedCourseId && selectedCourse) {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  onGameIconClick(lecture.lecture_id, selectedCourseId, lecture.lecture_no, selectedCourse.title, {
                                    top: rect.top,
                                    left: rect.left,
                                    width: rect.width,
                                    height: rect.height,
                                  })
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  e.currentTarget.click()
                                }
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded-full transition-colors cursor-pointer bg-white/20 hover:bg-white/30"
                              title="게임 시작"
                            >
                              <Gamepad2 className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        {/* 하단: 진행도 바 */}
                        {showGameButton && (
                          <div className="flex items-center">
                            <div className="relative h-2.5 w-[88px] rounded-l-full overflow-hidden bg-white/20">
                              <div 
                                className="h-full rounded-l-full transition-all bg-amber-400"
                                style={{ width: `${((gameProgress[lecture.lecture_id] || 0) / 10) * 100}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-gray-500">
                                {gameProgress[lecture.lecture_id] || 0}/10
                              </span>
                            </div>
                            {/* 보물상자: 클릭 가능 여부에 따라 스타일 변경 */}
                            {(() => {
                              const progress = gameProgress[lecture.lecture_id] || 0
                              const alreadyClaimed = claimedRewards[lecture.lecture_id]
                              
                              return (
                                <img 
                                  ref={(el) => { treasureRefs.current[lecture.lecture_id] = el }}
                                  src={alreadyClaimed ? "/icon_reward_empty.png" : "/icon_reward.png"}
                                  alt="보상" 
                                  onClick={(e) => {
                                    if (!selectedCourseId) return
                                    handleTreasureClick(lecture.lecture_id, selectedCourseId, e)
                                  }}
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
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </>
      )}

      {/* 선택된 회차 요약 */}
      {selectedLectureIds.length > 0 && (
        <div className={`mt-4 rounded-lg px-3 py-2.5 border ${
          isLocked 
            ? 'bg-gray-50 border-gray-200' 
            : 'bg-primary-50 border-primary-100'
        }`}>
          <p className={`text-xs font-medium ${isLocked ? 'text-gray-600' : 'text-primary-800'}`}>
            {isLocked ? '현재 세션 회차' : '선택된 회차'}: {selectedLectureIds.length}개
          </p>
          {isLocked ? (
            <p className="mt-1 text-[10px] text-gray-500">
              새 채팅을 시작하면 다른 회차를 선택할 수 있습니다
            </p>
          ) : selectedLectureIds.length > 1 && (
            <p className="mt-1 text-[10px] text-primary-600">
              복수 선택 시 후킹 질문은 제공되지 않습니다
            </p>
          )}
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


