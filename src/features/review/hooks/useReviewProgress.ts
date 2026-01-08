import { incrementGameProgress } from '@/shared/lib/gameLogic'

// 현재 사용자 ID 가져오기
const getCurrentUserId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      return parsed?.state?.user?.user_id
    }
  } catch {
    // 무시
  }
  return undefined
}

// 복습 빈칸 진행도 localStorage 키 생성 함수 (사용자 ID 포함)
const getReviewBlankProgressKey = (userId?: string) => {
  return userId ? `classduo_review_blank_progress_${userId}` : 'classduo_review_blank_progress'
}

// 복습 빈칸 진행도 타입 (회차별 열어본 페이지 수)
interface ReviewBlankProgress {
  [lectureId: string]: {
    count: number // 열어본 페이지 수 (최대 5)
    revealedPages: number[] // 열어본 페이지 번호 목록 (2-6)
  }
}

// 복습 빈칸 진행도 로드
export const loadReviewBlankProgress = (): ReviewBlankProgress => {
  if (typeof window === 'undefined') return {}
  try {
    const userId = getCurrentUserId()
    const key = getReviewBlankProgressKey(userId)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 페이지 빈칸 열기 시 진행도 증가 (처음 열 때만, 최대 5번까지)
export const tryIncrementPageProgress = (lectureId: string, pageNumber: number, courseId?: string): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const progress = loadReviewBlankProgress()
    
    // 해당 lecture의 진행도 가져오기
    if (!progress[lectureId]) {
      progress[lectureId] = { count: 0, revealedPages: [] }
    }
    
    // 이미 열어본 페이지인지 확인
    if (progress[lectureId].revealedPages.includes(pageNumber)) {
      return false // 이미 열어봤으면 진행도 증가 안함
    }
    
    // 최대 5개까지만 진행도 증가
    if (progress[lectureId].count >= 5) {
      return false // 이미 5개 열었으면 진행도 증가 안함
    }
    
    // 페이지 열기 기록
    const userId = getCurrentUserId()
    const key = getReviewBlankProgressKey(userId)
    progress[lectureId].revealedPages.push(pageNumber)
    progress[lectureId].count += 1
    localStorage.setItem(key, JSON.stringify(progress))
    
    // 게임 진행도 증가 (페이지 2-6 → 인덱스 5-9로 변환)
    // 복습 빈칸은 인덱스 5-9 사용 (게임 퀴즈는 0-4 사용)
    // 이렇게 하면 게임과 복습이 별개로 각각 5개씩 진행도가 쌓임 (총 10)
    const questionIndex = pageNumber - 2 + 5 // 페이지 2 → 인덱스 5, 페이지 6 → 인덱스 9
    incrementGameProgress(lectureId, courseId, questionIndex)
    
    return true
  } catch {
    console.error('Failed to increment page progress')
    return false
  }
}

