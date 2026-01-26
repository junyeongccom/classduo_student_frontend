'use client'

import { useMemo } from 'react'
import { DndContext, PointerSensor, useDroppable, useDraggable, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { FileText, GripVertical } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { ExamPrepCourse, ExamPrepMaterial } from '../../types'

interface ExamPrepMaterialsPanelProps {
  title: string
  description: string
  courseLabel: string
  coursePlaceholder: string
  courses: ExamPrepCourse[]
  selectedCourseId: string | null
  onSelectCourse: (courseId: string) => void
  emptyText: string
  dropHint: string
  materials: ExamPrepMaterial[]
  selectedMaterialId: string | null
  onSelectMaterial: (materialId: string) => void
}

function DraggableMaterial({ material }: { material: ExamPrepMaterial }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: material.id,
    data: { materialId: material.id },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'flex cursor-grab items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm transition',
        isDragging ? 'opacity-60' : 'hover:border-gray-300 hover:shadow'
      )}
    >
      <GripVertical className="h-4 w-4 text-gray-400" />
      <FileText className="h-4 w-4 text-gray-600" />
      <span className="truncate">{material.title}</span>
    </div>
  )
}

function DroppableSlot({ label }: { label: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'exam-prep-dropzone' })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center text-sm transition',
        isOver ? 'border-gray-400 bg-gray-50 text-gray-900' : 'border-gray-200 text-gray-400'
      )}
    >
      <FileText className="mb-2 h-5 w-5" />
      <p>{label}</p>
    </div>
  )
}

export function ExamPrepMaterialsPanel({
  title,
  description,
  courseLabel,
  coursePlaceholder,
  courses,
  selectedCourseId,
  onSelectCourse,
  emptyText,
  dropHint,
  materials,
  selectedMaterialId,
  onSelectMaterial,
}: ExamPrepMaterialsPanelProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const hasMaterials = materials.length > 0

  const selectedMaterial = useMemo(
    () => materials.find(material => material.id === selectedMaterialId),
    [materials, selectedMaterialId]
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const draggedId = event.active?.data?.current?.materialId as string | undefined
    if (!draggedId || !event.over) return
    onSelectMaterial(draggedId)
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{title}</p>
        <p className="mt-2 text-sm text-gray-600">{description}</p>
      </div>

      <div className="mb-4">
        <label className="text-xs font-medium text-gray-500">{courseLabel}</label>
        <select
          value={selectedCourseId ?? ''}
          onChange={event => onSelectCourse(event.target.value)}
          className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-gray-400 focus:outline-none"
        >
          <option value="" disabled>
            {coursePlaceholder}
          </option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.title}
              {course.termLabel ? ` · ${course.termLabel}` : ''}
            </option>
          ))}
        </select>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500">자료 목록</p>
            {hasMaterials ? (
              <div className="space-y-2">
                {materials.map(material => (
                  <DraggableMaterial key={material.id} material={material} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-400">
                {emptyText}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500">선택된 자료</p>
            {selectedMaterial ? (
              <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 shadow-sm">
                <FileText className="h-4 w-4 text-gray-600" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{selectedMaterial.title}</p>
                  <p className="text-xs text-gray-400">{dropHint}</p>
                </div>
              </div>
            ) : (
              <DroppableSlot label={dropHint} />
            )}
          </div>
        </div>
      </DndContext>
    </section>
  )
}

