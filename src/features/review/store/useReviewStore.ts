/**
 * 복습 콘텐츠 상태 관리 Store
 * 빈칸의 revealed 상태를 미리 로드하여 즉시 표시 가능하도록 관리
 */
import { create } from 'zustand'
import type { ReviewCarouselResponse } from '../services/reviewService'

interface BlankState {
  [lectureId: string]: {
    [pageId: number]: {
      [blankIndex: number]: boolean // revealed 상태
    }
  }
}

interface ReviewStore {
  // 빈칸 상태: lectureId -> pageId -> blankIndex -> revealed
  blankStates: BlankState
  
  // 빈칸 데이터: lectureId -> pageId -> blanks 배열
  blankData: {
    [lectureId: string]: {
      [pageId: number]: {
        blanks: Array<{
          answer_text: string
          review_answer_id?: string | null
        }>
      }
    }
  }
  
  // Actions
  preloadBlanks: (lectureId: string, pages: ReviewCarouselResponse['pages_2_6']) => void
  setBlankRevealed: (lectureId: string, pageId: number, blankIndex: number, revealed: boolean) => void
  isBlankRevealed: (lectureId: string, pageId: number, blankIndex: number) => boolean
  getBlankData: (lectureId: string, pageId: number, blankIndex: number) => {
    answer_text: string
    review_answer_id?: string | null
  } | null
  clearLectureData: (lectureId: string) => void
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  blankStates: {},
  blankData: {},
  
  /**
   * 복습 콘텐츠 로딩 시 모든 빈칸 데이터를 미리 저장
   */
  preloadBlanks: (lectureId, pages) => {
    const blankData: ReviewStore['blankData'] = {}
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
      blankData: {
        ...state.blankData,
        ...blankData,
      },
      blankStates: {
        ...state.blankStates,
        ...blankStates,
      },
    }))
  },
  
  /**
   * 특정 빈칸의 revealed 상태 설정
   */
  setBlankRevealed: (lectureId, pageId, blankIndex, revealed) => {
    set((state) => {
      const newStates = { ...state.blankStates }
      if (!newStates[lectureId]) {
        newStates[lectureId] = {}
      }
      if (!newStates[lectureId][pageId]) {
        newStates[lectureId][pageId] = {}
      }
      newStates[lectureId][pageId][blankIndex] = revealed
      
      return {
        blankStates: newStates,
      }
    })
  },
  
  /**
   * 특정 빈칸의 revealed 상태 확인
   */
  isBlankRevealed: (lectureId, pageId, blankIndex) => {
    const state = get()
    return state.blankStates[lectureId]?.[pageId]?.[blankIndex] ?? false
  },
  
  /**
   * 특정 빈칸의 데이터 가져오기
   */
  getBlankData: (lectureId, pageId, blankIndex) => {
    const state = get()
    return state.blankData[lectureId]?.[pageId]?.blanks[blankIndex] ?? null
  },
  
  /**
   * 특정 강의의 데이터 초기화 (강의 변경 시)
   */
  clearLectureData: (lectureId) => {
    set((state) => {
      const newStates = { ...state.blankStates }
      const newData = { ...state.blankData }
      delete newStates[lectureId]
      delete newData[lectureId]
      
      return {
        blankStates: newStates,
        blankData: newData,
      }
    })
  },
}))

