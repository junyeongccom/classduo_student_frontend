'use client'

import { useEffect, useState } from 'react'
import { examPrepService } from '../services/examPrepService'
import type { ExamPrepMaterial } from '../types'

export function useExamPrepMaterials(courseId: string | null) {
  const [materials, setMaterials] = useState<ExamPrepMaterial[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchMaterials = async () => {
      if (!courseId) {
        setMaterials([])
        return
      }

      setIsLoading(true)
      setError(null)
      const result = await examPrepService.getCourseMaterials(courseId)

      if (!isMounted) return

      if (result.error || !result.data) {
        setError(result.error?.message ?? '강의자료를 불러오지 못했습니다')
        setMaterials([])
        setIsLoading(false)
        return
      }

      const mapped = result.data.materials.map(material => ({
        id: material.material_id,
        title: material.original_filename,
        fileType: material.file_type,
        signedUrl: material.signed_url,
      }))

      setMaterials(mapped)
      setIsLoading(false)
    }

    fetchMaterials()

    return () => {
      isMounted = false
    }
  }, [courseId])

  return {
    materials,
    isLoading,
    error,
  }
}

