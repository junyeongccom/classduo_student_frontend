/**
 * 복습 콘텐츠 상태 관리 Store
 * 빈칸의 revealed 상태를 미리 로드하여 즉시 표시 가능하도록 관리
 */
import { create } from 'zustand'
import type { ReviewCarouselResponse, LectureListResponse } from '../services/reviewService'
import type { AppLocale } from '@/shared/i18n/I18nProvider'

export interface ReviewCourse {
  course_id: string
  title: string
  academic_year: number
  term_code: string
  professor_name?: string | null
  section: string | null
}

interface BlankState {
  [lectureId: string]: {
    [pageId: number]: {
      [blankIndex: number]: boolean // revealed 상태
    }
  }
}

interface ReviewStore {
  // 빈칸 상태: lectureId -> pageId -> blankIndex -> revealed
  blankStatesByLocale: Record<AppLocale, BlankState>
  
  // 빈칸 데이터: lectureId -> pageId -> blanks 배열
  blankDataByLocale: Record<AppLocale, {
    [lectureId: string]: {
      [pageId: number]: {
        blanks: Array<{
          answer_text: string
          review_answer_id?: string | null
        }>
      }
    }
  }>

  // locale별 캐시
  coursesByLocale: Partial<Record<AppLocale, ReviewCourse[]>>
  lectureListByLocale: Partial<Record<AppLocale, Record<string, LectureListResponse>>>
  reviewCarouselByLocale: Partial<Record<AppLocale, Record<string, ReviewCarouselResponse>>>
  
  // Actions
  preloadBlanks: (lectureId: string, pages: ReviewCarouselResponse['pages_2_6'], locale: AppLocale) => void
  setBlankRevealed: (lectureId: string, pageId: number, blankIndex: number, revealed: boolean, locale: AppLocale) => void
  isBlankRevealed: (lectureId: string, pageId: number, blankIndex: number, locale: AppLocale) => boolean
  getBlankData: (lectureId: string, pageId: number, blankIndex: number, locale: AppLocale) => {
    answer_text: string
    review_answer_id?: string | null
  } | null
  clearLectureData: (lectureId: string, locale: AppLocale) => void

  setCoursesCache: (locale: AppLocale, courses: ReviewCourse[]) => void
  setLectureListCache: (locale: AppLocale, courseId: string, data: LectureListResponse) => void
  setReviewCarouselCache: (locale: AppLocale, lectureId: string, data: ReviewCarouselResponse) => void
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  blankStatesByLocale: { ko: {}, en: {} },
  blankDataByLocale: { ko: {}, en: {} },
  coursesByLocale: {},
  lectureListByLocale: {},
  reviewCarouselByLocale: {},
  
  /**
   * 복습 콘텐츠 로딩 시 모든 빈칸 데이터를 미리 저장
   */
  preloadBlanks: (lectureId, pages, locale) => {
    const blankData: Record<string, {
      [pageId: number]: {
        blanks: Array<{
          answer_text: string
          review_answer_id?: string | null
        }>
      }
    }> = {}
    const blankStates: BlankState = {}
    
    pages.forEach((page) => {
      const pageId = page.page_number
      const blanks = page.answer.blanks || []
      
      blankData[lectureId] = blankData[lectureId] || {}
      blankData[lectureId][pageId] = {
        blanks: blanks.map((blank) => ({
          answer_text: blank.answer_text,
          review_answer_id: page.answer.review_answer_id,
        })),
      }
      
      blankStates[lectureId] = blankStates[lectureId] || {}
      blankStates[lectureId][pageId] = {}
      
      // 모든 빈칸을 초기 상태(false)로 설정
      blanks.forEach((_, index) => {
        blankStates[lectureId][pageId][index] = false
      })
    })
    
    set((state) => ({
      blankDataByLocale: {
        ...state.blankDataByLocale,
        [locale]: {
          ...state.blankDataByLocale[locale],
          ...blankData,
        },
      },
      blankStatesByLocale: {
        ...state.blankStatesByLocale,
        [locale]: {
          ...state.blankStatesByLocale[locale],
          ...blankStates,
        },
      },
    }))
  },
  
  /**
   * 특정 빈칸의 revealed 상태 설정
   */
  setBlankRevealed: (lectureId, pageId, blankIndex, revealed, locale) => {
    set((state) => {
      const newStates = { ...state.blankStatesByLocale[locale] }
      if (!newStates[lectureId]) {
        newStates[lectureId] = {}
      }
      if (!newStates[lectureId][pageId]) {
        newStates[lectureId][pageId] = {}
      }
      newStates[lectureId][pageId][blankIndex] = revealed
      
      return {
        blankStatesByLocale: {
          ...state.blankStatesByLocale,
          [locale]: newStates,
        },
      }
    })
  },
  
  /**
   * 특정 빈칸의 revealed 상태 확인
   */
  isBlankRevealed: (lectureId, pageId, blankIndex, locale) => {
    const state = get()
    return state.blankStatesByLocale[locale]?.[lectureId]?.[pageId]?.[blankIndex] ?? false
  },
  
  /**
   * 특정 빈칸의 데이터 가져오기
   */
  getBlankData: (lectureId, pageId, blankIndex, locale) => {
    const state = get()
    return state.blankDataByLocale[locale]?.[lectureId]?.[pageId]?.blanks[blankIndex] ?? null
  },
  
  /**
   * 특정 강의의 데이터 초기화 (강의 변경 시)
   */
  clearLectureData: (lectureId, locale) => {
    set((state) => {
      const newStates = { ...state.blankStatesByLocale[locale] }
      const newData = { ...state.blankDataByLocale[locale] }
      delete newStates[lectureId]
      delete newData[lectureId]
      
      return {
        blankStatesByLocale: {
          ...state.blankStatesByLocale,
          [locale]: newStates,
        },
        blankDataByLocale: {
          ...state.blankDataByLocale,
          [locale]: newData,
        },
      }
    })
  },

  setCoursesCache: (locale, courses) => {
    set((state) => ({
      coursesByLocale: {
        ...state.coursesByLocale,
        [locale]: courses,
      },
    }))
  },

  setLectureListCache: (locale, courseId, data) => {
    set((state) => ({
      lectureListByLocale: {
        ...state.lectureListByLocale,
        [locale]: {
          ...(state.lectureListByLocale[locale] || {}),
          [courseId]: data,
        },
      },
    }))
  },

  setReviewCarouselCache: (locale, lectureId, data) => {
    set((state) => ({
      reviewCarouselByLocale: {
        ...state.reviewCarouselByLocale,
        [locale]: {
          ...(state.reviewCarouselByLocale[locale] || {}),
          [lectureId]: data,
        },
      },
    }))
  },
}))

