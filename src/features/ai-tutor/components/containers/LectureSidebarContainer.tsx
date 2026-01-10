/**
 * 강의/수업일 선택 사이드바 Container 컴포넌트
 * - 데이터 로딩, 훅 호출, API 호출 등의 로직 담당
 * - UI 렌더링은 LectureSidebarUI에 위임
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiRequest } from '@/shared/lib/api'
import { useGameProgress } from '../../hooks/useGameProgress'
import { claimReward as claimRewardAPI } from '@/shared/services/progressService'
import {
  LectureSidebarUI,
  type Course,
  type FlyingFlame,
} from '../ui/LectureSidebarUI'

// 임시 데이터 (API 없을 때 사용)
const TEMP_COURSES: Course[] = [
  {
    course_id: 'temp-course-1',
    title: '생명과학의 세계',
    term: '2025-1학기',
    lectures: [
      {
        lecture_id: 'temp-lec-1',
        course_id: 'temp-course-1',
        lecture_no: 1,
        lecture_date: '2025-01-10',
        status: 'completed',
      },
      {
        lecture_id: 'temp-lec-2',
        course_id: 'temp-course-1',
        lecture_no: 2,
        lecture_date: '2025-01-15',
        status: 'completed',
      },
      {
        lecture_id: 'temp-lec-3',
        course_id: 'temp-course-1',
        lecture_no: 3,
        lecture_date: '2025-01-20',
        status: 'scheduled',
      },
    ],
  },
  {
    course_id: 'temp-course-2',
    title: '컴퓨터과학개론',
    term: '2025-1학기',
    lectures: [
      {
        lecture_id: 'temp-lec-4',
        course_id: 'temp-course-2',
        lecture_no: 1,
        lecture_date: '2025-01-11',
        status: 'completed',
      },
      {
        lecture_id: 'temp-lec-5',
        course_id: 'temp-course-2',
        lecture_no: 2,
        lecture_date: '2025-01-18',
        status: 'completed',
      },
    ],
  },
]

interface LectureSidebarContainerProps {
  selectedLectureIds: string[]
  onSelectLectureIds: (lectureIds: string[]) => void
  selectedCourseId: string | null
  onSelectCourse: (courseId: string | null) => void
  isLocked?: boolean
  initialLectureIds?: string[]
  autoSelectLatest?: boolean
  onAutoSelectComplete?: () => void
  onGameIconClick?: (
    lectureId: string,
    courseId: string,
    lectureNo: number,
    courseName: string,
    position: { top: number; left: number; width: number; height: number }
  ) => void
}

export function LectureSidebarContainer({
  selectedLectureIds,
  onSelectLectureIds,
  selectedCourseId,
  onSelectCourse,
  isLocked = false,
  initialLectureIds,
  autoSelectLatest = false,
  onAutoSelectComplete,
  onGameIconClick,
}: LectureSidebarContainerProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAutoSelected, setHasAutoSelected] = useState(false)
  const { gameProgress, claimedRewards, refreshStatus } = useGameProgress()
  const [flyingFlames, setFlyingFlames] = useState<FlyingFlame[]>([])
  const [flameHighlight, setFlameHighlight] = useState(false)

  // refs
  const flameCounterRef = useRef<HTMLDivElement>(null)
  const treasureRefs = useRef<{ [lectureId: string]: HTMLImageElement | null }>({})

  // 선택된 강의 객체
  const selectedCourse = courses.find(c => c.course_id === selectedCourseId) || null

  // 보물상자 클릭 핸들러 (보상 수령)
  const handleTreasureClick = useCallback(
    async (lectureId: string, courseId: string, e: React.MouseEvent<HTMLImageElement>) => {
      e.stopPropagation()

      const progress = gameProgress[lectureId] || 0
      const alreadyClaimed = claimedRewards[lectureId]

      if (progress < 10 || alreadyClaimed) return

      const treasureEl = treasureRefs.current[lectureId]
      const counterEl = flameCounterRef.current

      if (!treasureEl || !counterEl) return

      const treasureRect = treasureEl.getBoundingClientRect()
      const counterRect = counterEl.getBoundingClientRect()

      try {
        const result = await claimRewardAPI(lectureId)

        if (result.error) {
          console.error('[LectureSidebarContainer] 보상 클레임 실패:', result.error)
          return
        }

        refreshStatus()

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

        setTimeout(() => {
          setFlameHighlight(true)
          setTimeout(() => setFlameHighlight(false), 600)
          setFlyingFlames(prev => prev.filter(f => f.id !== flameId))
        }, 800)
      } catch (err) {
        console.error('[LectureSidebarContainer] 보상 클레임 예외:', err)
      }
    },
    [gameProgress, claimedRewards, refreshStatus]
  )

  // 강의 목록 가져오기
  useEffect(() => {
    const fetchCourses = async () => {
      if (courses.length === 0) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const coursesResult = await apiRequest<{ courses: any[]; total: number }>('/courses/all', {
          auth: true,
        })
        const coursesList = coursesResult.data?.courses

        if (
          coursesResult.error ||
          !coursesList ||
          !Array.isArray(coursesList) ||
          coursesList.length === 0
        ) {
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
          })),
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

    const currentCourse = selectedCourseId
      ? courses.find(course => course.course_id === selectedCourseId)
      : null

    const matchingCourse =
      initialLectureIds && initialLectureIds.length > 0
        ? courses.find(course =>
            course.lectures.some(lec => initialLectureIds.includes(lec.lecture_id))
          )
        : null

    if (matchingCourse && matchingCourse.course_id !== selectedCourseId) {
      onSelectCourse(matchingCourse.course_id)
      return
    }

    if (!currentCourse) {
      const fallback = matchingCourse ?? courses[0]
      if (fallback) {
        onSelectCourse(fallback.course_id)
      }
    }
  }, [courses, isLoading, selectedCourseId, initialLectureIds, onSelectCourse])

  const getLatestAvailableLecture = useCallback((course?: Course | null) => {
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
  }, [])

  // 과목 변경 시 최신 회차 자동 선택 (이전 과목 ID 추적하여 실제 변경 시에만 실행)
  const prevCourseIdRef = useRef<string | null>(null)
  
  useEffect(() => {
    if (!selectedCourseId || courses.length === 0 || isLoading || isLocked) {
      prevCourseIdRef.current = selectedCourseId
      return
    }

    // 과목이 실제로 변경된 경우에만 자동 선택
    const courseChanged = prevCourseIdRef.current !== selectedCourseId
    prevCourseIdRef.current = selectedCourseId

    if (!courseChanged) return

    const currentCourse = courses.find(course => course.course_id === selectedCourseId)
    if (!currentCourse) {
      return
    }

    const latestLecture = getLatestAvailableLecture(currentCourse)
    if (latestLecture) {
      onSelectLectureIds([latestLecture.lecture_id])
    }
  }, [selectedCourseId, courses, isLoading, isLocked, onSelectLectureIds, getLatestAvailableLecture])

  // autoSelectLatest가 true일 때 가장 최신 회차 선택
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
    getLatestAvailableLecture,
  ])

  // 강의 선택 시 기존 회차 선택 초기화
  const handleSelectCourse = useCallback(
    (courseId: string | null) => {
      if (isLocked) return
      onSelectCourse(courseId)
      setIsDropdownOpen(false)
      onSelectLectureIds([])
    },
    [isLocked, onSelectCourse, onSelectLectureIds]
  )

  // 회차 토글
  const handleToggleLecture = useCallback(
    (lectureId: string) => {
      if (isLocked) return
      if (selectedLectureIds.includes(lectureId)) {
        onSelectLectureIds(selectedLectureIds.filter(id => id !== lectureId))
      } else {
        onSelectLectureIds([...selectedLectureIds, lectureId])
      }
    },
    [isLocked, selectedLectureIds, onSelectLectureIds]
  )

  // 활성화된 회차 전체 선택/해제
  const handleToggleSelectAll = useCallback(() => {
    if (isLocked || !selectedCourse) return

    const availableLectures = selectedCourse.lectures.filter(lec => lec.is_available)
    const availableLectureIds = availableLectures.map(lec => lec.lecture_id)
    const allSelected = availableLectureIds.every(id => selectedLectureIds.includes(id))

    if (allSelected) {
      onSelectLectureIds(selectedLectureIds.filter(id => !availableLectureIds.includes(id)))
    } else {
      const newSelected = [...new Set([...selectedLectureIds, ...availableLectureIds])]
      onSelectLectureIds(newSelected)
    }
  }, [isLocked, selectedCourse, selectedLectureIds, onSelectLectureIds])

  // 드롭다운 토글
  const handleDropdownToggle = useCallback(() => {
    setIsDropdownOpen(prev => !prev)
  }, [])

  return (
    <LectureSidebarUI
      courses={courses}
      selectedCourse={selectedCourse}
      selectedCourseId={selectedCourseId}
      selectedLectureIds={selectedLectureIds}
      gameProgress={gameProgress}
      claimedRewards={claimedRewards}
      isLoading={isLoading}
      error={error}
      isLocked={isLocked}
      isDropdownOpen={isDropdownOpen}
      flyingFlames={flyingFlames}
      flameHighlight={flameHighlight}
      flameCounterRef={flameCounterRef}
      treasureRefs={treasureRefs}
      onSelectCourse={handleSelectCourse}
      onToggleLecture={handleToggleLecture}
      onToggleSelectAll={handleToggleSelectAll}
      onDropdownToggle={handleDropdownToggle}
      onTreasureClick={handleTreasureClick}
      onGameIconClick={onGameIconClick}
    />
  )
}

