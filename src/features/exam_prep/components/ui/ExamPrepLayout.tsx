'use client'

import type { ReactNode } from 'react'
import { FileText, Bot, Brain, ClipboardCheck, NotebookText, Maximize2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ExamPrepCourse, ExamPrepTab, ExamPrepMaterial } from '../../types'

const TAB_ITEMS: Array<{ id: ExamPrepTab; icon: typeof FileText }> = [
  { id: 'summary', icon: FileText },
  { id: 'quiz', icon: ClipboardCheck },
  { id: 'memorize', icon: Brain },
  { id: 'notes', icon: NotebookText },
  { id: 'aiTutor', icon: Bot },
]

interface ExamPrepLayoutProps {
  title: string
  subtitle: string
  materialsCourseLabel: string
  materialsCoursePlaceholder: string
  materialsLabel: string
  materialsPlaceholder: string
  pdfTitle: string
  pdfPlaceholder: string
  courses: ExamPrepCourse[]
  selectedCourseId: string | null
  onSelectCourse: (courseId: string) => void
  tabLabels: Record<ExamPrepTab, string>
  activeTab: ExamPrepTab
  onTabChange: (tab: ExamPrepTab) => void
  materials: ExamPrepMaterial[]
  selectedMaterialId: string | null
  onSelectMaterial: (materialId: string) => void
  isPdfAvailable: boolean
  pdfContent: ReactNode
  pdfActionLabel: string
  onPdfAction: () => void
  content: ReactNode
  leftWidth: number
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void
}

export function ExamPrepLayout({
  title,
  subtitle,
  materialsCourseLabel,
  materialsCoursePlaceholder,
  materialsLabel,
  materialsPlaceholder,
  pdfTitle,
  pdfPlaceholder,
  courses,
  selectedCourseId,
  onSelectCourse,
  tabLabels,
  activeTab,
  onTabChange,
  materials,
  selectedMaterialId,
  onSelectMaterial,
  isPdfAvailable,
  pdfContent,
  pdfActionLabel,
  onPdfAction,
  content,
  leftWidth,
  onResizeStart,
}: ExamPrepLayoutProps) {
  const selectedMaterialTitle = selectedMaterialId
    ? materials.find(material => material.id === selectedMaterialId)?.title
    : undefined
  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50 text-gray-900">
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="grid w-full grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <div className="flex min-w-0 flex-col">
                <label className="text-xs font-medium text-gray-500">{materialsCourseLabel}</label>
                <select
                  value={selectedCourseId ?? ''}
                  onChange={event => onSelectCourse(event.target.value)}
                  className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm transition focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 md:w-[260px]"
                >
                  <option value="" disabled>
                    {materialsCoursePlaceholder}
                  </option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                      {course.professorName ? `(${course.professorName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex min-w-0 flex-col">
                <label className="text-xs font-medium text-gray-500">{materialsLabel}</label>
                <select
                  value={selectedMaterialId ?? ''}
                  onChange={event => onSelectMaterial(event.target.value)}
                  title={selectedMaterialTitle ?? materialsPlaceholder}
                  className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm transition focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 md:w-[380px] truncate"
                >
                  <option value="" disabled>
                    {materialsPlaceholder}
                  </option>
                  {materials.map(material => (
                    <option key={material.id} value={material.id}>
                      {material.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-full min-h-0 w-full flex-1 gap-0 px-0 py-2">
        <section className="flex h-full min-h-0 flex-col gap-2 pr-0" style={{ width: leftWidth }}>
          <div className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4 text-gray-500" />
                {pdfTitle}
              </div>
              <button
                type="button"
                onClick={onPdfAction}
                disabled={!isPdfAvailable}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                  isPdfAvailable
                    ? "border-gray-200 text-gray-600 hover:border-gray-300"
                    : "border-gray-100 text-gray-300"
                )}
              >
                <Maximize2 className="h-3.5 w-3.5" />
                {pdfActionLabel}
              </button>
            </div>
            {isPdfAvailable ? (
              pdfContent
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-gray-400">
                {pdfPlaceholder}
              </div>
            )}
          </div>
        </section>

        <div
          className="relative flex w-3 cursor-col-resize items-stretch justify-center"
          onMouseDown={onResizeStart}
        >
          <div className="h-full w-px bg-gray-200 transition-colors hover:bg-gray-300" />
        </div>

        <section className="flex h-full min-h-0 flex-1 flex-col gap-2 pl-0">
          <div className="rounded-2xl border border-gray-200 bg-white/80 px-3 py-2 shadow-sm backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              {TAB_ITEMS.map(({ id, icon: Icon }) => {
                const isActive = activeTab === id
                return (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={cn(
                      'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                      isActive
                        ? 'border-gray-900 bg-gray-900 text-white shadow'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tabLabels[id]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex h-full min-h-0 flex-1 flex-col rounded-2xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur">
            {content}
          </div>
        </section>
      </div>
    </div>
  )
}

