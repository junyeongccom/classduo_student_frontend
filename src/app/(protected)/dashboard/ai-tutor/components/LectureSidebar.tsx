/**
 * 강의/수업일 선택 사이드바 (임시 하드코딩)
 */
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

// 임시 Mock 데이터
const MOCK_LECTURES = [
  {
    id: 'course-1',
    courseName: '생명과학의 세계',
    lectures: [
      { id: 'lec-1', date: '2025-01-10', title: '1회차 - 세포의 기본 개념', jobId: 'job-id-1' },
      { id: 'lec-2', date: '2025-01-15', title: '2회차 - 세포 소통', jobId: 'job-id-2' },
      { id: 'lec-3', date: '2025-01-20', title: '3회차 - 유전 정보', jobId: 'job-id-3' },
    ]
  },
]

interface LectureSidebarProps {
  selectedJobIds: string[]
  onSelectJobIds: (jobIds: string[]) => void
}

export function LectureSidebar({ selectedJobIds, onSelectJobIds }: LectureSidebarProps) {
  const [expandedCourses, setExpandedCourses] = useState<string[]>(['course-1'])

  const toggleCourse = (courseId: string) => {
    setExpandedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  const toggleLecture = (jobId: string) => {
    if (selectedJobIds.includes(jobId)) {
      onSelectJobIds(selectedJobIds.filter(id => id !== jobId))
    } else {
      onSelectJobIds([...selectedJobIds, jobId])
    }
  }

  return (
    <div className="h-full w-64 border-l border-gray-200 bg-white p-3">
      <h2 className="mb-3 text-sm font-semibold text-gray-700">수업</h2>
      
      <div className="space-y-1">
        {MOCK_LECTURES.map(course => (
          <div key={course.id}>
            {/* 강의 헤더 */}
            <button
              onClick={() => toggleCourse(course.id)}
              className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-xs hover:bg-gray-50"
            >
              {expandedCourses.includes(course.id) ? (
                <ChevronDown className="h-3 w-3 text-gray-500" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-500" />
              )}
              <span className="font-medium text-gray-800">{course.courseName}</span>
            </button>

            {/* 수업일 목록 */}
            {expandedCourses.includes(course.id) && (
              <div className="ml-4 mt-0.5 space-y-0.5">
                {course.lectures.map(lecture => {
                  const isSelected = selectedJobIds.includes(lecture.jobId)
                  return (
                    <button
                      key={lecture.id}
                      onClick={() => toggleLecture(lecture.jobId)}
                      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition-colors ${
                        isSelected 
                          ? 'bg-primary-500 text-white' 
                          : 'hover:bg-gray-50 text-gray-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`truncate font-medium ${isSelected ? 'text-white' : 'text-gray-700'}`}>
                          {lecture.title}
                        </p>
                        <p className={`text-[10px] ${isSelected ? 'text-primary-100' : 'text-gray-400'}`}>
                          {lecture.date}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
                          강의자료
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 선택된 수업일 표시 */}
      {selectedJobIds.length > 0 && (
        <div className="mt-3 rounded bg-primary-50 px-2 py-1.5">
          <p className="text-xs font-medium text-primary-800">
            선택된 수업일: {selectedJobIds.length}개
          </p>
          {selectedJobIds.length > 1 && (
            <p className="mt-0.5 text-[10px] text-primary-600">
              복수 선택 시 후킹 질문은 제공되지 않습니다
            </p>
          )}
        </div>
      )}
    </div>
  )
}

