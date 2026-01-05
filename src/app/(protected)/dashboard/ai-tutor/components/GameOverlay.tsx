/**
 * 게임 UI 오버레이 컴포넌트 (gooey 효과)
 */
'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { X, RotateCcw, LogOut } from 'lucide-react'
import { incrementGameProgress, isQuestionSolved } from './LectureSidebar'

// 게임 페이즈 상태
type GamePhase = 'idle' | 'playing' | 'quiz' | 'walking_to_door' | 'passing_through' | 'stumbling' | 'returning_to_center' | 'cleared'

// 퀴즈 질문 데이터 타입
interface QuizQuestion {
  question: string
  correctAnswer: 'O' | 'X'
  explanation: string
}

// 20개의 하드코딩된 퀴즈 질문 (회차별로 5개씩 사용)
const ALL_QUIZ_QUESTIONS: QuizQuestion[] = [
  // 1회차 질문 (0-4)
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
  },
  // 2회차 질문 (5-9)
  {
    question: '미토콘드리아는 세포 호흡을 통해 ATP를 생성하는 세포 소기관이다.',
    correctAnswer: 'O',
    explanation: '미토콘드리아는 세포의 발전소로 불리며 에너지를 생산합니다.'
  },
  {
    question: '단백질은 아미노산이 아닌 포도당이 연결되어 만들어진다.',
    correctAnswer: 'X',
    explanation: '단백질은 아미노산이 펩타이드 결합으로 연결된 고분자입니다.'
  },
  {
    question: '뉴런(신경세포)은 축삭돌기를 통해 신호를 전달한다.',
    correctAnswer: 'O',
    explanation: '축삭돌기는 신경 자극을 다른 세포로 전달하는 역할을 합니다.'
  },
  {
    question: '리보솜은 유전 정보를 저장하는 역할을 담당한다.',
    correctAnswer: 'X',
    explanation: '리보솜은 단백질 합성을 담당하며, 유전 정보는 핵(DNA)에 저장됩니다.'
  },
  {
    question: '효소는 화학 반응의 속도를 높이는 생체 촉매이다.',
    correctAnswer: 'O',
    explanation: '효소는 활성화 에너지를 낮춰 반응 속도를 크게 증가시킵니다.'
  },
  // 3회차 질문 (10-14)
  {
    question: '멘델의 분리의 법칙에 따르면 대립유전자는 감수분열 시 분리된다.',
    correctAnswer: 'O',
    explanation: '감수분열 과정에서 대립유전자 쌍이 분리되어 각각 다른 생식세포로 들어갑니다.'
  },
  {
    question: '세포 분열 시 염색체 수가 절반으로 줄어드는 것은 체세포 분열이다.',
    correctAnswer: 'X',
    explanation: '염색체 수가 절반으로 줄어드는 것은 감수분열이며, 체세포 분열은 염색체 수가 유지됩니다.'
  },
  {
    question: '소장의 융털은 표면적을 넓혀 영양소 흡수 효율을 높인다.',
    correctAnswer: 'O',
    explanation: '융털 구조는 소장의 표면적을 약 600배까지 증가시켜 흡수 효율을 높입니다.'
  },
  {
    question: '백혈구는 산소를 운반하고 적혈구는 면역 기능을 담당한다.',
    correctAnswer: 'X',
    explanation: '적혈구가 산소를 운반하고, 백혈구가 면역 기능을 담당합니다.'
  },
  {
    question: '호르몬은 내분비선에서 분비되어 혈액을 통해 표적 기관으로 이동한다.',
    correctAnswer: 'O',
    explanation: '호르몬은 혈류를 타고 이동하여 특정 수용체가 있는 표적 기관에서 작용합니다.'
  },
  // 4회차 이상 질문 (15-19) - 4, 5, 6... 회차 모두 동일
  {
    question: 'RNA는 DNA와 달리 단일 가닥 구조이며 우라실(U)을 포함한다.',
    correctAnswer: 'O',
    explanation: 'RNA는 단일 가닥이며, DNA의 티민(T) 대신 우라실(U)을 가집니다.'
  },
  {
    question: '광합성의 명반응은 엽록체의 스트로마에서 일어난다.',
    correctAnswer: 'X',
    explanation: '명반응은 틸라코이드 막에서 일어나며, 스트로마에서는 암반응(캘빈 회로)이 일어납니다.'
  },
  {
    question: '해당과정은 미토콘드리아에서 일어나는 세포 호흡의 첫 단계이다.',
    correctAnswer: 'X',
    explanation: '해당과정은 세포질에서 일어나며, 미토콘드리아에서는 TCA 회로와 전자전달계가 진행됩니다.'
  },
  {
    question: '생태계에서 분해자는 죽은 생물의 유기물을 무기물로 분해한다.',
    correctAnswer: 'O',
    explanation: '분해자(세균, 곰팡이 등)는 유기물을 무기물로 분해하여 물질 순환에 기여합니다.'
  },
  {
    question: '항체는 B림프구가 아닌 T림프구에서 생성된다.',
    correctAnswer: 'X',
    explanation: '항체는 B림프구가 분화한 형질세포에서 생성됩니다. T림프구는 세포성 면역을 담당합니다.'
  }
]

// 회차별로 퀴즈 질문을 가져오는 함수
const getQuizQuestionsForRound = (lectureNo?: number): QuizQuestion[] => {
  const roundNumber = lectureNo ?? 1
  
  // 1회차: 0-4, 2회차: 5-9, 3회차: 10-14, 4회차 이상: 15-19
  let startIndex: number
  if (roundNumber <= 1) {
    startIndex = 0
  } else if (roundNumber === 2) {
    startIndex = 5
  } else if (roundNumber === 3) {
    startIndex = 10
  } else {
    // 4회차 이상은 모두 마지막 5개 (15-19)
    startIndex = 15
  }
  
  return ALL_QUIZ_QUESTIONS.slice(startIndex, startIndex + 5)
}

interface GameOverlayProps {
  isOpen: boolean
  onClose: () => void
  triggerPosition: { top: number; left: number; width: number; height: number } | null
  lectureId?: string // 게임 진행도를 저장할 회차 ID
  courseId?: string // 불꽃 개수를 저장할 강의 ID
  lectureNo?: number // 회차 번호 (퀴즈 질문 선택용)
}

export function GameOverlay({ isOpen, onClose, triggerPosition, lectureId, courseId, lectureNo }: GameOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting'>('entering')
  const [dimensions, setDimensions] = useState({ width: 1200, height: 675 })
  const [frameIndex, setFrameIndex] = useState(0) // 프레임 시퀀스 인덱스
  const [backgroundOffset, setBackgroundOffset] = useState(0) // 배경 스크롤 오프셋
  const [doors, setDoors] = useState<Array<{ id: number; top: number; triggered: boolean }>>([]) // 문 목록 (triggered: 퀴즈 트리거 여부)
  const doorIdRef = useRef(0) // 문 ID 생성용
  const frameSequence = [1, 2, 3, 2, 1, 2, 3, 2] // 1->2->3->2->1->2->3->2 반복
  const currentFrame = frameSequence[frameIndex]
  
  // 회차별 퀴즈 질문 가져오기 (lectureNo 기반)
  const quizQuestions = useMemo(() => getQuizQuestionsForRound(lectureNo), [lectureNo])
  // ref로도 관리 (클로저 문제 해결)
  const quizQuestionsRef = useRef(quizQuestions)
  quizQuestionsRef.current = quizQuestions
  
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
  const [quizAnswerCount, setQuizAnswerCount] = useState(0) // 이번 게임에서 선택한 횟수
  
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

  // 게임 초기화 함수
  const resetGameState = useCallback(() => {
    setQuizAnswerCount(0)
    setCurrentQuestionIndex(0)
    setBackgroundOffset(0)
    setDoors([])
    doorIdRef.current = 0
    setGamePhase('idle')
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
  }, [])

  // 게임 열릴 때 항상 초기화
  useEffect(() => {
    if (isOpen) {
      resetGameState()
    }
  }, [isOpen, resetGameState])

  // 닫기 핸들러
  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // 게임 시작 (START 화면에서 클릭)
  const handleStartGame = useCallback(() => {
    if (gamePhase === 'idle') {
      setGamePhase('playing')
    }
  }, [gamePhase])

  // 게임 다시하기
  const handleRestart = useCallback(() => {
    setQuizAnswerCount(0)
    setCurrentQuestionIndex(0)
    setBackgroundOffset(0)
    setDoors([])
    doorIdRef.current = 0
    setGamePhase('playing') // 다시하기는 바로 playing 상태로
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
  }, [])

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
    const BASE_SPEED = 4 // 기준 스크롤 속도 (2배속)
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
            const questionData = quizQuestionsRef.current[currentQuestionIndexRef.current]
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
            const correctAnswer = quizQuestionsRef.current[currentQuestionIndexRef.current]?.correctAnswer || 'O'
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
    const HORIZONTAL_SPEED = 6 * scaleFactor // 수평 이동 속도 (2배속)

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
                const questionData = quizQuestionsRef.current[currentIdx]
                if (questionData) {
                  setExplanationText(questionData.explanation)
                  setShowExplanation(true)
                  // 5초 후 해설 숨김
                  if (explanationTimerRef.current) {
                    clearTimeout(explanationTimerRef.current)
                  }
                  explanationTimerRef.current = setTimeout(() => {
                    setShowExplanation(false)
                    setExplanationText(null)
                  }, 5000)
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

  // 4초마다 문 생성
  useEffect(() => {
    if (!isOpen || animationState !== 'entered' || gamePhase !== 'playing') return

    const interval = setInterval(() => {
      const newDoorId = doorIdRef.current++
      setDoors((prevDoors) => [
        ...prevDoors,
        { id: newDoorId, top: -250 * scaleFactor, triggered: false }, // 화면 위에서 시작 (스케일 적용)
      ])
    }, 4000) // 4초마다

    return () => clearInterval(interval)
  }, [isOpen, animationState, scaleFactor, gamePhase])

  // 퀴즈 응답 핸들러
  const handleQuizAnswer = (answer: 'O' | 'X') => {
    // 현재 문제 인덱스
    const currentIdx = currentQuestionIndexRef.current
    
    // 진행도 증가 (같은 문제는 중복 증가 안됨, 회차당 최대 5번)
    if (lectureId) {
      // isQuestionSolved는 incrementGameProgress 내부에서 체크하므로
      // 여기서는 그냥 호출 (중복 방지는 LectureSidebar에서 처리)
      incrementGameProgress(lectureId, courseId, currentIdx)
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
                animation: 'fadeInOut 5s ease-in-out forwards',
              }}
            >
              <div 
                className="text-center font-bold text-white"
                style={{
                  fontSize: `${32 * scaleFactor}px`,
                  lineHeight: 1.6,
                  padding: `${16 * scaleFactor}px ${32 * scaleFactor}px`,
                  maxWidth: `${dimensions.width * 0.85}px`,
                  WebkitTextStroke: `${1.5 * scaleFactor}px rgba(0, 0, 0, 0.9)`,
                  paintOrder: 'stroke fill',
                  textShadow: `
                    0 0 ${8 * scaleFactor}px rgba(0, 0, 0, 0.7),
                    0 0 ${16 * scaleFactor}px rgba(0, 0, 0, 0.5),
                    0 0 ${24 * scaleFactor}px rgba(0, 0, 0, 0.3)
                  `,
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
