/**
 * 복습 콘텐츠 우측 사이드바
 * - 강의 선택 드롭다운
 * - 선택된 강의의 회차 리스트 (수업일, 본질한줄)
 */
'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Loader2, BookOpen, Calendar } from 'lucide-react'
import { apiRequest } from '@/shared/lib/api'
import { useLectureList } from '@/features/review/hooks/useReview'

interface Course {
  course_id: string
  title: string
  academic_year: number
  term_code: string
  section: string | null
}

interface ReviewSidebarProps {
  selectedLectureId: string | null
  onSelectLectureId: (lectureId: string | null) => void
}

export function ReviewSidebar({ selectedLectureId, onSelectLectureId }: ReviewSidebarProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { data: lectureList, isLoading: isLoadingLectures } = useLectureList(selectedCourseId)

  // 강의 목록 가져오기
  useEffect(() => {
    const fetchCourses = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const coursesResult = await apiRequest<{ courses: any[], total: number }>('/courses/all', { auth: true })
        
        const coursesList = coursesResult.data?.courses
        
        if (coursesResult.error || !coursesList || !Array.isArray(coursesList) || coursesList.length === 0) {
          setError('강의 목록을 불러오는데 실패했습니다')
          return
        }
        
        const coursesData: Course[] = coursesList.map((course: any) => ({
          course_id: course.course_id,
          title: course.title,
          academic_year: course.academic_year,
          term_code: course.term_code,
          section: course.section,
        }))
        
        setCourses(coursesData)
        
        // 첫 번째 강의 자동 선택
        if (coursesData.length > 0) {
          setSelectedCourseId(coursesData[0].course_id)
        }
        
      } catch (err) {
        console.error('Failed to fetch courses:', err)
        setError('강의 목록을 불러오는데 실패했습니다')
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCourses()
  }, [])

  // 강의 선택 시 회차 선택 초기화
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId)
    setIsDropdownOpen(false)
    onSelectLectureId(null) // 회차 선택 초기화
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

  if (isLoading) {
    return (
      <div className="h-full w-80 border-l border-gray-200 bg-white p-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="h-full w-80 border-l border-gray-200 bg-white p-4 flex flex-col">
      {/* 헤더 */}
      <h2 className="mb-4 text-sm font-semibold text-gray-700 flex items-center gap-2">
        <BookOpen className="h-4 w-4" />
        수업
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
                
                return (
                  <button
                    key={lecture.lecture_id}
                    onClick={() => handleSelectLecture(lecture.lecture_id, lecture.essence_7words)}
                    disabled={isAnalyzing}
                    className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-all ${
                      isAnalyzing
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                        : isSelected 
                          ? 'bg-primary-500 text-white shadow-sm' 
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
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
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

