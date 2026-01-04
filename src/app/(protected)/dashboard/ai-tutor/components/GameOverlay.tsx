/**
 * 게임 UI 오버레이 컴포넌트 (gooey 효과)
 */
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { X, RotateCcw, LogOut } from 'lucide-react'
import { incrementGameProgress } from './LectureSidebar'

// 게임 상태를 localStorage에 저장하기 위한 키
const GAME_STATE_KEY_PREFIX = 'game-state-'

// 저장할 게임 상태 타입
interface SavedGameState {
  quizAnswerCount: number
  currentQuestionIndex: number
  gamePhase: GamePhase
  isPaused: boolean
  backgroundOffset: number
  doors: Array<{ id: number; top: number; triggered: boolean }>
  doorIdCounter: number
}

// 게임 페이즈 상태
type GamePhase = 'idle' | 'playing' | 'quiz' | 'walking_to_door' | 'passing_through' | 'stumbling' | 'returning_to_center' | 'cleared'

// 퀴즈 질문 데이터 타입
interface QuizQuestion {
  question: string
  correctAnswer: 'O' | 'X'
  explanation: string
}

// 5개의 하드코딩된 퀴즈 질문
const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: '동물 세포는 식물 세포와 마찬가지로 세포벽이 있어 형태가 단단하게 유지된다.',
    correctAnswer: 'X',
    explanation: '동물 세포는 세포벽이 없고 세포막만 있습니다.'
  },
  {
    question: '우리 몸의 적혈구는 산소를 운반하는 역할을 담당한다.',
    correctAnswer: 'O',
    explanation: '헤모글로빈을 통해 온몸에 산소를 공급합니다.'
  },
  {
    question: '식물이 광합성을 할 때 기공을 통해 흡수하는 기체는 산소이다.',
    correctAnswer: 'X',
    explanation: '광합성 시에는 이산화탄소를 흡수하고 산소를 내뱉습니다.'
  },
  {
    question: '유전 정보를 담고 있는 DNA는 이중 나선 구조로 되어 있다.',
    correctAnswer: 'O',
    explanation: '두 가닥의 사슬이 꼬여 있는 형태입니다.'
  },
  {
    question: '사람의 심장은 2심방 2심실 구조로 이루어져 있다.',
    correctAnswer: 'O',
    explanation: '포유류와 조류는 효율적인 순환을 위해 2심방 2심실 구조를 가집니다.'
  }
]

interface GameOverlayProps {
  isOpen: boolean
  onClose: () => void
  triggerPosition: { top: number; left: number; width: number; height: number } | null
  lectureId?: string // 게임 진행도를 저장할 회차 ID
  courseId?: string // 불꽃 개수를 저장할 강의 ID
}

// 게임 상태 저장
function saveGameState(lectureId: string, state: SavedGameState) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GAME_STATE_KEY_PREFIX + lectureId, JSON.stringify(state))
  }
}

// 게임 상태 로드
function loadGameState(lectureId: string): SavedGameState | null {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(GAME_STATE_KEY_PREFIX + lectureId)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return null
      }
    }
  }
  return null
}

// 게임 상태 삭제
function clearGameState(lectureId: string) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(GAME_STATE_KEY_PREFIX + lectureId)
  }
}

export function GameOverlay({ isOpen, onClose, triggerPosition, lectureId, courseId }: GameOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting'>('entering')
  const [dimensions, setDimensions] = useState({ width: 1200, height: 675 })
  const [frameIndex, setFrameIndex] = useState(0) // 프레임 시퀀스 인덱스
  const [backgroundOffset, setBackgroundOffset] = useState(0) // 배경 스크롤 오프셋
  const [doors, setDoors] = useState<Array<{ id: number; top: number; triggered: boolean }>>([]) // 문 목록 (triggered: 퀴즈 트리거 여부)
  const doorIdRef = useRef(0) // 문 ID 생성용
  const frameSequence = [1, 2, 3, 2, 1, 2, 3, 2] // 1->2->3->2->1->2->3->2 반복
  const currentFrame = frameSequence[frameIndex]
  
  // 퀴즈 상태
  const [isPaused, setIsPaused] = useState(false) // 게임 일시정지 상태
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null) // 현재 질문
  const [activeDoorId, setActiveDoorId] = useState<number | null>(null) // 현재 퀴즈 문 ID
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0) // 현재 질문 인덱스 (0~4)
  
  // 해설 표시 상태
  const [showExplanation, setShowExplanation] = useState(false)
  const [explanationText, setExplanationText] = useState<string | null>(null)
  const explanationTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // currentQuestionIndex를 ref로도 관리 (클로저 문제 해결)
  const currentQuestionIndexRef = useRef(currentQuestionIndex)
  currentQuestionIndexRef.current = currentQuestionIndex
  
  // 게임 페이즈 상태 (문 통과 연출용)
  const [gamePhase, setGamePhase] = useState<GamePhase>('idle') // 초기 상태는 idle
  const [selectedAnswer, setSelectedAnswer] = useState<'O' | 'X' | null>(null) // 선택한 답
  const [horizontalOffset, setHorizontalOffset] = useState(0) // 수평 이동 오프셋 (배경/길/문이 이동)
  const [stumbleStepCount, setStumbleStepCount] = useState(0) // stumbling 단계에서 걸음 수 카운트
  const [hasStumbled, setHasStumbled] = useState(false) // stumbling 완료 여부
  const [stumbleVerticalOffset, setStumbleVerticalOffset] = useState(0) // stumbling 중 수직 오프셋 (뒤로 튕김 효과)
  const [hasReversedDirection, setHasReversedDirection] = useState(false) // 반대쪽 문으로 전환 여부
  const [quizAnswerCount, setQuizAnswerCount] = useState(0) // 이번 게임에서 선택한 횟수 (최대 5번까지 진행도 증가)
  
  // 이전 isOpen 상태 추적용 ref
  const prevIsOpenRef = useRef(false)
  const hasLoadedRef = useRef(false) // 현재 세션에서 로드 완료 여부
  
  // 기준 해상도 (모든 크기는 이 해상도 기준으로 설계)
  const REFERENCE_WIDTH = 1200
  const REFERENCE_HEIGHT = 675
  
  // 스케일 팩터 계산 (화면 크기에 따라 모든 요소를 동일한 비율로 확대/축소)
  const scaleFactor = dimensions.width / REFERENCE_WIDTH
  
  // 문 위치까지의 수평 이동 거리 (화면 너비의 10%)
  const DOOR_OFFSET_TARGET = dimensions.width * 0.10

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 16:9 비율 계산 (최대 너비 80vw, 높이는 자동 계산)
      const maxWidth = window.innerWidth * 0.8
      const width = Math.min(maxWidth, 1200)
      const height = (width * 9) / 16
      setDimensions({ width, height })
    }
  }, [])

  // 게임 상태 저장 함수 (ref로 최신 상태 접근)
  const saveCurrentStateRef = useRef<() => void>(() => {})
  saveCurrentStateRef.current = () => {
    if (lectureId) {
      const stateToSave: SavedGameState = {
        quizAnswerCount,
        currentQuestionIndex,
        gamePhase: gamePhase === 'playing' ? 'idle' : gamePhase, // playing 상태면 idle로 저장 (재시작시 START 화면 표시)
        isPaused,
        backgroundOffset,
        doors,
        doorIdCounter: doorIdRef.current
      }
      saveGameState(lectureId, stateToSave)
    }
  }

  // isOpen 상태 변화 감지 및 저장/로드 처리
  useEffect(() => {
    const wasOpen = prevIsOpenRef.current
    prevIsOpenRef.current = isOpen
    
    // 닫힐 때: 상태 저장
    if (wasOpen && !isOpen) {
      saveCurrentStateRef.current()
      hasLoadedRef.current = false // 다음에 열릴 때 다시 로드할 수 있도록
    }
    
    // 열릴 때: 상태 로드
    if (!wasOpen && isOpen && lectureId && !hasLoadedRef.current) {
      hasLoadedRef.current = true
      const savedState = loadGameState(lectureId)
      if (savedState) {
        // 저장된 상태 복원
        const savedQuestionIndex = savedState.currentQuestionIndex || 0
        setQuizAnswerCount(savedState.quizAnswerCount)
        setCurrentQuestionIndex(savedQuestionIndex)
        setBackgroundOffset(savedState.backgroundOffset)
        // 이전에 triggered된 문들은 제외하고 복원 (문제가 이미 지나간 문은 제외)
        setDoors(savedState.doors.filter(door => !door.triggered))
        doorIdRef.current = savedState.doorIdCounter
        
        // 5번째 문제까지 풀었으면 (인덱스가 5 이상) cleared 상태 유지
        if (savedQuestionIndex >= 5 || savedState.gamePhase === 'cleared') {
          setGamePhase('cleared')
        } else {
          // 그 외의 경우 idle로 시작 (일시정지 상태에서 복귀)
          setGamePhase('idle')
        }
      } else {
        // 저장된 상태가 없으면 초기 상태
        setGamePhase('idle')
        setQuizAnswerCount(0)
        setCurrentQuestionIndex(0)
        setBackgroundOffset(0)
        setDoors([])
        doorIdRef.current = 0
      }
    }
  }, [isOpen, lectureId])

  // 게임 상태 저장 (명시적 닫기 핸들러용)
  const saveCurrentState = useCallback(() => {
    saveCurrentStateRef.current()
  }, [])

  // 닫기 핸들러 (상태 저장 후 닫기)
  const handleClose = useCallback(() => {
    saveCurrentState()
    onClose()
  }, [saveCurrentState, onClose])

  // 게임 시작 (START 화면에서 클릭)
  const handleStartGame = useCallback(() => {
    if (gamePhase === 'idle') {
      setGamePhase('playing')
    }
  }, [gamePhase])

  // 게임 다시하기
  const handleRestart = useCallback(() => {
    if (lectureId) {
      clearGameState(lectureId)
    }
    setQuizAnswerCount(0)
    setCurrentQuestionIndex(0)
    setBackgroundOffset(0)
    setDoors([])
    doorIdRef.current = 0
    setGamePhase('playing')
    setIsPaused(false)
    setCurrentQuestion(null)
    setActiveDoorId(null)
    setSelectedAnswer(null)
    setHorizontalOffset(0)
    setHasStumbled(false)
    setHasReversedDirection(false)
    setStumbleVerticalOffset(0)
    setShowExplanation(false)
    setExplanationText(null)
    if (explanationTimerRef.current) {
      clearTimeout(explanationTimerRef.current)
    }
  }, [lectureId])

  // 스프라이트 애니메이션 (1->2->3->2->1->2->3->2 반복)
  // idle, quiz, cleared 상태에서는 정지, 나머지 페이즈에서는 계속 애니메이션
  useEffect(() => {
    if (!isOpen || animationState !== 'entered') return
    if (gamePhase === 'quiz' || gamePhase === 'idle' || gamePhase === 'cleared') return

    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % frameSequence.length)
    }, 150) // 150ms마다 프레임 변경 (빠른 애니메이션)

    return () => clearInterval(interval)
  }, [isOpen, animationState, gamePhase])

  // 배경 스크롤 애니메이션 (위에서 아래로 내려오는 느낌)
  // playing, passing_through 페이즈에서만 수직 스크롤
  useEffect(() => {
    if (!isOpen || animationState !== 'entered') return
    if (gamePhase !== 'playing' && gamePhase !== 'passing_through') return

    let animationFrameId: number
    let lastTime = 0
    const BASE_SPEED = 2 // 기준 스크롤 속도
    const speed = BASE_SPEED * scaleFactor // 스케일에 비례한 스크롤 속도
    const doorHeight = 250 * scaleFactor
    const screenMiddle = dimensions.height / 2

    function animate(currentTime: number) {
      if (lastTime === 0) {
        lastTime = currentTime
      }
      
      const deltaTime = currentTime - lastTime
      lastTime = currentTime

      setBackgroundOffset((prev) => prev + speed)

      // 문들도 함께 아래로 이동
      setDoors((prevDoors) => {
        let shouldPause = false
        let pauseDoorId: number | null = null

        const updatedDoors = prevDoors
          .map((door) => {
            const newTop = door.top + speed
            const doorMiddle = newTop + doorHeight / 2

            // playing 페이즈에서만 퀴즈 트리거
            if (gamePhase === 'playing' && !door.triggered && doorMiddle >= screenMiddle && doorMiddle < screenMiddle + speed * 2) {
              shouldPause = true
              pauseDoorId = door.id
              return { ...door, top: newTop, triggered: true }
            }
            return { ...door, top: newTop }
          })
          .filter((door) => door.top < dimensions.height + doorHeight) // 화면 밖으로 나간 문 제거 (스케일 적용)

        // 퀴즈 트리거
        if (shouldPause && pauseDoorId !== null) {
          setTimeout(() => {
            // 현재 질문 인덱스에 해당하는 질문 표시 (ref 사용으로 최신 값 보장)
            const questionData = QUIZ_QUESTIONS[currentQuestionIndexRef.current]
            if (questionData) {
              setIsPaused(true)
              setGamePhase('quiz')
              setCurrentQuestion(questionData.question)
              setActiveDoorId(pauseDoorId)
            }
          }, 0)
        }

        // passing_through 페이즈에서 문이 캐릭터에 도달하면 처리
        if (gamePhase === 'passing_through' && activeDoorId !== null) {
          const activeDoor = updatedDoors.find(d => d.id === activeDoorId)
          const characterCenterY = dimensions.height - 20 * scaleFactor - 75 * scaleFactor
          
          if (activeDoor) {
            const doorCenterY = activeDoor.top + doorHeight / 2
            
            // 정답을 맞췄거나 반대쪽 문으로 전환한 경우: 문이 화면 밖으로 나가면 returning_to_center
            // 현재 질문의 정답과 비교 (ref 사용으로 최신 값 보장)
            const correctAnswer = QUIZ_QUESTIONS[currentQuestionIndexRef.current]?.correctAnswer || 'O'
            if (selectedAnswer === correctAnswer || hasReversedDirection) {
              if (activeDoor.top > dimensions.height - 50 * scaleFactor) {
                setTimeout(() => {
                  setGamePhase('returning_to_center')
                }, 0)
              }
            } else {
              // 오답인 경우: 문이 캐릭터 위치에 도달하기 전 (z-index 변경 전) stumbling 페이즈로 전환
              // hasStumbled 체크로 중복 트리거 방지
              if (!hasStumbled && doorCenterY >= characterCenterY - speed * 30 && doorCenterY < characterCenterY - speed * 20) {
                setTimeout(() => {
                  setGamePhase('stumbling')
                  setStumbleStepCount(0)
                  setHasStumbled(true)
                }, 0)
              }
            }
          }
        }

        return updatedDoors
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isOpen, animationState, dimensions.height, scaleFactor, gamePhase, activeDoorId, selectedAnswer, hasStumbled, hasReversedDirection, currentQuestionIndex])

  // stumbling 페이즈 처리 (오답시 뒤로 튕겨나가는 애니메이션)
  useEffect(() => {
    if (!isOpen || animationState !== 'entered' || gamePhase !== 'stumbling') return

    let animationFrameId: number
    let startTime: number | null = null
    
    const BOUNCE_BACK_DISTANCE = 80 * scaleFactor // 뒤로 밀려나는 거리
    const BOUNCE_DURATION = 400 // 튕겨나가는 시간 (ms)
    const PAUSE_DURATION = 200 // 튕긴 후 잠시 멈춤 (ms)
    const TOTAL_DURATION = BOUNCE_DURATION + PAUSE_DURATION

    function animate(currentTime: number) {
      if (startTime === null) {
        startTime = currentTime
      }
      
      const elapsed = currentTime - startTime
      
      if (elapsed < BOUNCE_DURATION) {
        // 뒤로 튕겨나가는 애니메이션 (easeOut)
        const progress = elapsed / BOUNCE_DURATION
        const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
        const offset = -BOUNCE_BACK_DISTANCE * eased // 음수 = 문이 위로 (캐릭터가 뒤로 밀려남)
        setStumbleVerticalOffset(offset)
      } else if (elapsed < TOTAL_DURATION) {
        // 튕긴 위치에서 잠시 멈춤
        setStumbleVerticalOffset(-BOUNCE_BACK_DISTANCE)
      } else {
        // stumbling 완료 → 문의 실제 위치와 배경 오프셋을 튕겨난 위치로 업데이트
        setDoors((prevDoors) => prevDoors.map((door) => {
          if (door.id === activeDoorId) {
            return { ...door, top: door.top + (-BOUNCE_BACK_DISTANCE) }
          }
          return door
        }))
        // 배경도 튕겨난 위치로 업데이트 (순간이동 방지)
        setBackgroundOffset((prev) => prev + (-BOUNCE_BACK_DISTANCE))
        setStumbleVerticalOffset(0)
        setGamePhase('returning_to_center')
        return
      }
      
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isOpen, animationState, gamePhase, scaleFactor, activeDoorId])

  // 수평 이동 애니메이션 (walking_to_door, returning_to_center 페이즈)
  useEffect(() => {
    if (!isOpen || animationState !== 'entered') return
    if (gamePhase !== 'walking_to_door' && gamePhase !== 'returning_to_center') return

    let animationFrameId: number
    const HORIZONTAL_SPEED = 3 * scaleFactor // 수평 이동 속도

    function animate() {
      if (gamePhase === 'walking_to_door') {
        // 문쪽으로 이동 (O: 오른쪽으로 이동해서 왼쪽 문에 도달, X: 왼쪽으로 이동해서 오른쪽 문에 도달)
        const targetOffset = selectedAnswer === 'O' ? DOOR_OFFSET_TARGET : -DOOR_OFFSET_TARGET
        
        setHorizontalOffset((prev) => {
          const diff = targetOffset - prev
          if (Math.abs(diff) < HORIZONTAL_SPEED) {
            // 목표 도달 → passing_through 페이즈로 전환
            setTimeout(() => setGamePhase('passing_through'), 0)
            return targetOffset
          }
          return prev + (diff > 0 ? HORIZONTAL_SPEED : -HORIZONTAL_SPEED)
        })
        // 배경은 멈춤 (문과 함께 정지)
      } else if (gamePhase === 'returning_to_center') {
        // 중앙으로 복귀
        setHorizontalOffset((prev) => {
          if (Math.abs(prev) < HORIZONTAL_SPEED) {
            // 중앙 도달
            setTimeout(() => {
              // 오답으로 stumbling 했고 아직 반대 방향으로 안 갔으면 → 반대쪽 문으로
              if (hasStumbled && !hasReversedDirection) {
                const oppositeAnswer = selectedAnswer === 'O' ? 'X' : 'O'
                setSelectedAnswer(oppositeAnswer)
                setHasReversedDirection(true)
                setGamePhase('walking_to_door')
              } else {
                // 정상 완료 → 해설 표시 및 5번 문제 완료 체크 (ref 사용으로 최신 값 보장)
                const currentIdx = currentQuestionIndexRef.current
                const questionData = QUIZ_QUESTIONS[currentIdx]
                if (questionData) {
                  setExplanationText(questionData.explanation)
                  setShowExplanation(true)
                  // 8초 후 해설 숨김
                  if (explanationTimerRef.current) {
                    clearTimeout(explanationTimerRef.current)
                  }
                  explanationTimerRef.current = setTimeout(() => {
                    setShowExplanation(false)
                    setExplanationText(null)
                  }, 8000)
                }
                
                // 질문 인덱스 증가
                const nextQuestionIndex = currentIdx + 1
                setCurrentQuestionIndex(nextQuestionIndex)
                
                // 5번째 문제(인덱스 4)를 풀었으면 cleared (다음 인덱스가 5가 됨)
                if (nextQuestionIndex >= 5) {
                  setGamePhase('cleared')
                } else {
                  setGamePhase('playing')
                }
                setSelectedAnswer(null)
                setActiveDoorId(null)
                setHasStumbled(false)
                setHasReversedDirection(false)
              }
            }, 0)
            return 0
          }
          return prev > 0 ? prev - HORIZONTAL_SPEED : prev + HORIZONTAL_SPEED
        })
        // 배경은 멈춤 (문과 함께 정지)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isOpen, animationState, gamePhase, selectedAnswer, scaleFactor, DOOR_OFFSET_TARGET, hasStumbled, hasReversedDirection])

  // 10초마다 문 생성
  useEffect(() => {
    if (!isOpen || animationState !== 'entered' || gamePhase !== 'playing') return

    const interval = setInterval(() => {
      const newDoorId = doorIdRef.current++
      setDoors((prevDoors) => [
        ...prevDoors,
        { id: newDoorId, top: -250 * scaleFactor, triggered: false }, // 화면 위에서 시작 (스케일 적용)
      ])
    }, 10000) // 10초마다

    return () => clearInterval(interval)
  }, [isOpen, animationState, scaleFactor, gamePhase])

  // 퀴즈 응답 핸들러
  const handleQuizAnswer = (answer: 'O' | 'X') => {
    // 진행도 증가 (최대 5번까지, 정답과 무관하게 선택할 때마다)
    if (lectureId && quizAnswerCount < 5) {
      incrementGameProgress(lectureId, courseId)
      setQuizAnswerCount(prev => prev + 1)
    }
    
    // 선택하면 해당 문쪽으로 걸어가기 시작
    setIsPaused(false)
    setCurrentQuestion(null)
    setSelectedAnswer(answer)
    setGamePhase('walking_to_door')
    // activeDoorId는 유지 (문 통과 후 제거)
  }

  useEffect(() => {
    if (isOpen) {
      setAnimationState('entering')
      // gooey 효과를 위한 애니메이션 시작
      setTimeout(() => {
        setAnimationState('entered')
      }, 100)
    } else {
      setAnimationState('exiting')
    }
  }, [isOpen])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (explanationTimerRef.current) {
        clearTimeout(explanationTimerRef.current)
      }
    }
  }, [])

  if (!isOpen && animationState === 'exiting') {
    return null
  }

  // 초기 위치 계산 (트리거 위치에서 시작)
  const getInitialTransform = () => {
    if (!triggerPosition || typeof window === 'undefined') {
      return 'translate(-50%, -50%) scale(0)'
    }
    const scale = triggerPosition.width / dimensions.width
    const x = triggerPosition.left + triggerPosition.width / 2 - window.innerWidth / 2
    const y = triggerPosition.top + triggerPosition.height / 2 - window.innerHeight / 2
    return `translate(${x}px, ${y}px) scale(${scale})`
  }

  const getFinalTransform = () => {
    return 'translate(-50%, -50%) scale(1)'
  }

  return (
    <>
      {/* 해설 페이드 애니메이션 스타일 */}
      <style jsx>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
          5% { opacity: 1; transform: translateX(-50%) translateY(0); }
          90% { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        }
      `}</style>

      {/* 배경 오버레이 */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-500 ${
          animationState === 'entered' ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* 게임 UI 컨테이너 */}
      <div
        ref={overlayRef}
        className="fixed z-50 rounded-2xl bg-white shadow-2xl overflow-hidden game-overlay-container"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          left: '50%',
          top: '50%',
          transform: animationState === 'entered' ? getFinalTransform() : getInitialTransform(),
          transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.6s ease-out',
          opacity: animationState === 'entered' ? 1 : 0,
        }}
        onClick={(e) => {
          e.stopPropagation()
          // idle 상태에서 클릭하면 게임 시작
          if (gamePhase === 'idle') {
            handleStartGame()
          }
        }}
      >
        {/* Gooey 효과 배경 */}
        <div className="absolute inset-0 game-gooey-bg" />

        {/* 닫기 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleClose()
          }}
          className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-white/90 backdrop-blur-sm hover:bg-white transition-colors shadow-lg"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* 게임 화면 */}
        <div className="relative z-10 h-full overflow-hidden bg-gradient-to-b from-green-500 via-green-600 to-green-700">
          
          {/* 레이어 1: 배경 (road.png 이미지 - 길 + 풀밭, 위에서 아래로 스크롤) */}
          <div 
            className="absolute"
            style={{
              top: 0,
              left: '-50%',
              width: '200%',
              height: '100%',
              transform: `translateX(${horizontalOffset}px)`,
              transition: gamePhase === 'stumbling' ? 'none' : (gamePhase === 'walking_to_door' || gamePhase === 'returning_to_center' ? 'none' : 'transform 0.1s ease-out'),
              zIndex: 1,
              backgroundImage: 'url(/road.png)',
              backgroundRepeat: 'repeat',
              backgroundSize: `${dimensions.width * 1.5}px auto`,
              backgroundPosition: `center ${backgroundOffset + stumbleVerticalOffset}px`,
              imageRendering: 'pixelated',
            }}
          />

          {/* 레이어 2: 캐릭터 (항상 배경 위에, 중앙 고정) */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2" 
            style={{ 
              marginBottom: `${20 * scaleFactor}px`,
              zIndex: 5,
            }}
          >
            <img
              src={`/run_${currentFrame}.png`}
              alt={`Run frame ${currentFrame}`}
              className="w-auto object-contain"
              style={{
                height: `${150 * scaleFactor}px`, // 기준 캐릭터 높이 150px
                imageRendering: 'pixelated', // 픽셀 아트 스타일 유지
              }}
            />
          </div>

          {/* 레이어 3: 문들 (각 문의 Y 위치에 따라 캐릭터 위/아래 결정) */}
          {/* 캐릭터 중앙 Y = dimensions.height - marginBottom - characterHeight/2 */}
          {(() => {
            const characterCenterY = dimensions.height - 20 * scaleFactor - 75 * scaleFactor
            const doorHeight = 250 * scaleFactor
            
            return doors.map((door) => {
              // 문의 중앙 Y 위치
              const doorCenterY = door.top + doorHeight / 2
              // 문의 중앙이 캐릭터 중앙보다 아래에 있으면 문이 캐릭터 앞에 (더 가까움)
              const isDoorInFront = doorCenterY >= characterCenterY
              
              // stumbling 중일 때 활성 문에만 수직 오프셋 적용 (뒤로 튕김 효과)
              const isActiveDoor = door.id === activeDoorId
              const verticalBounce = (gamePhase === 'stumbling' && isActiveDoor) ? stumbleVerticalOffset : 0
              
              // 퀴즈 중일 때만 클릭 가능
              const isClickable = isPaused && isActiveDoor && currentQuestion
              
              return (
                <div 
                  key={door.id} 
                  className="absolute"
                  style={{ 
                    top: `${door.top + verticalBounce}px`, 
                    left: '0',
                    width: '100%', 
                    height: `${doorHeight}px`,
                    transform: `translateX(${horizontalOffset}px)`,
                    transition: gamePhase === 'stumbling' ? 'none' : (gamePhase === 'walking_to_door' || gamePhase === 'returning_to_center' ? 'none' : 'transform 0.1s ease-out'),
                    zIndex: isClickable ? 35 : (isDoorInFront ? 10 : 3),
                    pointerEvents: isClickable ? 'auto' : 'none',
                  }}
                >
                  {/* 좌측 O 문 - 길의 왼쪽 절반 (30% ~ 50%) */}
                  <div 
                    className="absolute"
                    style={{ 
                      left: '30%', 
                      width: '20%', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (isClickable) {
                        handleQuizAnswer('O')
                      }
                    }}
                  >
                    <img
                      src="/o_door.png"
                      alt="O Door"
                      className="w-auto object-contain"
                      style={{
                        height: `${doorHeight}px`,
                        imageRendering: 'pixelated',
                        maxWidth: '100%',
                      }}
                    />
                  </div>
                  {/* 우측 X 문 - 길의 오른쪽 절반 (50% ~ 70%) */}
                  <div 
                    className="absolute"
                    style={{ 
                      left: '50%', 
                      width: '20%', 
                      height: '100%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (isClickable) {
                        handleQuizAnswer('X')
                      }
                    }}
                  >
                    <img
                      src="/x_door.png"
                      alt="X Door"
                      className="w-auto object-contain"
                      style={{
                        height: `${doorHeight}px`,
                        imageRendering: 'pixelated',
                        maxWidth: '100%',
                      }}
                    />
                  </div>
                </div>
              )
            })
          })()}

          {/* 퀴즈 오버레이 */}
          {isPaused && currentQuestion && (
            <>
              {/* 어두운 배경 - 전체 */}
              <div 
                className="absolute inset-0 bg-black/60 transition-opacity duration-300"
                style={{ zIndex: 30 }}
              />
              
              {/* 질문 텍스트 (흰색, 팝업 상자 없이) */}
              <div 
                className="absolute z-40 flex items-center justify-center"
                style={{
                  top: `${dimensions.height * 0.15}px`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  pointerEvents: 'none',
                }}
              >
                <div 
                  className="text-center font-bold text-white drop-shadow-lg"
                  style={{
                    fontSize: `${28 * scaleFactor}px`,
                    lineHeight: 1.4,
                    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  }}
                >
                  {currentQuestion}
                </div>
              </div>
            </>
          )}

          {/* 해설 표시 오버레이 (달리면서 표시) */}
          {showExplanation && explanationText && (
            <div 
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                top: `${dimensions.height * 0.2}px`,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 40,
                animation: 'fadeInOut 8s ease-in-out forwards',
              }}
            >
              <div 
                className="text-center font-bold text-white px-6 py-3"
                style={{
                  fontSize: `${24 * scaleFactor}px`,
                  lineHeight: 1.5,
                  textShadow: `
                    -2px -2px 0 rgba(0,0,0,0.8),
                    2px -2px 0 rgba(0,0,0,0.8),
                    -2px 2px 0 rgba(0,0,0,0.8),
                    2px 2px 0 rgba(0,0,0,0.8),
                    0 0 10px rgba(0,0,0,0.9),
                    0 0 20px rgba(0,0,0,0.7)
                  `,
                  maxWidth: `${dimensions.width * 0.8}px`,
                }}
              >
                {explanationText}
              </div>
            </div>
          )}

          {/* START 오버레이 (idle 상태) */}
          {gamePhase === 'idle' && (
            <div 
              className="absolute inset-0 bg-black/70 flex items-center justify-center cursor-pointer transition-opacity duration-300"
              style={{ zIndex: 50 }}
            >
              <div className="text-center">
                <div 
                  className="text-white font-bold tracking-widest animate-pulse"
                  style={{
                    fontSize: `${72 * scaleFactor}px`,
                    textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
                  }}
                >
                  START
                </div>
                <div 
                  className="text-white/70 mt-4"
                  style={{
                    fontSize: `${18 * scaleFactor}px`,
                  }}
                >
                  화면을 클릭하여 시작
                </div>
              </div>
            </div>
          )}

          {/* CLEAR 오버레이 (5번 완료) */}
          {gamePhase === 'cleared' && (
            <div 
              className="absolute inset-0 bg-black/70 flex items-center justify-center transition-opacity duration-300"
              style={{ zIndex: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div 
                  className="text-white font-bold tracking-widest"
                  style={{
                    fontSize: `${72 * scaleFactor}px`,
                    textShadow: '0 0 20px rgba(255,215,0,0.8), 0 0 40px rgba(255,215,0,0.5)',
                    color: '#FFD700',
                  }}
                >
                  CLEAR!
                </div>
                <div 
                  className="text-white/80 mt-2"
                  style={{
                    fontSize: `${20 * scaleFactor}px`,
                  }}
                >
                  모든 퀴즈를 완료했습니다!
                </div>
                
                {/* 버튼 영역 */}
                <div 
                  className="flex items-center justify-center gap-8 mt-8"
                >
                  {/* 다시하기 버튼 */}
                  <button
                    onClick={handleRestart}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    style={{
                      minWidth: `${100 * scaleFactor}px`,
                    }}
                  >
                    <RotateCcw 
                      className="text-white" 
                      style={{ 
                        width: `${36 * scaleFactor}px`, 
                        height: `${36 * scaleFactor}px` 
                      }} 
                    />
                    <span 
                      className="text-white font-medium"
                      style={{ fontSize: `${14 * scaleFactor}px` }}
                    >
                      다시하기
                    </span>
                  </button>

                  {/* 나가기 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClose()
                    }}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                    style={{
                      minWidth: `${100 * scaleFactor}px`,
                    }}
                  >
                    <LogOut 
                      className="text-white" 
                      style={{ 
                        width: `${36 * scaleFactor}px`, 
                        height: `${36 * scaleFactor}px` 
                      }} 
                    />
                    <span 
                      className="text-white font-medium"
                      style={{ fontSize: `${14 * scaleFactor}px` }}
                    >
                      나가기
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
