/**
 * 강의/수업일 선택 사이드바 Container 컴포넌트
 * - 데이터 로딩, 훅 호출, API 호출 등의 로직 담당
 * - UI 렌더링은 LectureSidebarUI에 위임
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiRequest } from '@/shared/lib/api'
import { ensureValidToken } from '@/shared/lib/supabase'
import { useGameProgress } from '../../hooks/useGameProgress'
import { claimReward as claimRewardAPI } from '@/shared/services/progressService'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type { AppLocale } from '@/shared/i18n/I18nProvider'
import { useAITutorStore, type AITutorCourse } from '../../store/useAITutorStore'
import {
  LectureSidebarUI,
  type Course,
  type FlyingFlame,
} from '../ui/LectureSidebarUI'

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
  const { gameProgress, claimedRewards, flameCount, refreshStatus } = useGameProgress()
  const [flyingFlames, setFlyingFlames] = useState<FlyingFlame[]>([])
  const [flameHighlight, setFlameHighlight] = useState(false)
  
  // 인증 상태 구독
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const { locale } = useI18n()
  const { coursesByLocale, setCoursesCache } = useAITutorStore(state => ({
    coursesByLocale: state.coursesByLocale,
    setCoursesCache: state.setCoursesCache,
  }))

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

        console.log('[LectureSidebarContainer] 보상 클레임 성공:', result.data)

        // 즉시 refreshStatus 호출 (Realtime 이벤트가 오지 않을 경우 대비)
        refreshStatus()

        // 애니메이션 시작
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

        // 애니메이션 완료 후 한 번 더 갱신 (DB 트리거 완료 보장)
        setTimeout(() => {
          console.log('[LectureSidebarContainer] 애니메이션 완료 후 refreshStatus 호출')
          refreshStatus()
          setFlameHighlight(true)
          setTimeout(() => setFlameHighlight(false), 600)
          setFlyingFlames(prev => prev.filter(f => f.id !== flameId))
        }, 1000) // 애니메이션 시간(800ms) + 여유 시간(200ms)
      } catch (err) {
        console.error('[LectureSidebarContainer] 보상 클레임 예외:', err)
      }
    },
    [gameProgress, claimedRewards, refreshStatus]
  )

  // 강의 목록 가져오기 (재시도 로직 포함)
  // isAuthenticated가 변경될 때마다 다시 호출 (로그인 직후 데이터 로드)
  useEffect(() => {
    // 인증되지 않은 상태면 API 호출하지 않음
    if (!isAuthenticated) {
      setIsLoading(false)
      setCourses([])
      return
    }

    let isMounted = true
    let retryCount = 0
    const maxRetries = 1

    const fetchCourses = async (targetLocale: AppLocale, updateState: boolean): Promise<boolean> => {
      try {
        const coursesResult = await apiRequest<{ courses: any[]; total: number }>('/courses/all', {
          auth: true,
          headers: { 'Accept-Language': targetLocale },
        })
        const coursesList = coursesResult.data?.courses

        if (coursesResult.error) {
          console.error('API error:', coursesResult.error)
          return false
        }

        if (!coursesList || !Array.isArray(coursesList)) {
          console.error('Invalid courses data:', coursesList)
          return false
        }

        const coursesWithLectures: AITutorCourse[] = coursesList.map((course: any) => ({
          course_id: course.course_id,
          title: course.title,
          professor_name: course.professor_name ?? course.professorName ?? null,
          section: course.section ?? course.section_no ?? course.sectionNo ?? null,
          lectures: (course.lectures || []).map((lec: any) => ({
            lecture_id: lec.lecture_id,
            course_id: lec.course_id,
            lecture_no: lec.lecture_no,
            title: lec.title ?? null,
            lecture_date: lec.lecture_date,
            start_time: lec.start_time ?? null,
            status: lec.status,
            is_available: lec.is_available ?? false,
            essence_7words: lec.essence_7words ?? null,
            content_pipeline_status: lec.content_pipeline_status ?? 'idle',
          })),
        }))

        if (isMounted) {
          setCoursesCache(targetLocale, coursesWithLectures)
          if (updateState) {
            setCourses(coursesWithLectures)
            setError(null)
          }
        }
        return true
      } catch (err) {
        console.error('Failed to fetch courses:', err)
        return false
      }
    }

    const loadWithRetry = async () => {
      if (isMounted) {
        setIsLoading(true)
        setError(null)
      }

      // 토큰 유효성 사전 확인 (만료 시 갱신)
      await ensureValidToken()

      // 토큰이 localStorage에 저장될 시간을 주기 위해 약간의 딜레이 추가
      await new Promise(resolve => setTimeout(resolve, 100))

      let success = await fetchCourses(locale, true)

      // 실패 시 재시도
      while (!success && retryCount < maxRetries && isMounted) {
        retryCount++
        console.log(`Retrying fetch courses... (${retryCount}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1초 대기 후 재시도
        success = await fetchCourses(locale, true)
      }

      if (isMounted) {
        if (!success) {
          setError('강의 목록을 불러오는데 실패했습니다. 페이지를 새로고침해주세요.')
          setCourses([])
        }
        setIsLoading(false)
      }
    }

    const cached = coursesByLocale[locale]
    if (cached) {
      setCourses(cached)
      setIsLoading(false)
      const hasMeta = cached.some(course => course.professor_name || course.section)
      if (!hasMeta) {
        loadWithRetry()
      }
    } else {
      loadWithRetry()
    }

    const oppositeLocale: AppLocale = locale === 'ko' ? 'en' : 'ko'
    if (!coursesByLocale[oppositeLocale]) {
      fetchCourses(oppositeLocale, false)
    }

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, locale, coursesByLocale, setCoursesCache])

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

  const getLatestLectureAcrossCourses = useCallback((courseList: Course[]) => {
    const candidates = courseList
      .map(course => {
        const latestLecture = getLatestAvailableLecture(course)
        return latestLecture ? { course, lecture: latestLecture } : null
      })
      .filter(Boolean) as Array<{ course: Course; lecture: Course['lectures'][number] }>

    if (candidates.length === 0) return null
    return candidates.reduce((latest, item) => {
      const latestTime = new Date(latest.lecture.lecture_date).getTime()
      const currentTime = new Date(item.lecture.lecture_date).getTime()
      return currentTime > latestTime ? item : latest
    })
  }, [getLatestAvailableLecture])

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

    const latest = getLatestLectureAcrossCourses(courses)
    if (!latest) {
      return
    }

    if (latest.course.course_id !== selectedCourseId) {
      onSelectCourse(latest.course.course_id)
    } else if (!selectedCourseId) {
      onSelectCourse(latest.course.course_id)
    }

    onSelectLectureIds([latest.lecture.lecture_id])
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
    getLatestLectureAcrossCourses,
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
      flameCount={flameCount}
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

