/**
 * @file LeftPanelMaterials.tsx
 * @description 좌측 패널 - 강의자료 탭 (PDF 뷰어 placeholder)
 * @module features/lecture-study/components/ui
 * @dependencies lucide-react
 */

import { FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function LeftPanelMaterials() {
  const t = useTranslations()

  // TODO: Task 430에서 lecture_material_mappings API 연동 후 ExamPrepPdfViewer 통합
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-400">
      <FileText className="h-10 w-10" />
      <p className="text-sm">{t('lectureStudy.leftPanel.materialsPreparing')}</p>
    </div>
  )
}
