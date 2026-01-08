'use client'

// 게임 진행도 타입 (회차별 진행도 저장)
export interface GameProgress {
  [lectureId: string]: number // 0~10 진행도
}

// 회차별 푼 문제 목록 (중복 방지용)
export interface SolvedQuestions {
  [lectureId: string]: number[] // 푼 문제 인덱스 배열 (0~4: 게임, 5~9: 복습 빈칸)
}

// 불꽃 개수 타입 (강의별 불꽃 개수 저장)
export interface FlameCount {
  [courseId: string]: number
}

// 보상 수령 상태 타입
export interface ClaimedRewards {
  [lectureId: string]: boolean
}

// localStorage 키 생성 함수 (사용자 ID 포함)
export const getGameProgressKey = (userId?: string) => {
  return userId ? `classduo_game_progress_${userId}` : 'classduo_game_progress'
}

export const getSolvedQuestionsKey = (userId?: string) => {
  return userId ? `classduo_solved_questions_${userId}` : 'classduo_solved_questions'
}

export const getFlameCountKey = (userId?: string) => {
  return userId ? `classduo_flame_count_${userId}` : 'classduo_flame_count'
}

export const getClaimedRewardsKey = (userId?: string) => {
  return userId ? `classduo_claimed_rewards_${userId}` : 'classduo_claimed_rewards'
}

// 현재 사용자 ID 가져오기
export const getCurrentUserId = (): string | undefined => {
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

// 게임 진행도 로드
export const loadGameProgress = (): GameProgress => {
  if (typeof window === 'undefined') return {}
  try {
    const userId = getCurrentUserId()
    const key = getGameProgressKey(userId)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 푼 문제 목록 로드
export const loadSolvedQuestions = (): SolvedQuestions => {
  if (typeof window === 'undefined') return {}
  try {
    const userId = getCurrentUserId()
    const key = getSolvedQuestionsKey(userId)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 불꽃 개수 로드
export const loadFlameCount = (): FlameCount => {
  if (typeof window === 'undefined') return {}
  try {
    const userId = getCurrentUserId()
    const key = getFlameCountKey(userId)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 보상 수령 상태 로드
export const loadClaimedRewards = (): ClaimedRewards => {
  if (typeof window === 'undefined') return {}
  try {
    const userId = getCurrentUserId()
    const key = getClaimedRewardsKey(userId)
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

// 게임 진행도 저장 (외부에서 호출 가능하도록 export)
export const saveGameProgress = (lectureId: string, progress: number) => {
  if (typeof window === 'undefined') return
  try {
    const userId = getCurrentUserId()
    const key = getGameProgressKey(userId)
    const current = loadGameProgress()
    current[lectureId] = Math.min(10, Math.max(0, progress)) // 0~10 범위 제한
    localStorage.setItem(key, JSON.stringify(current))
  } catch {
    console.error('Failed to save game progress')
  }
}

// 문제가 이미 풀렸는지 확인 (외부에서 호출 가능하도록 export)
export const isQuestionSolved = (lectureId: string, questionIndex: number): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const solved = loadSolvedQuestions()
    return solved[lectureId]?.includes(questionIndex) || false
  } catch {
    return false
  }
}

// 불꽃 개수 증가
export const incrementFlameCount = (courseId: string): number => {
  if (typeof window === 'undefined') return 0
  try {
    const userId = getCurrentUserId()
    const key = getFlameCountKey(userId)
    const current = loadFlameCount()
    const newCount = (current[courseId] || 0) + 1
    current[courseId] = newCount
    localStorage.setItem(key, JSON.stringify(current))
    return newCount
  } catch {
    console.error('Failed to increment flame count')
    return 0
  }
}

// 보상 수령 처리
export const claimReward = (lectureId: string): boolean => {
  if (typeof window === 'undefined') return false
  try {
    const userId = getCurrentUserId()
    const key = getClaimedRewardsKey(userId)
    const current = loadClaimedRewards()
    current[lectureId] = true
    localStorage.setItem(key, JSON.stringify(current))
    return true
  } catch {
    console.error('Failed to claim reward')
    return false
  }
}

// 게임 진행도 증가 (외부에서 호출 가능하도록 export)
// 진행도가 10이 되면 보물상자가 활성화됨 (클릭하면 불꽃 획득)
// questionIndex: 푼 문제 인덱스 (0~4), 같은 문제는 중복 증가 안됨
export const incrementGameProgress = (lectureId: string, courseId?: string, questionIndex?: number): number => {
  if (typeof window === 'undefined') return 0
  try {
    const currentProgress = loadGameProgress()
    const currentSolved = loadSolvedQuestions()
    const lectureProgress = currentProgress[lectureId] || 0
    const lectureSolved = currentSolved[lectureId] || []
    
    // 이미 10이면 더 이상 증가하지 않음
    if (lectureProgress >= 10) return 10
    
    // 회차당 최대 10개까지만 증가 가능 (게임 5개 + 복습 빈칸 5개)
    if (lectureSolved.length >= 10) return lectureProgress
    
    // questionIndex가 제공된 경우, 이미 푼 문제인지 확인
    if (questionIndex !== undefined) {
      if (lectureSolved.includes(questionIndex)) {
        // 이미 푼 문제 - 진행도 증가 없음
        return lectureProgress
      }
      
      // 푼 문제 목록에 추가
      const userId = getCurrentUserId()
      const solvedKey = getSolvedQuestionsKey(userId)
      currentSolved[lectureId] = [...lectureSolved, questionIndex]
      localStorage.setItem(solvedKey, JSON.stringify(currentSolved))
    }
    
    const userId = getCurrentUserId()
    const progressKey = getGameProgressKey(userId)
    const newProgress = lectureProgress + 1
    currentProgress[lectureId] = newProgress
    localStorage.setItem(progressKey, JSON.stringify(currentProgress))
    
    // 진행도가 10이 되면 보물상자 활성화 (불꽃은 보물상자 클릭 시 획득)
    // 불꽃 획득은 LectureSidebar의 handleTreasureClick에서 처리
    
    return newProgress
  } catch {
    console.error('Failed to increment game progress')
    return 0
  }
}

export const getStorageKeys = (userId?: string) => ({
  progressKey: getGameProgressKey(userId),
  flameKey: getFlameCountKey(userId),
  claimedKey: getClaimedRewardsKey(userId)
})

