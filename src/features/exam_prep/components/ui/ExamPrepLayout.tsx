'use client'

import type { ReactNode } from 'react'
import { FileText, Brain, ClipboardCheck, Maximize2 } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ExamPrepCourse, ExamPrepTab, ExamPrepMaterial } from '../../types'

const TAB_ITEMS: Array<{ id: ExamPrepTab; icon: typeof FileText }> = [
  { id: 'summary', icon: FileText },
  { id: 'memorize', icon: Brain },
  { id: 'quiz', icon: ClipboardCheck },
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
  pdfLoading?: boolean
  pdfLoadingContent?: ReactNode
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
  pdfLoading = false,
  pdfLoadingContent,
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
      <div className="flex h-full min-h-0 w-full flex-1">
        <section className="flex h-full min-h-0 flex-col" style={{ width: leftWidth }}>
          <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
            <div className="flex h-11 items-center justify-between border-b border-gray-200 px-3">
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
            ) : pdfLoading && pdfLoadingContent ? (
              pdfLoadingContent
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-gray-400">
                {pdfPlaceholder}
              </div>
            )}
          </div>
        </section>

        <div
          className="relative flex w-px cursor-col-resize items-stretch justify-center bg-gray-300/80"
          onMouseDown={onResizeStart}
        />

        <section className="flex h-full min-h-0 flex-1 flex-col">
          <div className="flex h-11 items-center gap-2 border-b border-gray-200 px-3">
              {TAB_ITEMS.map(({ id, icon: Icon }) => {
                const isActive = activeTab === id
                return (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium transition',
                      isActive
                      ? 'border-b-2 border-gray-900 text-gray-900'
                      : 'border-b-2 border-transparent text-gray-500 hover:text-gray-900'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tabLabels[id]}
                  </button>
                )
              })}
          </div>

          <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
            {content}
          </div>
        </section>
      </div>
    </div>
  )
}

