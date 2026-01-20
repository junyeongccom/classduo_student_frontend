/**
 * 복습 콘텐츠 관련 훅
 */
'use client'

import { useState, useEffect } from 'react'
import { reviewService, LectureListResponse, ReviewCarouselResponse } from '../services/reviewService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type { AppLocale } from '@/shared/i18n/I18nProvider'
import { useReviewStore } from '@/features/review/store/useReviewStore'

export function useLectureList(courseId: string | null) {
  const { locale } = useI18n()
  const { lectureListByLocale, setLectureListCache } = useReviewStore()
  const [data, setData] = useState<LectureListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) {
      setData(null)
      return
    }

    const fetchData = async (targetLocale: AppLocale, updateState: boolean) => {
      if (updateState) {
        setIsLoading(true)
        setError(null)
      }

      try {
        const result = await reviewService.getLectureListByCourse(courseId, targetLocale)
        if (result.error) {
          if (updateState) {
            setError(result.error.message || '강의회차 리스트를 불러오는데 실패했습니다')
            setData(null)
          }
        } else {
          if (result.data) {
            setLectureListCache(targetLocale, courseId, result.data)
            if (updateState) {
              setData(result.data)
            }
          }
        }
      } catch (err) {
        if (updateState) {
          setError('강의회차 리스트를 불러오는데 실패했습니다')
          setData(null)
        }
      } finally {
        if (updateState) {
          setIsLoading(false)
        }
      }
    }

    const cached = lectureListByLocale[locale]?.[courseId]
    if (cached) {
      setData(cached)
      setIsLoading(false)
    } else {
      fetchData(locale, true)
    }

    const oppositeLocale: AppLocale = locale === 'ko' ? 'en' : 'ko'
    if (!lectureListByLocale[oppositeLocale]?.[courseId]) {
      fetchData(oppositeLocale, false)
    }
  }, [courseId, locale, lectureListByLocale, setLectureListCache])

  return { data, isLoading, error }
}

export function useReviewCarousel(lectureId: string | null) {
  const { locale } = useI18n()
  const { reviewCarouselByLocale, setReviewCarouselCache } = useReviewStore()
  const [data, setData] = useState<ReviewCarouselResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lectureId) {
      setData(null)
      return
    }

    const fetchData = async (targetLocale: AppLocale, updateState: boolean) => {
      if (updateState) {
        setIsLoading(true)
        setError(null)
      }

      try {
        const result = await reviewService.getReviewCarousel(lectureId, targetLocale)
        if (result.error) {
          if (updateState) {
            setError(result.error.message || '복습 캐러셀을 불러오는데 실패했습니다')
            setData(null)
          }
        } else {
          if (result.data) {
            setReviewCarouselCache(targetLocale, lectureId, result.data)
            if (updateState) {
              setData(result.data)
            }
          }
        }
      } catch (err) {
        if (updateState) {
          setError('복습 캐러셀을 불러오는데 실패했습니다')
          setData(null)
        }
      } finally {
        if (updateState) {
          setIsLoading(false)
        }
      }
    }

    const cached = reviewCarouselByLocale[locale]?.[lectureId]
    if (cached) {
      setData(cached)
      setIsLoading(false)
    } else {
      fetchData(locale, true)
    }

    const oppositeLocale: AppLocale = locale === 'ko' ? 'en' : 'ko'
    if (!reviewCarouselByLocale[oppositeLocale]?.[lectureId]) {
      fetchData(oppositeLocale, false)
    }
  }, [lectureId, locale, reviewCarouselByLocale, setReviewCarouselCache])

  return { data, isLoading, error, refetch: () => {
    if (lectureId) {
      const fetchData = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const result = await reviewService.getReviewCarousel(lectureId, locale)
          if (result.error) {
            setError(result.error.message || '복습 캐러셀을 불러오는데 실패했습니다')
            setData(null)
          } else {
            if (result.data) {
              setReviewCarouselCache(locale, lectureId, result.data)
              setData(result.data)
            }
          }
        } catch (err) {
          setError('복습 캐러셀을 불러오는데 실패했습니다')
          setData(null)
        } finally {
          setIsLoading(false)
        }
      }
      fetchData()
    }
  } }
}

