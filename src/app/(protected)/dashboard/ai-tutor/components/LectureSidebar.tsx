/**
 * 강의/수업일 선택 사이드바
 * - 드롭다운으로 강의(course) 선택
 * - 선택된 강의의 회차(lecture) 목록 표시
 * - 복수 회차 선택 가능
 */
'use client'

import { useState, useEffect } from 'react'
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
  isLocked?: boolean // 세션이 생성되면 잠금 (선택 불가)
  initialLectureIds?: string[] // 초기 회차 IDs (세션 로드 시 사용)
  autoSelectLatest?: boolean // 가장 최신 회차 자동 선택 (새 채팅 시 사용)
  onGameIconClick?: (lectureId: string, courseId: string, lectureNo: number, position: { top: number; left: number; width: number; height: number }) => void // 게임 아이콘 클릭 핸들러
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

// 게임 진행도 타입 (회차별 진행도 저장)
interface GameProgress {
  [lectureId: string]: number // 0~10 진행도
}

// 회차별 푼 문제 목록 (중복 방지용)
interface SolvedQuestions {
  [lectureId: string]: number[] // 푼 문제 인덱스 배열 (0~4: 게임, 5~9: 복습 빈칸)
}

// localStorage 키 생성 함수 (사용자 ID 포함)
const getGameProgressKey = (userId?: string) => {
  return userId ? `classduo_game_progress_${userId}` : 'classduo_game_progress'
}

const getSolvedQuestionsKey = (userId?: string) => {
  return userId ? `classduo_solved_questions_${userId}` : 'classduo_solved_questions'
}

// 현재 사용자 ID 가져오기
const getCurrentUserId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      return parsed?.state?.user?.user_id
    }
  } catch {
    // 무시
  }
  return undefined
}

// 게임 진행도 로드
const loadGameProgress = (): GameProgress => {
  if (typeof window === 'undefined') return {}
  try {
    const userId = getCurrentUserId()
    const key = getGameProgressKey(userId)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 푼 문제 목록 로드
const loadSolvedQuestions = (): SolvedQuestions => {
  if (typeof window === 'undefined') return {}
  try {
    const userId = getCurrentUserId()
    const key = getSolvedQuestionsKey(userId)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 게임 진행도 저장 (외부에서 호출 가능하도록 export)
export const saveGameProgress = (lectureId: string, progress: number) => {
  if (typeof window === 'undefined') return
  try {
    const userId = getCurrentUserId()
    const key = getGameProgressKey(userId)
    const current = loadGameProgress()
    current[lectureId] = Math.min(10, Math.max(0, progress)) // 0~10 범위 제한
    localStorage.setItem(key, JSON.stringify(current))
  } catch {
    console.error('Failed to save game progress')
  }
}

// 문제가 이미 풀렸는지 확인 (외부에서 호출 가능하도록 export)
export const isQuestionSolved = (lectureId: string, questionIndex: number): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const solved = loadSolvedQuestions()
    return solved[lectureId]?.includes(questionIndex) || false
  } catch {
    return false
  }
}

// 불꽃 개수 타입 (강의별 불꽃 개수 저장)
interface FlameCount {
  [courseId: string]: number
}

// 불꽃 개수 localStorage 키 생성 함수
const getFlameCountKey = (userId?: string) => {
  return userId ? `classduo_flame_count_${userId}` : 'classduo_flame_count'
}

// 불꽃 개수 로드
const loadFlameCount = (): FlameCount => {
  if (typeof window === 'undefined') return {}
  try {
    const userId = getCurrentUserId()
    const key = getFlameCountKey(userId)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 불꽃 개수 증가
const incrementFlameCount = (courseId: string): number => {
  if (typeof window === 'undefined') return 0
  try {
    const userId = getCurrentUserId()
    const key = getFlameCountKey(userId)
    const current = loadFlameCount()
    const newCount = (current[courseId] || 0) + 1
    current[courseId] = newCount
    localStorage.setItem(key, JSON.stringify(current))
    return newCount
  } catch {
    console.error('Failed to increment flame count')
    return 0
  }
}

// 게임 진행도 증가 (외부에서 호출 가능하도록 export)
// 진행도가 10이 되면 불꽃 +1
// questionIndex: 푼 문제 인덱스 (0~4), 같은 문제는 중복 증가 안됨
export const incrementGameProgress = (lectureId: string, courseId?: string, questionIndex?: number): number => {
  if (typeof window === 'undefined') return 0
  try {
    const currentProgress = loadGameProgress()
    const currentSolved = loadSolvedQuestions()
    const lectureProgress = currentProgress[lectureId] || 0
    const lectureSolved = currentSolved[lectureId] || []
    
    // 이미 10이면 더 이상 증가하지 않음
    if (lectureProgress >= 10) return 10
    
    // 회차당 최대 10개까지만 증가 가능 (게임 5개 + 복습 빈칸 5개)
    if (lectureSolved.length >= 10) return lectureProgress
    
    // questionIndex가 제공된 경우, 이미 푼 문제인지 확인
    if (questionIndex !== undefined) {
      if (lectureSolved.includes(questionIndex)) {
        // 이미 푼 문제 - 진행도 증가 없음
        return lectureProgress
      }
      
      // 푼 문제 목록에 추가
      const userId = getCurrentUserId()
      const solvedKey = getSolvedQuestionsKey(userId)
      currentSolved[lectureId] = [...lectureSolved, questionIndex]
      localStorage.setItem(solvedKey, JSON.stringify(currentSolved))
    }
    
    const userId = getCurrentUserId()
    const progressKey = getGameProgressKey(userId)
    const newProgress = lectureProgress + 1
    currentProgress[lectureId] = newProgress
    localStorage.setItem(progressKey, JSON.stringify(currentProgress))
    
    // 진행도가 10이 되면 불꽃 +1
    if (newProgress === 10 && courseId) {
      incrementFlameCount(courseId)
    }
    
    return newProgress
  } catch {
    console.error('Failed to increment game progress')
    return 0
  }
}

export function LectureSidebar({ selectedLectureIds, onSelectLectureIds, isLocked = false, initialLectureIds, autoSelectLatest = false, onGameIconClick }: LectureSidebarProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoSelected, setHasAutoSelected] = useState(false) // 자동 선택 완료 플래그
  const [gameProgress, setGameProgress] = useState<GameProgress>({}) // 게임 진행도
  const [flameCount, setFlameCount] = useState<FlameCount>({}) // 불꽃 개수
  
  // 게임 진행도 및 불꽃 개수 로드
  useEffect(() => {
    setGameProgress(loadGameProgress())
    setFlameCount(loadFlameCount())
    
    // storage 이벤트 리스너 (다른 탭에서 변경 시 동기화)
    const handleStorage = (e: StorageEvent) => {
      const userId = getCurrentUserId()
      const progressKey = getGameProgressKey(userId)
      const flameKey = getFlameCountKey(userId)
      if (e.key === progressKey || e.key?.startsWith('classduo_game_progress')) {
        setGameProgress(loadGameProgress())
      }
      if (e.key === flameKey || e.key?.startsWith('classduo_flame_count')) {
        setFlameCount(loadFlameCount())
      }
    }
    window.addEventListener('storage', handleStorage)
    
    // 주기적으로 진행도 확인 (같은 탭에서 GameOverlay가 업데이트할 때)
    const interval = setInterval(() => {
      setGameProgress(loadGameProgress())
      setFlameCount(loadFlameCount())
    }, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  // 선택된 강의 객체
  const selectedCourse = courses.find(c => c.course_id === selectedCourseId)

  // 강의 목록 가져오기
  useEffect(() => {
    const fetchCourses = async () => {
      // 초기 로드 시에만 로딩 상태 표시 (깜박임 방지)
      if (courses.length === 0) {
        setIsLoading(true)
      }
      setError(null)
      
      try {
        // 강의 목록 + 회차 조회 - 학생용 (모든 활성 강의 + 회차 포함)
        // 응답: { courses: [{ course_id, title, lectures: [...] }, ...], total: number }
        const coursesResult = await apiRequest<{ courses: any[], total: number }>('/courses/all', { auth: true })
        
        console.log('[LectureSidebar] API Response:', coursesResult)
        
        // API 응답에서 courses 배열 추출
        const coursesList = coursesResult.data?.courses
        
        console.log('[LectureSidebar] Courses List:', coursesList)
        
        // API 응답이 없거나 배열이 아닌 경우 임시 데이터 사용
        if (coursesResult.error || !coursesList || !Array.isArray(coursesList) || coursesList.length === 0) {
          console.log('[LectureSidebar] Using temp data. Error:', coursesResult.error)
          setCourses(TEMP_COURSES)
          // initialLectureIds가 없을 때만 첫 번째 강의 선택
          if (!selectedCourseId) {
            setSelectedCourseId(TEMP_COURSES[0].course_id)
          }
          return
        }
        
        // API 응답을 프론트엔드 형식으로 변환 (회차 정보 이미 포함됨)
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
            is_available: lec.is_available ?? false, // 기본값 false
          }))
        }))
        
        setCourses(coursesWithLectures)
        
        // 가장 최신 회차 자동 선택 (새 채팅 시)
        if (autoSelectLatest && coursesWithLectures.length > 0 && !isLocked) {
          // 모든 강의의 모든 회차 중에서 is_available이 true인 것만 필터링
          const allAvailableLectures: (Lecture & { course_id: string })[] = []
          coursesWithLectures.forEach(course => {
            course.lectures
              .filter(lec => lec.is_available)
              .forEach(lec => {
                allAvailableLectures.push({ ...lec, course_id: course.course_id })
              })
          })
          
          if (allAvailableLectures.length > 0) {
            // lecture_date 기준으로 정렬하여 가장 최신 회차 찾기
            const sortedLectures = [...allAvailableLectures].sort((a, b) => {
              const dateA = new Date(a.lecture_date).getTime()
              const dateB = new Date(b.lecture_date).getTime()
              return dateB - dateA // 내림차순 (최신이 먼저)
            })
            
            const latestLecture = sortedLectures[0]
            setSelectedCourseId(latestLecture.course_id)
            onSelectLectureIds([latestLecture.lecture_id])
          } else if (!selectedCourseId) {
            // 사용 가능한 회차가 없으면 첫 번째 강의 선택
            setSelectedCourseId(coursesWithLectures[0].course_id)
          }
        }
        // 초기 lecture_ids가 있으면 해당 회차가 속한 강의를 찾아서 선택
        else if (initialLectureIds && initialLectureIds.length > 0 && coursesWithLectures.length > 0) {
          // initialLectureIds 중 하나라도 포함하는 강의 찾기
          const matchingCourse = coursesWithLectures.find(course => 
            course.lectures.some(lec => initialLectureIds.includes(lec.lecture_id))
          )
          if (matchingCourse) {
            setSelectedCourseId(matchingCourse.course_id)
          } else if (!selectedCourseId) {
            // 매칭되는 강의가 없고 선택된 강의가 없으면 첫 번째 강의 선택
            setSelectedCourseId(coursesWithLectures[0].course_id)
          }
        } else if (!selectedCourseId && coursesWithLectures.length > 0) {
          // 선택된 강의가 없으면 첫 번째 강의 자동 선택
          setSelectedCourseId(coursesWithLectures[0].course_id)
        }
        
      } catch (err) {
        console.error('Failed to fetch courses:', err)
        setError('강의 목록을 불러오는데 실패했습니다')
        setCourses(TEMP_COURSES)
        if (!selectedCourseId) {
          setSelectedCourseId(TEMP_COURSES[0].course_id)
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCourses()
  }, []) // initialLectureIds 의존성 제거 (깜박임 방지)
  
  // initialLectureIds가 변경되면 해당 회차가 속한 강의를 다시 찾아서 선택
  useEffect(() => {
    if (initialLectureIds && initialLectureIds.length > 0 && courses.length > 0 && !isLoading) {
      const matchingCourse = courses.find(course => 
        course.lectures.some(lec => initialLectureIds.includes(lec.lecture_id))
      )
      if (matchingCourse && matchingCourse.course_id !== selectedCourseId) {
        setSelectedCourseId(matchingCourse.course_id)
      }
    }
  }, [initialLectureIds, courses, selectedCourseId, isLoading])

  // autoSelectLatest가 true일 때 가장 최신 회차 선택 (강의 목록이 로드된 후)
  useEffect(() => {
    if (autoSelectLatest && courses.length > 0 && !isLoading && !isLocked && !hasAutoSelected) {
      // 모든 강의의 모든 회차 중에서 is_available이 true인 것만 필터링
      const allAvailableLectures: (Lecture & { course_id: string })[] = []
      courses.forEach(course => {
        course.lectures
          .filter(lec => lec.is_available)
          .forEach(lec => {
            allAvailableLectures.push({ ...lec, course_id: course.course_id })
          })
      })
      
      if (allAvailableLectures.length > 0) {
        // lecture_date 기준으로 정렬하여 가장 최신 회차 찾기
        const sortedLectures = [...allAvailableLectures].sort((a, b) => {
          const dateA = new Date(a.lecture_date).getTime()
          const dateB = new Date(b.lecture_date).getTime()
          return dateB - dateA // 내림차순 (최신이 먼저)
        })
        
        const latestLecture = sortedLectures[0]
        setSelectedCourseId(latestLecture.course_id)
        onSelectLectureIds([latestLecture.lecture_id])
        setHasAutoSelected(true) // 자동 선택 완료 표시
      }
    }
    
    // autoSelectLatest가 false가 되면 플래그 초기화
    if (!autoSelectLatest) {
      setHasAutoSelected(false)
    }
  }, [autoSelectLatest, courses, isLoading, isLocked, hasAutoSelected, onSelectLectureIds])

  // 강의 선택 시 기존 회차 선택 초기화 - 잠금 상태면 무시
  const handleSelectCourse = (courseId: string) => {
    if (isLocked) return // 잠금 상태면 변경 불가
    
    setSelectedCourseId(courseId)
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
    <div className="h-full w-64 border-l border-gray-200 bg-white p-4 flex flex-col">
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
            {/* 불꽃 개수 표시 */}
            {selectedCourse && (
              <div className="flex items-center gap-1 shrink-0">
                <img 
                  src="/icon_flame.png" 
                  alt="flame" 
                  className="h-3.5 w-3.5 object-contain"
                  style={{ imageRendering: 'auto' }}
                />
                <span className="text-xs font-medium text-amber-600">
                  {flameCount[selectedCourse.course_id] || 0}
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (onGameIconClick && selectedCourseId) {
                                  const rect = e.currentTarget.getBoundingClientRect()
                                  onGameIconClick(lecture.lecture_id, selectedCourseId, lecture.lecture_no, {
                                    top: rect.top,
                                    left: rect.left,
                                    width: rect.width,
                                    height: rect.height,
                                  })
                                }
                              }}
                              className="flex h-5 w-5 items-center justify-center rounded-full transition-colors cursor-pointer bg-white/20 hover:bg-white/30"
                              title="게임 시작"
                            >
                              <Gamepad2 className="h-3 w-3 text-white" />
                            </button>
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
                            <img 
                              src="/icon_reward.png" 
                              alt="보상" 
                              className={`h-5 w-5 transition-all ${(gameProgress[lecture.lecture_id] || 0) < 10 ? 'grayscale opacity-50' : ''}`}
                            />
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
    </div>
  )
}