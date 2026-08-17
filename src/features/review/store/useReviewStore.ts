/**
 * 복습 콘텐츠 상태 관리 Store
 * 복습 어휘 캐시와 Deck(단계별 반복) 상태를 관리
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LectureReviewListResponse } from '@/features/review/types'
import type { DeckLevel, DeckSession } from '@/features/review/domain/deck'

interface ReviewStore {
  // lecture_id별 사용자 복습어휘(lecture_review) 캐시
  lectureReviewItemsByLectureId: Record<string, LectureReviewListResponse>

  // Deck 상태: userId -> lectureId -> deck state
  deckByUserId: Record<
    string,
    Record<
      string,
      {
        levelsByItemId: Record<string, DeckLevel>
        session: DeckSession | null
      }
    >
  >
  
  // Actions
  setLectureReviewItemsCache: (lectureId: string, data: LectureReviewListResponse) => void

  // Deck actions
  ensureDeckState: (userId: string, lectureId: string) => void
  ensureDeckLevels: (userId: string, lectureId: string, itemIds: string[]) => void
  setDeckItemLevel: (userId: string, lectureId: string, itemId: string, level: DeckLevel) => void
  setDeckSession: (userId: string, lectureId: string, session: DeckSession | null) => void
  resetAllDeckLevels: (userId: string, lectureId: string, itemIds: string[]) => void
}

export const useReviewStore = create<ReviewStore>()(
  persist(
    (set) => ({
  lectureReviewItemsByLectureId: {},
      deckByUserId: {},
  
  setLectureReviewItemsCache: (lectureId, data) => {
    set((state) => ({
      lectureReviewItemsByLectureId: {
        ...state.lectureReviewItemsByLectureId,
        [lectureId]: data,
      },
    }))
  },

      ensureDeckState: (userId, lectureId) => {
        set((state) => {
          if (state.deckByUserId[userId]?.[lectureId]) return state
          return {
            deckByUserId: {
              ...state.deckByUserId,
              [userId]: {
                ...(state.deckByUserId[userId] || {}),
                [lectureId]: {
                  levelsByItemId: {},
                  session: null,
                },
              },
            },
          }
        })
      },

      ensureDeckLevels: (userId, lectureId, itemIds) => {
        set((state) => {
          const userDeck = state.deckByUserId[userId] || {}
          const lectureDeck = userDeck[lectureId] || { levelsByItemId: {}, session: null }
          const nextLevels = { ...lectureDeck.levelsByItemId }

          let changed = false
          for (const id of itemIds) {
            if (!nextLevels[id]) {
              nextLevels[id] = 2
              changed = true
            }
          }

          if (!changed && userDeck[lectureId]) return state

          return {
            deckByUserId: {
              ...state.deckByUserId,
              [userId]: {
                ...userDeck,
                [lectureId]: {
                  ...lectureDeck,
                  levelsByItemId: nextLevels,
                },
              },
            },
          }
        })
      },

      setDeckItemLevel: (userId, lectureId, itemId, level) => {
        set((state) => {
          const userDeck = state.deckByUserId[userId] || {}
          const lectureDeck = userDeck[lectureId] || { levelsByItemId: {}, session: null }
          return {
            deckByUserId: {
              ...state.deckByUserId,
              [userId]: {
                ...userDeck,
                [lectureId]: {
                  ...lectureDeck,
                  levelsByItemId: {
                    ...lectureDeck.levelsByItemId,
                    [itemId]: level,
                  },
                },
              },
            },
          }
        })
      },

      setDeckSession: (userId, lectureId, session) => {
        set((state) => {
          const userDeck = state.deckByUserId[userId] || {}
          const lectureDeck = userDeck[lectureId] || { levelsByItemId: {}, session: null }
          return {
            deckByUserId: {
              ...state.deckByUserId,
              [userId]: {
                ...userDeck,
                [lectureId]: {
                  ...lectureDeck,
                  session,
                },
              },
            },
          }
        })
      },

      resetAllDeckLevels: (userId, lectureId, itemIds) => {
        set((state) => {
          const userDeck = state.deckByUserId[userId] || {}
          const lectureDeck = userDeck[lectureId] || { levelsByItemId: {}, session: null }
          const nextLevels: Record<string, DeckLevel> = {}
          
          // 모든 아이템을 2단계로 설정
          for (const id of itemIds) {
            nextLevels[id] = 2
          }

          return {
            deckByUserId: {
              ...state.deckByUserId,
              [userId]: {
                ...userDeck,
                [lectureId]: {
                  ...lectureDeck,
                  levelsByItemId: nextLevels,
                  // 세션도 초기화
                  session: null,
                },
              },
            },
          }
        })
      },
    }),
    {
      name: 'review-storage',
      partialize: (state) => ({
        lectureReviewItemsByLectureId: state.lectureReviewItemsByLectureId,
        deckByUserId: state.deckByUserId,
      }),
    }
  )
)

