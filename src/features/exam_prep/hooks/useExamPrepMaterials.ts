'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { examPrepService, cacheSignedUrlFromApi } from '../services/examPrepService'
import type { ExamPrepMaterial } from '../types'

const MATERIALS_STORAGE_PREFIX = 'exam_prep_materials'
const LOCAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24시간 TTL
const materialsCache = new Map<string, { items: ExamPrepMaterial[]; updatedAt: number }>()

const readLocalJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const writeLocalJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage quota errors
  }
}

export function useExamPrepMaterials(courseId: string | null) {
  const { user } = useAuthStore()
  const userId = user?.user_id ?? 'anonymous'
  const [materials, setMaterials] = useState<ExamPrepMaterial[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cacheKey = useMemo(() => {
    if (!courseId) return null
    return `${MATERIALS_STORAGE_PREFIX}:${courseId}:${userId}`
  }, [courseId, userId])

  const fetchMaterials = useCallback(async () => {
    if (!courseId) {
      setMaterials([])
      return
    }

    const cached = cacheKey ? materialsCache.get(cacheKey) : null
    if (cached?.items?.length) {
      setMaterials(cached.items)
    } else if (cacheKey) {
      const localCached = readLocalJson<{ items: ExamPrepMaterial[]; updatedAt: number } | null>(cacheKey, null)
      if (localCached?.items?.length) {
        // TTL 체크: 24시간 이상 경과한 캐시는 무시 (stale signed URL 방지)
        if (Date.now() - localCached.updatedAt > LOCAL_CACHE_TTL_MS) {
          localStorage.removeItem(cacheKey)
        } else {
          // signed URL은 만료되었을 수 있으므로 null로 초기화
          const sanitized = localCached.items.map(item => ({ ...item, signedUrl: null }))
          const sanitizedPayload = { items: sanitized, updatedAt: localCached.updatedAt }
          materialsCache.set(cacheKey, sanitizedPayload)
          setMaterials(sanitized)
        }
      }
    }

    setIsLoading(!(materialsCache.get(cacheKey ?? '')?.items?.length))
    setError(null)
    const directResult = await examPrepService.getCourseMaterialsDirect(courseId)
    if (!directResult.error && directResult.data) {
      const mapped = directResult.data.materials.map(material => {
        if (material.signed_url) {
          cacheSignedUrlFromApi(material.material_id, material.signed_url)
        }
        return {
          id: material.material_id,
          title: material.original_filename,
          fileType: material.file_type,
          signedUrl: material.signed_url,
        }
      })

      setMaterials(mapped)
      if (cacheKey) {
        const payload = { items: mapped, updatedAt: Date.now() }
        materialsCache.set(cacheKey, payload)
        writeLocalJson(cacheKey, payload)
      }
      setIsLoading(false)
    }

    const result = await examPrepService.getCourseMaterials(courseId)

    if (result.error || !result.data) {
      setError(result.error?.message ?? directResult.error?.message ?? '강의자료를 불러오지 못했습니다')
      if (!materialsCache.get(cacheKey ?? '')?.items?.length) {
        setMaterials([])
      }
      setIsLoading(false)
      return
    }

    const mapped = result.data.materials.map(material => {
      if (material.signed_url) {
        cacheSignedUrlFromApi(material.material_id, material.signed_url)
      }
      return {
        id: material.material_id,
        title: material.original_filename,
        fileType: material.file_type,
        signedUrl: material.signed_url,
      }
    })

    setMaterials(mapped)
    if (cacheKey) {
      const payload = { items: mapped, updatedAt: Date.now() }
      materialsCache.set(cacheKey, payload)
      writeLocalJson(cacheKey, payload)
    }
    setIsLoading(false)
  }, [courseId, cacheKey])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  return {
    materials,
    isLoading,
    error,
    refresh: fetchMaterials,
  }
}
