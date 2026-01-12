/**
 * 강의/수업일 선택 사이드바 UI 컴포넌트
 * - 순수 프레젠테이션 컴포넌트 (모든 데이터/콜백은 props로 받음)
 * - services, store, hooks 직접 접근 금지
 */
'use client'

import { useRef, useEffect } from 'react'
import { ChevronDown, Loader2, BookOpen, Calendar, Gamepad2 } from 'lucide-react'

// 타입 정의
export interface Lecture {
  lecture_id: string
  course_id: string
  lecture_no: number
  lecture_date: string
  status: string
  is_available?: boolean
}

export interface Course {
  course_id: string
  title: string
  term: string
  lectures: Lecture[]
}

export interface GameProgress {
  [lectureId: string]: number
}

export interface ClaimedRewards {
  [lectureId: string]: boolean
}

export interface FlameCount {
  [courseId: string]: number
}

export interface FlyingFlame {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  lectureId: string
  courseId: string
}

export interface LectureSidebarUIProps {
  // 데이터
  courses: Course[]
  selectedCourse: Course | null
  selectedCourseId: string | null
  selectedLectureIds: string[]
  gameProgress: GameProgress
  claimedRewards: ClaimedRewards
  flameCount: FlameCount
  isLoading: boolean
  error: string | null
  isLocked: boolean
  isDropdownOpen: boolean
  flyingFlames: FlyingFlame[]
  flameHighlight: boolean

  // refs
  flameCounterRef: React.RefObject<HTMLDivElement>
  treasureRefs: React.MutableRefObject<{ [lectureId: string]: HTMLImageElement | null }>

  // 콜백
  onSelectCourse: (courseId: string | null) => void
  onToggleLecture: (lectureId: string) => void
  onToggleSelectAll: () => void
  onDropdownToggle: () => void
  onTreasureClick: (lectureId: string, courseId: string, e: React.MouseEvent<HTMLImageElement>) => void
  onGameIconClick?: (
    lectureId: string,
    courseId: string,
    lectureNo: number,
    courseName: string,
    position: { top: number; left: number; width: number; height: number }
  ) => void
}

export function LectureSidebarUI({
  courses,
  selectedCourse,
  selectedCourseId,
  selectedLectureIds,
  gameProgress,
  claimedRewards,
  flameCount,
  isLoading,
  error,
  isLocked,
  isDropdownOpen,
  flyingFlames,
  flameHighlight,
  flameCounterRef,
  treasureRefs,
  onSelectCourse,
  onToggleLecture,
  onToggleSelectAll,
  onDropdownToggle,
  onTreasureClick,
  onGameIconClick,
}: LectureSidebarUIProps) {
  const lectureButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  // 선택된 회차로 스크롤
  useEffect(() => {
    if (selectedLectureIds.length === 0) return
    const targetId = selectedLectureIds[selectedLectureIds.length - 1]
    const targetRef = lectureButtonRefs.current[targetId]
    if (targetRef) {
      targetRef.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    }
  }, [selectedLectureIds])

  // 강의 선택 핸들러
  const handleSelectCourse = (courseId: string | null) => {
    if (isLocked) return
    onSelectCourse(courseId)
  }

  // 활성화된 회차 중 선택된 개수 계산
  const selectedCourseAvailableLectures = selectedCourse?.lectures.filter(lec => lec.is_available) || []
  const availableLectureIdsForDisplay = selectedCourseAvailableLectures.map(lec => lec.lecture_id)
  const selectedAvailableCount = availableLectureIdsForDisplay.filter(id => selectedLectureIds.includes(id)).length
  const isAllSelected =
    selectedCourseAvailableLectures.length > 0 &&
    selectedAvailableCount === selectedCourseAvailableLectures.length

  return (
    <div className="flex h-full w-[320px] flex-col bg-white p-4 overflow-y-auto">
      {/* 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          수업 선택
        </h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      </div>

      {error && (
        <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{error}</p>
      )}

      {/* 강의 선택 드롭다운 */}
      <div className="relative mb-4">
        <button
          onClick={() => !isLocked && onDropdownToggle()}
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
            {selectedCourse && (() => {
              const count = flameCount[selectedCourse.course_id]
              // 디버깅: course_id와 flameCount 확인
              if (process.env.NODE_ENV === 'development') {
                console.log('[LectureSidebarUI] flameCount 디버깅:', {
                  course_id: selectedCourse.course_id,
                  flameCount,
                  count,
                })
              }
              return (
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
                  <span
                    className={`text-xs font-medium transition-all duration-300 ${
                      flameHighlight ? 'text-amber-500 scale-110' : 'text-amber-600'
                    }`}
                  >
                    {count ?? 0}
                  </span>
                </div>
              )
            })()}
          </div>
          {!isLocked && (
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ml-2 ${
                isDropdownOpen ? 'rotate-180' : ''
              }`}
            />
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
                <span
                  className={`text-sm font-medium ${
                    course.course_id === selectedCourseId ? 'text-primary-700' : 'text-gray-900'
                  }`}
                >
                  {course.title}
                </span>
                {course.term && <span className="text-xs text-gray-400">{course.term}</span>}
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
                onClick={onToggleSelectAll}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                {isAllSelected ? '전체 해제' : '전체 선택'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5">
            {selectedCourse.lectures.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">등록된 회차가 없습니다</p>
            ) : (
              selectedCourse.lectures.map(lecture => {
                const isSelected = selectedLectureIds.includes(lecture.lecture_id)
                const isDisabled = (isLocked && !isSelected) || !lecture.is_available
                const showGameButton = isSelected && selectedLectureIds.length === 1

                return (
                  <button
                    ref={el => {
                      lectureButtonRefs.current[lecture.lecture_id] = el
                    }}
                    key={lecture.lecture_id}
                    onClick={() => onToggleLecture(lecture.lecture_id)}
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
                      <p
                        className={`text-sm font-medium ${
                          isSelected ? 'text-white' : isDisabled ? 'text-gray-400' : 'text-gray-800'
                        }`}
                      >
                        {lecture.lecture_no}회차
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-primary-100' : 'text-gray-400'}`}>
                        {lecture.lecture_date}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-2 flex flex-col items-end gap-1">
                        {/* 상단: 체크 + 게임 버튼 */}
                        <div className="flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                            <svg
                              className="h-3 w-3 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                          {showGameButton && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={e => {
                                e.stopPropagation()
                                if (onGameIconClick && selectedCourseId && selectedCourse) {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  onGameIconClick(
                                    lecture.lecture_id,
                                    selectedCourseId,
                                    lecture.lecture_no,
                                    selectedCourse.title,
                                    {
                                      top: rect.top,
                                      left: rect.left,
                                      width: rect.width,
                                      height: rect.height,
                                    }
                                  )
                                }
                              }}
                              onKeyDown={e => {
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
                                style={{
                                  width: `${((gameProgress[lecture.lecture_id] || 0) / 10) * 100}%`,
                                }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-medium text-gray-500">
                                {gameProgress[lecture.lecture_id] || 0}/10
                              </span>
                            </div>
                            {(() => {
                              const progress = gameProgress[lecture.lecture_id] || 0
                              const alreadyClaimed = claimedRewards[lecture.lecture_id]

                              return (
                                <img
                                  ref={el => {
                                    treasureRefs.current[lecture.lecture_id] = el
                                  }}
                                  src={alreadyClaimed ? '/icon_reward_empty.png' : '/icon_reward.png'}
                                  alt="보상"
                                  onClick={e => {
                                    if (!selectedCourseId) return
                                    onTreasureClick(lecture.lecture_id, selectedCourseId, e)
                                  }}
                                  className={`h-5 w-5 transition-all ${
                                    alreadyClaimed
                                      ? ''
                                      : progress < 10
                                      ? 'grayscale opacity-50'
                                      : 'cursor-pointer hover:scale-110 animate-bounce drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]'
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
        <div
          className={`mt-4 rounded-lg px-3 py-2.5 border ${
            isLocked ? 'bg-gray-50 border-gray-200' : 'bg-primary-50 border-primary-100'
          }`}
        >
          <p className={`text-xs font-medium ${isLocked ? 'text-gray-600' : 'text-primary-800'}`}>
            {isLocked ? '현재 세션 회차' : '선택된 회차'}: {selectedLectureIds.length}개
          </p>
          {isLocked ? (
            <p className="mt-1 text-[10px] text-gray-500">
              새 채팅을 시작하면 다른 회차를 선택할 수 있습니다
            </p>
          ) : (
            selectedLectureIds.length > 1 && (
              <p className="mt-1 text-[10px] text-primary-600">
                복수 선택 시 후킹 질문은 제공되지 않습니다
              </p>
            )
          )}
        </div>
      )}

      {/* 날아가는 불꽃 애니메이션 */}
      {flyingFlames.map(flame => (
        <div
          key={flame.id}
          className="fixed pointer-events-none z-[9999]"
          style={
            {
              left: flame.startX,
              top: flame.startY,
              animation: 'flyToCounter 800ms ease-in-out forwards',
              '--end-x': `${flame.endX - flame.startX}px`,
              '--end-y': `${flame.endY - flame.startY}px`,
            } as React.CSSProperties
          }
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

