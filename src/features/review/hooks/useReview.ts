/**
 * 복습 콘텐츠 관련 훅
 */
import { useState, useEffect } from 'react'
import { reviewService, LectureListResponse, ReviewCarouselResponse } from '../services/reviewService'

export function useLectureList(courseId: string | null) {
  const [data, setData] = useState<LectureListResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!courseId) {
      setData(null)
      return
    }

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await reviewService.getLectureListByCourse(courseId)
        if (result.error) {
          setError(result.error.message || '강의회차 리스트를 불러오는데 실패했습니다')
          setData(null)
        } else {
          setData(result.data)
        }
      } catch (err) {
        setError('강의회차 리스트를 불러오는데 실패했습니다')
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [courseId])

  return { data, isLoading, error }
}

export function useReviewCarousel(lectureId: string | null) {
  const [data, setData] = useState<ReviewCarouselResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lectureId) {
      setData(null)
      return
    }

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await reviewService.getReviewCarousel(lectureId)
        if (result.error) {
          setError(result.error.message || '복습 캐러셀을 불러오는데 실패했습니다')
          setData(null)
        } else {
          setData(result.data)
        }
      } catch (err) {
        setError('복습 캐러셀을 불러오는데 실패했습니다')
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [lectureId])

  return { data, isLoading, error, refetch: () => {
    if (lectureId) {
      const fetchData = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const result = await reviewService.getReviewCarousel(lectureId)
          if (result.error) {
            setError(result.error.message || '복습 캐러셀을 불러오는데 실패했습니다')
            setData(null)
          } else {
            setData(result.data)
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

