'use client'

import { useState, useEffect } from 'react'
import { 
  loadGameProgress, 
  loadFlameCount, 
  loadClaimedRewards,
  getStorageKeys,
  getCurrentUserId,
  GameProgress,
  FlameCount,
  ClaimedRewards
} from '@/shared/lib/gameLogic'

export function useGameProgress() {
  const [gameProgress, setGameProgress] = useState<GameProgress>({})
  const [flameCount, setFlameCount] = useState<FlameCount>({})
  const [claimedRewards, setClaimedRewards] = useState<ClaimedRewards>({})

  const refreshData = () => {
    setGameProgress(loadGameProgress())
    setFlameCount(loadFlameCount())
    setClaimedRewards(loadClaimedRewards())
  }

  useEffect(() => {
    refreshData()
    
    // storage 이벤트 리스너 (다른 탭에서 변경 시 동기화)
    const handleStorage = (e: StorageEvent) => {
      const userId = getCurrentUserId()
      const { progressKey, flameKey, claimedKey } = getStorageKeys(userId)
      
      if (e.key === progressKey || e.key?.startsWith('classduo_game_progress')) {
        setGameProgress(loadGameProgress())
      }
      if (e.key === flameKey || e.key?.startsWith('classduo_flame_count')) {
        setFlameCount(loadFlameCount())
      }
      if (e.key === claimedKey || e.key?.startsWith('classduo_claimed_rewards')) {
        setClaimedRewards(loadClaimedRewards())
      }
    }
    window.addEventListener('storage', handleStorage)
    
    // 주기적으로 진행도 확인 (같은 탭에서 GameOverlay가 업데이트할 때)
    const interval = setInterval(() => {
      refreshData()
    }, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  return {
    gameProgress,
    flameCount,
    claimedRewards,
    refreshData,
    setClaimedRewards, // for optimistic update
    setFlameCount, // for optimistic update
  }
}

