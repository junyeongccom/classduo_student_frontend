/**
 * 강의/수업일 선택 사이드바
 * - 드롭다운으로 강의(course) 선택
 * - 선택된 강의의 회차(lecture) 목록 표시
 * - 복수 회차 선택 가능
 */
'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Loader2, BookOpen, Calendar } from 'lucide-react'
import { apiRequest } from '@/shared/lib/api'

// API 응답 타입
interface Lecture {
  lecture_id: string
  course_id: string
  lecture_no: number
  lecture_date: string
  status: string
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

export function LectureSidebar({ selectedLectureIds, onSelectLectureIds }: LectureSidebarProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 선택된 강의 객체
  const selectedCourse = courses.find(c => c.course_id === selectedCourseId)

  // 강의 목록 가져오기
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true)
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
          setSelectedCourseId(TEMP_COURSES[0].course_id)
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
          }))
        }))
        
        setCourses(coursesWithLectures)
        
        // 첫 번째 강의 자동 선택
        if (coursesWithLectures.length > 0) {
          setSelectedCourseId(coursesWithLectures[0].course_id)
        }
        
      } catch (err) {
        console.error('Failed to fetch courses:', err)
        setError('강의 목록을 불러오는데 실패했습니다')
        setCourses(TEMP_COURSES)
        setSelectedCourseId(TEMP_COURSES[0].course_id)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCourses()
  }, [])

  // 강의 선택 시 기존 회차 선택 초기화
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    setIsDropdownOpen(false)
    onSelectLectureIds([]) // 회차 선택 초기화
  }

  // 회차 토글 (복수 선택)
  const toggleLecture = (lectureId: string) => {
    if (selectedLectureIds.includes(lectureId)) {
      onSelectLectureIds(selectedLectureIds.filter(id => id !== lectureId))
    } else {
      onSelectLectureIds([...selectedLectureIds, lectureId])
    }
  }

  if (isLoading) {
    return (
      <div className="h-full w-64 border-l border-gray-200 bg-white p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full w-64 border-l border-gray-200 bg-white p-4 flex flex-col">
      {/* 헤더 */}
      <h2 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        수업 선택
      </h2>
      
      {error && (
        <p className="mb-3 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">{error}</p>
      )}
      
      {/* 강의 선택 드롭다운 */}
      <div className="relative mb-4">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <span className={selectedCourse ? 'text-gray-900 font-medium' : 'text-gray-400'}>
            {selectedCourse?.title || '강의를 선택하세요'}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
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
          <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3.5 w-3.5" />
            <span>회차 선택 (복수 선택 가능)</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {selectedCourse.lectures.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                등록된 회차가 없습니다
              </p>
            ) : (
              selectedCourse.lectures.map(lecture => {
                const isSelected = selectedLectureIds.includes(lecture.lecture_id)
                return (
                  <button
                    key={lecture.lecture_id}
                    onClick={() => toggleLecture(lecture.lecture_id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all ${
                      isSelected 
                        ? 'bg-primary-500 text-white shadow-sm' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                        {lecture.lecture_no}회차
                      </p>
                      <p className={`text-xs ${isSelected ? 'text-primary-100' : 'text-gray-400'}`}>
                        {lecture.lecture_date}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
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
        <div className="mt-4 rounded-lg bg-primary-50 px-3 py-2.5 border border-primary-100">
          <p className="text-xs font-medium text-primary-800">
            선택된 회차: {selectedLectureIds.length}개
          </p>
          {selectedLectureIds.length > 1 && (
            <p className="mt-1 text-[10px] text-primary-600">
              복수 선택 시 후킹 질문은 제공되지 않습니다
            </p>
          )}
        </div>
      )}
    </div>
  )
}

