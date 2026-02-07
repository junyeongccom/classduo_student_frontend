'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ExamPrepLayout } from '../ui/ExamPrepLayout'
import { ExamPrepSummaryPanel } from '../ui/ExamPrepSummaryPanel'
import { ExamPrepGlossaryPanel } from '../ui/ExamPrepGlossaryPanel'
import { ExamPrepQuizPanel } from '../ui/ExamPrepQuizPanel'
import { ExamPrepAiTutorPanel } from '../ui/ExamPrepAiTutorPanel'
import { ExamPrepNotesPanel } from '../ui/ExamPrepNotesPanel'
import { ExamPrepPdfViewer } from '../ui/ExamPrepPdfViewer'
import { ExamPrepSelect } from '../ui/ExamPrepSelect'
import type { ExamPrepTab, ExamPrepMaterial, ExamPrepNoteScope, ExamPrepUserAnswer } from '../../types'
import {
  useExamPrepCourses,
  useExamPrepMaterials,
  useExamPrepSummary,
  useExamPrepGlossary,
  useExamPrepQuizSessions,
  useExamPrepQuizDetail,
  useExamPrepNotes,
} from '../../hooks'
import { examPrepService } from '../../services/examPrepService'
import { StudyspaceTopbarSlot } from '@/shared/components/layouts/studyspace'
import { gradeQuizAnswer } from '../../domain/gradeQuiz'

const DEFAULT_LEFT_WIDTH = 620
const MIN_LEFT_WIDTH = 400
const MIN_RIGHT_WIDTH = 340
const SIDEBAR_WIDTH = 140
const RESIZER_WIDTH = 1

export function ExamPrepContainer() {
  const t = useTranslations('examPrep')
  const locale = useLocale()
  const language = locale === 'en' ? 'en' : 'ko'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [activeTab, setActiveTab] = useState<ExamPrepTab>('summary')
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [hasUserResized, setHasUserResized] = useState(false)
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false)
  const [isPdfSlideshow, setIsPdfSlideshow] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeTab === 'notes' || activeTab === 'aiTutor') {
      setActiveTab('summary')
    }
  }, [activeTab])

  const { courses, isLoading: coursesLoading, error: coursesError, refresh: refreshCourses } = useExamPrepCourses()
  
  // URL에서 초기값 읽기
  const initialCourseId = searchParams.get('courseId')
  const initialMaterialId = searchParams.get('materialId')
  
  const [selectedCourseId, setSelectedCourseIdState] = useState<string | null>(initialCourseId)
  const { materials: materialsList, isLoading: materialsLoading, refresh: refreshMaterials } = useExamPrepMaterials(selectedCourseId)
  const materials = useMemo<ExamPrepMaterial[]>(() => materialsList, [materialsList])
  const [selectedMaterialId, setSelectedMaterialIdState] = useState<string | null>(initialMaterialId)
  
  // URL 파라미터 업데이트 함수
  const updateUrlParams = useCallback((courseId: string | null, materialId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (courseId) {
      params.set('courseId', courseId)
    } else {
      params.delete('courseId')
    }
    if (materialId) {
      params.set('materialId', materialId)
    } else {
      params.delete('materialId')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [pathname, router, searchParams])
  
  // 수업 선택 핸들러
  const setSelectedCourseId = useCallback((courseId: string | null) => {
    setSelectedCourseIdState(courseId)
    updateUrlParams(courseId, null) // 수업 변경 시 자료 초기화
    setSelectedMaterialIdState(null)
  }, [updateUrlParams])
  
  // 자료 선택 핸들러
  const setSelectedMaterialId = useCallback((materialId: string | null) => {
    setSelectedMaterialIdState(materialId)
    updateUrlParams(selectedCourseId, materialId)
  }, [selectedCourseId, updateUrlParams])
  const selectedMaterial = useMemo(
    () => materials.find(material => material.id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId]
  )
  const isPdfLoading = !!selectedMaterialId && (materialsLoading || !selectedMaterial?.signedUrl)
  const pdfLoadingContent = (
    <div className="flex flex-1 items-center justify-center px-6 py-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <video
          className="w-full max-w-[240px] rounded-lg shadow-sm"
          src="/TEST.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="space-y-1 text-sm text-gray-600">
          <p className="font-medium text-gray-700">자료를 준비하고 있어요</p>
          <p className="text-xs text-gray-500">잠시만 기다리면 PDF가 열립니다.</p>
        </div>
      </div>
    </div>
  )
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [selectedPdfPage, setSelectedPdfPage] = useState(1)
  const [selectedNotePage, setSelectedNotePage] = useState(1)
  const { summary, isLoading: summaryLoading } = useExamPrepSummary(selectedMaterialId, language)
  const { terms, isLoading: glossaryLoading } = useExamPrepGlossary(selectedMaterialId, language)
  const {
    sessions,
    isLoading: sessionsLoading,
    refresh: refreshSessions,
    refreshSilently: refreshSessionsSilently,
  } = useExamPrepQuizSessions(selectedMaterialId)
  const hasPendingQuizSessions = useMemo(() => sessions.some(session => session.status === 'CREATING'), [sessions])
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [onlyWrong, setOnlyWrong] = useState(false)
  const {
    quizzes,
    isLoading: quizzesLoading,
    refreshSilently: refreshQuizzesSilently,
  } = useExamPrepQuizDetail(selectedSessionId, onlyWrong)
  const [optimisticAnswersByQuizId, setOptimisticAnswersByQuizId] = useState<Record<string, ExamPrepUserAnswer>>({})
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
  const [isSessionViewOpen, setIsSessionViewOpen] = useState(false)
  const {
    noteMode,
    notes,
    annotations,
    setNoteMode,
    saveNote,
    saveAnnotation,
  } = useExamPrepNotes(selectedMaterialId)
  const pdfAnnotations = useMemo(() => {
    const mapped: Record<number, { paths: Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }> }> = {}
    Object.entries(annotations).forEach(([page, entry]) => {
      mapped[Number(page)] = (entry.data as { paths: Array<{ points: Array<{ x: number; y: number }>; color: string; width: number }> }) ?? {
        paths: [],
      }
    })
    return mapped
  }, [annotations])
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [chatReferences, setChatReferences] = useState<Array<{
    type: string
    source_id: string
    content: string
    metadata?: Record<string, unknown>
    citations?: Array<{ start: number; end: number; text: string }>
  }>>([])
  const [isChatLoading, setIsChatLoading] = useState(false)

  // URL에서 복원된 courseId가 유효한지 확인
  useEffect(() => {
    if (!coursesLoading && courses.length > 0 && initialCourseId) {
      const isValidCourse = courses.some(c => c.id === initialCourseId)
      if (!isValidCourse) {
        setSelectedCourseIdState(null)
        updateUrlParams(null, null)
      }
    }
  }, [courses, coursesLoading, initialCourseId, updateUrlParams])
  
  // URL에서 복원된 materialId가 유효한지 확인
  useEffect(() => {
    if (!materialsLoading && materials.length > 0 && initialMaterialId && selectedCourseId) {
      const isValidMaterial = materials.some(m => m.id === initialMaterialId)
      if (!isValidMaterial) {
        setSelectedMaterialIdState(null)
        updateUrlParams(selectedCourseId, null)
      }
    }
  }, [materials, materialsLoading, initialMaterialId, selectedCourseId, updateUrlParams])

  // locale 변경 시 강좌와 학습자료 목록 다시 불러오기
  useEffect(() => {
    refreshCourses()
    if (selectedCourseId) {
      refreshMaterials()
    }
  }, [locale, refreshCourses, refreshMaterials, selectedCourseId])

  // quiz 탭에서만: 퀴즈 생성(백그라운드) 완료 전까지 세션 목록을 폴링해서 즉시 활성화되게 한다.
  // isCreatingQuiz가 true이거나 hasPendingQuizSessions가 true일 때 폴링
  useEffect(() => {
    if (activeTab !== 'quiz') return
    if (!selectedMaterialId) return
    if (!hasPendingQuizSessions && !isCreatingQuiz) return

    const intervalId = window.setInterval(() => {
      void refreshSessionsSilently()
    }, 2000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeTab, hasPendingQuizSessions, isCreatingQuiz, refreshSessionsSilently, selectedMaterialId])

  useLayoutEffect(() => {
    if (!containerRef.current) return
    const element = containerRef.current
    const getHalfWidth = (containerWidth: number) => {
      const maxLeftWidth = containerWidth - MIN_RIGHT_WIDTH
      const target = Math.floor((containerWidth - RESIZER_WIDTH) / 2)
      return Math.min(Math.max(target, MIN_LEFT_WIDTH), maxLeftWidth)
    }
    const updateWidth = () => {
      if (hasUserResized) return
      const containerRect = element.getBoundingClientRect()
      if (!containerRect.width) return
      setLeftWidth(getHalfWidth(containerRect.width))
    }
    updateWidth()
    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasUserResized])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    setSelectedSessionId(null)
    setOptimisticAnswersByQuizId({})
    setCurrentQuizIndex(0)
    setIsSessionViewOpen(false)
    setOnlyWrong(false)
    // 강의자료 변경 시 요약 탭으로 이동
    if (selectedMaterialId) {
      setActiveTab('summary')
    }
  }, [selectedMaterialId])

  useEffect(() => {
    if (noteMode === 'page') {
      setSelectedNotePage(prev => (prev > 0 ? prev : 1))
    }
  }, [noteMode])

  useEffect(() => {
    if (pdfPageCount > 0) {
      setSelectedNotePage(prev => (prev >= 1 && prev <= pdfPageCount ? prev : 1))
      setSelectedPdfPage(prev => (prev >= 1 && prev <= pdfPageCount ? prev : 1))
    }
  }, [pdfPageCount])

  useEffect(() => {
    // 강의자료가 선택되어 있고, 세션이 있고, 세션 뷰가 열려있지 않을 때만 첫 번째 세션 자동 선택
    if (selectedMaterialId && sessions.length > 0 && !selectedSessionId && !isSessionViewOpen) {
      setSelectedSessionId(sessions[0]?.session_id ?? null)
    }
  }, [sessions, selectedSessionId, selectedMaterialId, isSessionViewOpen])
  useEffect(() => {
    setOptimisticAnswersByQuizId({})
    setCurrentQuizIndex(0)
  }, [selectedSessionId, onlyWrong])
  
  // selectedSessionId가 없으면 세션 뷰는 닫힌 상태로 유지한다.
  // (세션 뷰를 여는 행위는 세션 클릭/세션 생성/다시 풀기 등 명시적 액션에서만 수행)
  useEffect(() => {
    if (!selectedSessionId) {
      setIsSessionViewOpen(false)
    }
  }, [selectedSessionId])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const nextLeftWidth = event.clientX - containerRect.left
      const maxLeftWidth = containerRect.width - MIN_RIGHT_WIDTH
      const safeLeftWidth = Math.min(Math.max(nextLeftWidth, MIN_LEFT_WIDTH), maxLeftWidth)

      if (window.innerWidth - SIDEBAR_WIDTH - safeLeftWidth < MIN_RIGHT_WIDTH) {
        return
      }

      setLeftWidth(safeLeftWidth)
    }

    const handleMouseUp = () => setIsResizing(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const maxLeftWidth = containerRect.width - MIN_RIGHT_WIDTH
      setLeftWidth(prev => Math.min(Math.max(prev, MIN_LEFT_WIDTH), maxLeftWidth))
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    setHasUserResized(true)
    setIsResizing(true)
  }

  const handleOpenPdfFullscreen = () => {
    if (!selectedMaterial?.signedUrl) return
    setIsPdfFullscreen(true)
    document.body.style.overflow = 'hidden'
  }

  const handleClosePdfFullscreen = () => {
    setIsPdfFullscreen(false)
    setIsPdfSlideshow(false)
    document.body.style.overflow = ''
  }

  useEffect(() => {
    if (!isPdfFullscreen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClosePdfFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPdfFullscreen])

  const handleCreateSession = async () => {
    if (!selectedMaterialId) return
    setIsCreatingQuiz(true)
    const result = await examPrepService.createQuizSession(selectedMaterialId, {
      language,
    })
    setIsCreatingQuiz(false)
    if (result.data?.session_id) {
      await refreshSessions()
      // 퀴즈 목록에 남아있도록 세션 뷰를 열지 않음
      // 사용자가 직접 세션을 클릭해서 들어가도록 함
    }
  }

  const handleRenameSession = async (sessionId: string, title: string) => {
    const result = await examPrepService.renameQuizSession(sessionId, { title })
    if (result.data && !result.error) {
      await refreshSessionsSilently()
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    const result = await examPrepService.deleteQuizSession(sessionId)
    if (result.error) return

    const remaining = sessions.filter(session => session.session_id !== sessionId)
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(remaining[0]?.session_id ?? null)
      setIsSessionViewOpen(false)
      setCurrentQuizIndex(0)
    }
    await refreshSessionsSilently()
    await refreshQuizzesSilently()
  }

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setCurrentQuizIndex(0)
    setOnlyWrong(false)
    setIsSessionViewOpen(true)
  }

  const handleCloseSessionView = () => {
    setIsSessionViewOpen(false)
    setCurrentQuizIndex(0)
  }

  const handlePrevQuiz = () => {
    setCurrentQuizIndex(prev => Math.max(0, prev - 1))
  }

  const handleNextQuiz = () => {
    setCurrentQuizIndex(prev => Math.min(quizzes.length - 1, prev + 1))
  }

  const handleGoToFirstQuiz = () => {
    setCurrentQuizIndex(0)
  }

  const handleStartReview = () => {
    if (sessions.length === 0) return
    
    // 현재 선택된 세션이 있으면 그 세션 사용, 없으면 첫 번째 세션 사용
    const targetSessionId = selectedSessionId || sessions[0]?.session_id
    if (!targetSessionId) return
    
    // onlyWrong을 true로 설정하여 틀린 문제만 보기
    setOnlyWrong(true)
    // 세션 선택 및 뷰 열기
    setSelectedSessionId(targetSessionId)
    setCurrentQuizIndex(0)
    setIsSessionViewOpen(true)
  }

  const handleSelectMaterial = (materialId: string | null) => {
    // 강의자료 변경 시 항상 요약 탭부터 노출
    setActiveTab('summary')
    setSelectedMaterialId(materialId)
  }

  const handleTabChange = (nextTab: ExamPrepTab) => {
    setActiveTab(nextTab)
    // 어떤 탭에서든 quiz 탭 클릭 시 항상 퀴즈 메인(세션 뷰 닫힘)으로 이동
    if (nextTab === 'quiz') {
      setIsSessionViewOpen(false)
      setOnlyWrong(false)
      setCurrentQuizIndex(0)
    }
  }

  const handleSubmitAnswer = async (quizId: string, answerText: string | null, choiceOrder: number | null) => {
    if (!selectedSessionId) return
    const quiz = quizzes.find(item => item.quiz_id === quizId) ?? null
    if (quiz) {
      const graded = gradeQuizAnswer(quiz, answerText, choiceOrder)
      if (graded) {
        setOptimisticAnswersByQuizId(prev => ({ ...prev, [quizId]: graded }))
      }
    }

    // 요구사항: 답 제출 후 로딩으로 UI를 막지 않는다. 서버 제출은 백그라운드로만 수행.
    examPrepService
      .submitQuizAnswer(selectedSessionId, {
        quiz_id: quizId,
        answer_text: answerText,
        choice_order: choiceOrder,
      })
      .then(() => {
        // 서버 데이터 동기화(정답률 집계/오답 필터)를 위해 백그라운드 갱신만 수행
        setTimeout(() => {
          void refreshQuizzesSilently()
          void refreshSessionsSilently()
        }, 600)
      })
      .catch(() => {
        // ignore: UI는 optimistic 상태 유지
      })
  }

  const handleSendChat = async () => {
    if (!selectedMaterialId || !chatInput.trim()) return
    const nextMessages = [...chatMessages, { role: 'user' as const, content: chatInput }]
    setChatMessages(nextMessages)
    setChatInput('')
    setIsChatLoading(true)
    const result = await examPrepService.aiTutorChat({
      question: nextMessages[nextMessages.length - 1].content,
      lecture_ids: [],
      material_ids: [selectedMaterialId],
      material_top_k: 3,
      chat_history: nextMessages,
      session_id: null,
    })
    setIsChatLoading(false)
    if (result.data) {
      setChatMessages(result.data.chat_history as Array<{ role: 'user' | 'assistant'; content: string }>)
      setChatReferences(result.data.references ?? [])
    }
  }

  const handleResetChat = () => {
    const confirmed = window.confirm('새 채팅을 시작하면 현재 대화가 초기화됩니다. 계속할까요?')
    if (!confirmed) return
    setChatMessages([])
    setChatReferences([])
    setChatInput('')
  }

  const renderContent = () => {
    if (!selectedMaterialId) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-gray-400">
          자료를 선택해주세요.
        </div>
      )
    }

    if (activeTab === 'summary') {
      return (
        <ExamPrepSummaryPanel
          summary={summary}
          isLoading={summaryLoading}
          emptyText={t('summary.empty')}
          loadingMessage={t('summary.loading')}
          summaryTitle={t('summary.title')}
          recentIssuesTitle={t('summary.recentIssuesTitle')}
          examPointsTitle={t('summary.examPointsTitle')}
          sourceButtonLabel={t('summary.sourceButton')}
          formatSourceTooltip={pages => t('summary.sourceTooltip', { pages: pages.join(', ') })}
          sourceEmptyTooltip={t('summary.sourceEmptyTooltip')}
          onJumpToSlide={pageNumber => {
            setSelectedPdfPage(pageNumber)
            if (noteMode === 'page') {
              setSelectedNotePage(pageNumber)
            }
          }}
        />
      )
    }

    if (activeTab === 'memorize') {
      return (
        <ExamPrepGlossaryPanel
          terms={terms}
          isLoading={glossaryLoading}
          emptyText="암기 데이터가 없습니다."
          loadingMessage="KUI가 핵심 용어를 정리하고 있어요..."
        />
      )
    }

    if (activeTab === 'quiz') {
      const displayQuizzes = quizzes.map(quiz => {
        const optimistic = optimisticAnswersByQuizId[quiz.quiz_id]
        return optimistic ? { ...quiz, user_answer: optimistic } : quiz
      })
      const currentQuiz = displayQuizzes.length > 0 && currentQuizIndex >= 0 && currentQuizIndex < displayQuizzes.length
        ? displayQuizzes[currentQuizIndex]
        : null
      return (
        <ExamPrepQuizPanel
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={handleSelectSession}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
          onCreateSession={handleCreateSession}
          isCreating={isCreatingQuiz}
          quizzes={displayQuizzes}
          isSessionViewOpen={isSessionViewOpen}
          currentIndex={currentQuizIndex}
          totalCount={displayQuizzes.length}
          currentQuiz={currentQuiz}
          onCloseSessionView={handleCloseSessionView}
          onPrevQuiz={handlePrevQuiz}
          onNextQuiz={handleNextQuiz}
          onGoToFirstQuiz={handleGoToFirstQuiz}
          isLoading={sessionsLoading || quizzesLoading}
          onlyWrong={onlyWrong}
          onToggleWrong={() => setOnlyWrong(prev => !prev)}
          onSubmitAnswer={handleSubmitAnswer}
          loadingMessage="KUI가 퀴즈를 만들고 있어요..."
          emptyText="퀴즈를 생성하거나 세션을 선택해주세요."
          onStartReview={handleStartReview}
          isReviewMode={onlyWrong}
        />
      )
    }

    if (activeTab === 'notes') {
      const isSingle = noteMode === 'single'
      const entry = isSingle ? notes.single : notes.pages[selectedNotePage]
      const content = (entry?.content?.blocks as unknown as any[]) ?? null
      const pageNumber = isSingle ? 0 : selectedNotePage

      return (
        <ExamPrepNotesPanel
          mode={noteMode as ExamPrepNoteScope}
          onModeChange={setNoteMode}
          pageCount={pdfPageCount}
          selectedPage={selectedNotePage}
          onSelectPage={page => {
            setSelectedNotePage(page)
            setSelectedPdfPage(page)
          }}
          noteContent={content}
          onChange={updated => saveNote(noteMode, pageNumber, { blocks: updated })}
        />
      )
    }

    return (
      <ExamPrepAiTutorPanel
        messages={chatMessages}
        references={chatReferences}
        input={chatInput}
        isLoading={isChatLoading}
        onInputChange={setChatInput}
        onSend={handleSendChat}
        onReset={handleResetChat}
        emptyText="AI 조교에게 질문을 남겨보세요."
        loadingMessage="KUI가 자료에서 답을 찾고 있어요..."
      />
    )
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="px-6 pt-6">
        <div className="relative w-full pb-4 -mt-2 pt-10">
          <div
            className="absolute"
            style={{
              left: 'var(--exam-course-left, 0px)',
              top: 'var(--exam-course-top, 0px)',
            }}
          >
            <div className="w-[220px]">
              <ExamPrepSelect
                value={selectedCourseId}
                placeholder={t('materials.courseSelectPlaceholder')}
                options={courses.map(course => ({
                  value: course.id,
                  label: `${course.title}${course.professorName ? `(${course.professorName})` : ''}`,
                }))}
                onChange={value => setSelectedCourseId(value)}
                isLoading={coursesLoading}
                errorLabel={coursesError ?? undefined}
                emptyLabel="강의가 없습니다"
              />
            </div>
          </div>
          <div
            className="absolute"
            style={{
              left: 'var(--exam-material-left, 260px)',
              top: 'var(--exam-material-top, 0px)',
            }}
          >
            <div className="w-[280px]">
              <ExamPrepSelect
                value={selectedMaterialId}
                placeholder={t('materials.materialSelectPlaceholder')}
                options={materials.map(material => ({
                  value: material.id,
                  label: material.title,
                }))}
                onChange={value => setSelectedMaterialId(value)}
                isLoading={materialsLoading}
                emptyLabel={selectedCourseId ? '자료가 없습니다' : '수업을 먼저 선택하세요'}
              />
            </div>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 min-h-1 w-full border-b border-gray-200 pb-4">
        <ExamPrepLayout
        title={t('title')}
        subtitle={t('subtitle')}
        materialsCourseLabel={t('materials.courseLabel')}
        materialsCoursePlaceholder={t('materials.coursePlaceholder')}
        materialsLabel="자료 선택"
        materialsPlaceholder="자료를 선택하세요"
        pdfTitle={selectedMaterial?.title ?? t('pdf.title')}
        pdfPlaceholder={t('pdf.placeholder')}
        courses={courses}
        selectedCourseId={selectedCourseId}
        onSelectCourse={setSelectedCourseId}
        tabLabels={{
          summary: t('tabs.summary'),
          memorize: t('tabs.memorize'),
          quiz: t('tabs.quiz'),
          notes: t('tabs.notes'),
          aiTutor: t('tabs.aiTutor'),
        }}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        materials={materials}
        selectedMaterialId={selectedMaterialId}
        onSelectMaterial={handleSelectMaterial}
        isPdfAvailable={!!selectedMaterial?.signedUrl}
        pdfLoading={isPdfLoading}
        pdfLoadingContent={pdfLoadingContent}
        pdfContent={
          selectedMaterial?.signedUrl ? (
            <ExamPrepPdfViewer
              url={selectedMaterial.signedUrl ?? ''}
              annotations={pdfAnnotations}
              onAnnotationChange={(pageNumber, data) => saveAnnotation(pageNumber, data)}
              onPageCountChange={setPdfPageCount}
              currentPage={selectedPdfPage}
              onPageChange={page => {
                setSelectedPdfPage(page)
                if (noteMode === 'page') {
                  setSelectedNotePage(page)
                }
              }}
            />
          ) : null
        }
        pdfActionLabel={t('pdf.fullscreen')}
        onPdfAction={handleOpenPdfFullscreen}
        content={renderContent()}
        leftWidth={leftWidth}
        onResizeStart={handleResizeStart}
      />
      </div>
      {isPdfFullscreen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black">
          {!isPdfSlideshow && (
            <div className="flex items-center justify-between px-6 py-4 text-white">
              <div className="text-sm font-medium">{t('pdf.title')}</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPdfSlideshow(true)}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs"
                >
                  슬라이드쇼
                </button>
                <button
                  type="button"
                  onClick={handleClosePdfFullscreen}
                  className="rounded-full border border-white/20 px-3 py-1 text-xs"
                >
                  닫기
                </button>
              </div>
            </div>
          )}
          {isPdfSlideshow && (
            <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPdfSlideshow(false)}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white"
              >
                도구 보기
              </button>
              <button
                type="button"
                onClick={handleClosePdfFullscreen}
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-white"
              >
                닫기
              </button>
            </div>
          )}
          <div className="flex-1 overflow-auto">
            <ExamPrepPdfViewer
              url={selectedMaterial?.signedUrl ?? ''}
              annotations={pdfAnnotations}
              onAnnotationChange={(pageNumber, data) => saveAnnotation(pageNumber, data)}
              onPageCountChange={setPdfPageCount}
              currentPage={selectedPdfPage}
              onPageChange={page => {
                setSelectedPdfPage(page)
                if (noteMode === 'page') {
                  setSelectedNotePage(page)
                }
              }}
              hideToolbars={isPdfSlideshow}
            />
          </div>
        </div>
      )}
    </div>
  )
}

