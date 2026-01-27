'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ExamPrepLayout } from '../ui/ExamPrepLayout'
import { ExamPrepSummaryPanel } from '../ui/ExamPrepSummaryPanel'
import { ExamPrepGlossaryPanel } from '../ui/ExamPrepGlossaryPanel'
import { ExamPrepQuizPanel } from '../ui/ExamPrepQuizPanel'
import { ExamPrepAiTutorPanel } from '../ui/ExamPrepAiTutorPanel'
import { ExamPrepNotesPanel } from '../ui/ExamPrepNotesPanel'
import { ExamPrepPdfViewer } from '../ui/ExamPrepPdfViewer'
import type { ExamPrepTab, ExamPrepMaterial, ExamPrepQuizType, ExamPrepNoteScope } from '../../types'
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

const DEFAULT_LEFT_WIDTH = 620
const MIN_LEFT_WIDTH = 400
const MIN_RIGHT_WIDTH = 340
const SIDEBAR_WIDTH = 140

export function ExamPrepContainer() {
  const t = useTranslations('examPrep')
  const locale = useLocale()
  const language = locale === 'en' ? 'en' : 'ko'
  const [activeTab, setActiveTab] = useState<ExamPrepTab>('summary')
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH)
  const [isResizing, setIsResizing] = useState(false)
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false)
  const [isPdfSlideshow, setIsPdfSlideshow] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { courses } = useExamPrepCourses()
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const { materials: materialsList } = useExamPrepMaterials(selectedCourseId)
  const materials = useMemo<ExamPrepMaterial[]>(() => materialsList, [materialsList])
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const selectedMaterial = useMemo(
    () => materials.find(material => material.id === selectedMaterialId) ?? null,
    [materials, selectedMaterialId]
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
  } = useExamPrepQuizSessions(selectedMaterialId)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [onlyWrong, setOnlyWrong] = useState(false)
  const {
    quizzes,
    isLoading: quizzesLoading,
    refresh: refreshQuizzes,
  } = useExamPrepQuizDetail(selectedSessionId, onlyWrong)
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
  const [quizTypes, setQuizTypes] = useState<ExamPrepQuizType[]>([
    'RECALL',
    'STRUCTURE',
    'MISCONCEPTION',
  ])
  const [quizCount, setQuizCount] = useState(10)
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

  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0]?.id ?? null)
    }
  }, [courses, selectedCourseId])

  useEffect(() => {
    setSelectedMaterialId(null)
  }, [selectedCourseId])

  useEffect(() => {
    if (!selectedMaterialId && materials.length > 0) {
      setSelectedMaterialId(materials[0]?.id ?? null)
    }
  }, [materials, selectedMaterialId])

  useEffect(() => {
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    setSelectedSessionId(null)
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
    if (sessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessions[0]?.session_id ?? null)
    }
  }, [sessions, selectedSessionId])

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
    if (!selectedMaterialId || quizTypes.length === 0) return
    setIsCreatingQuiz(true)
    const result = await examPrepService.createQuizSession(selectedMaterialId, {
      quiz_types: quizTypes,
      count: quizCount,
      language,
    })
    setIsCreatingQuiz(false)
    if (result.data?.session_id) {
      await refreshSessions()
      setSelectedSessionId(result.data.session_id)
    }
  }

  const handleToggleQuizType = (type: ExamPrepQuizType) => {
    setQuizTypes(prev =>
      prev.includes(type) ? prev.filter(item => item !== type) : [...prev, type]
    )
  }

  const handleSubmitAnswer = async (quizId: string, answerText: string | null, choiceOrder: number | null) => {
    if (!selectedSessionId) return
    await examPrepService.submitQuizAnswer(selectedSessionId, {
      quiz_id: quizId,
      answer_text: answerText,
      choice_order: choiceOrder,
    })
    await refreshQuizzes()
    await refreshSessions()
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
          emptyText="요약 데이터가 없습니다."
          loadingMessage="KUI가 요약을 정리하고 있어요..."
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
      return (
        <ExamPrepQuizPanel
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onCreateSession={handleCreateSession}
          isCreating={isCreatingQuiz}
          quizTypes={quizTypes}
          onToggleQuizType={handleToggleQuizType}
          count={quizCount}
          onChangeCount={setQuizCount}
          quizzes={quizzes}
          isLoading={sessionsLoading || quizzesLoading}
          onlyWrong={onlyWrong}
          onToggleWrong={() => setOnlyWrong(prev => !prev)}
          onSubmitAnswer={handleSubmitAnswer}
          loadingMessage="KUI가 퀴즈를 만들고 있어요..."
          emptyText="퀴즈를 생성하거나 세션을 선택해주세요."
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
        emptyText="AI 튜터에게 질문을 남겨보세요."
        loadingMessage="KUI가 자료에서 답을 찾고 있어요..."
      />
    )
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <ExamPrepLayout
        title={t('title')}
        subtitle={t('subtitle')}
        materialsCourseLabel={t('materials.courseLabel')}
        materialsCoursePlaceholder={t('materials.coursePlaceholder')}
        materialsLabel="자료 선택"
        materialsPlaceholder="자료를 선택하세요"
        pdfTitle={t('pdf.title')}
        pdfPlaceholder={t('pdf.placeholder')}
        courses={courses}
        selectedCourseId={selectedCourseId}
        onSelectCourse={setSelectedCourseId}
        tabLabels={{
          summary: t('tabs.summary'),
          quiz: t('tabs.quiz'),
          memorize: t('tabs.memorize'),
          notes: t('tabs.notes'),
          aiTutor: t('tabs.aiTutor'),
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        materials={materials}
        selectedMaterialId={selectedMaterialId}
        onSelectMaterial={setSelectedMaterialId}
        isPdfAvailable={!!selectedMaterial?.signedUrl}
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
      {isPdfFullscreen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
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

