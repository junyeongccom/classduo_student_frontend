import { useState, useEffect } from 'react'
import { 
  GameProgress, 
  FlameCount, 
  ClaimedRewards,
  loadGameProgress,
  loadFlameCount,
  loadClaimedRewards,
  getGameProgressKey,
  getFlameCountKey,
  getClaimedRewardsKey,
  getCurrentUserId,
  claimReward as claimRewardLogic,
  incrementFlameCount as incrementFlameCountLogic
} from '@/shared/lib/gameLogic'

export function useGameStatus() {
  const [gameProgress, setGameProgress] = useState<GameProgress>({})
  const [flameCount, setFlameCount] = useState<FlameCount>({})
  const [claimedRewards, setClaimedRewards] = useState<ClaimedRewards>({})
  
  const refreshStatus = () => {
    setGameProgress(loadGameProgress())
    setFlameCount(loadFlameCount())
    setClaimedRewards(loadClaimedRewards())
  }

  useEffect(() => {
    refreshStatus()
    
    // storage 이벤트 리스너 (다른 탭에서 변경 시 동기화)
    const handleStorage = (e: StorageEvent) => {
      const userId = getCurrentUserId()
      const progressKey = getGameProgressKey(userId)
      const flameKey = getFlameCountKey(userId)
      const claimedKey = getClaimedRewardsKey(userId)
      
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
    
    // 주기적으로 진행도 확인
    const interval = setInterval(refreshStatus, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorage)
      clearInterval(interval)
    }
  }, [])

  const claimReward = (lectureId: string, courseId: string) => {
    claimRewardLogic(lectureId)
    setClaimedRewards(prev => ({ ...prev, [lectureId]: true }))
    
    incrementFlameCountLogic(courseId)
    // UI 업데이트는 refreshStatus나 useEffect에서 처리되지만, 즉각적인 반응을 위해 여기서도 업데이트 가능
    // 하지만 localStorage가 업데이트되었으므로 interval이나 storage 이벤트로 반영될 것임.
    // 다만 interval이 1초라 딜레이가 있을 수 있으니 수동으로 상태 업데이트 하는게 좋음.
    setFlameCount(loadFlameCount()) 
  }

  return {
    gameProgress,
    flameCount,
    claimedRewards,
    claimReward,
    refreshStatus
  }
}

