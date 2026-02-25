'use client'

import { useCallback, useMemo, useState } from 'react'

import type { ExamPrepQuizType } from '../../types'
import { examPrepService } from '../../services/examPrepService'
import {
  ExamPrepQuizPanel,
  type ExamPrepQuizPanelProps,
  type ExamPrepQuizSettings,
  type ExamPrepQuizSettingsDifficultyKey,
  type ExamPrepQuizSettingsQuestionTypeKey,
} from '../ui/ExamPrepQuizPanel'

const MAX_QUIZ_COUNT = 30

const clampInt = (value: number, min: number, max: number) => Math.min(Math.max(Math.floor(value), min), max)

const QUESTION_TYPE_KEY_TO_QUIZ_TYPE: Record<ExamPrepQuizSettingsQuestionTypeKey, ExamPrepQuizType> = {
  definitionToTerm: 'DEF_TO_TERM',
  termToDefinition: 'TERM_TO_DEF',
  misconceptionDetection: 'MISCONCEPTION',
  contentRecall: 'RECALL',
  structureUnderstanding: 'STRUCTURE',
}

const mapDifficultyToInstructorDifficulty = (difficulty: ExamPrepQuizSettingsDifficultyKey | null) => {
  if (!difficulty) return null
  if (difficulty === 'easy') return '하' as const
  if (difficulty === 'hard') return '상' as const
  return '중' as const
}

export interface ExamPrepQuizPanelContainerProps
  extends Omit<
    ExamPrepQuizPanelProps,
    'onCreateSession' | 'isCreating' | 'settings' | 'onChangeSettings'
  > {
  selectedMaterialId: string | null
  language: 'ko' | 'en'
  refreshSessions: () => Promise<void> | void
}

export function ExamPrepQuizPanelContainer({
  selectedMaterialId,
  language,
  refreshSessions,
  ...uiProps
}: ExamPrepQuizPanelContainerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [settings, setSettings] = useState<ExamPrepQuizSettings>({
    // 기본값: 모든 유형 선택 (요구사항)
    questionTypes: [
      'definitionToTerm',
      'termToDefinition',
      'misconceptionDetection',
      'contentRecall',
      'structureUnderstanding',
    ],
    difficulty: 'normal',
    questionCount: 10,
    focusHint: '',
  })

  const quizTypesPayload = useMemo(() => {
    const mapped = settings.questionTypes
      .map((key) => QUESTION_TYPE_KEY_TO_QUIZ_TYPE[key])
      .filter(Boolean)
    // remove duplicates but keep order
    return Array.from(new Set(mapped))
  }, [settings.questionTypes])

  const handleCreateSession = useCallback(async () => {
    if (!selectedMaterialId) return

    const cleanedFocusHint = (settings.focusHint || '').trim()
    const count = clampInt(settings.questionCount, 1, MAX_QUIZ_COUNT)
    const mappedDifficulty = mapDifficultyToInstructorDifficulty(settings.difficulty)

    setIsCreating(true)
    const result = await examPrepService.createQuizSession(selectedMaterialId, {
      language,
      quiz_types: quizTypesPayload.length ? quizTypesPayload : undefined,
      count,
      difficulty: mappedDifficulty ?? undefined,
      additional_requirement: cleanedFocusHint || undefined,
    })
    setIsCreating(false)

    if (!result.error && result.data?.session_id) {
      await refreshSessions()
    }
  }, [language, quizTypesPayload, refreshSessions, selectedMaterialId, settings.difficulty, settings.focusHint, settings.questionCount])

  return (
    <ExamPrepQuizPanel
      {...uiProps}
      onCreateSession={handleCreateSession}
      isCreating={isCreating}
      settings={settings}
      onChangeSettings={setSettings}
      maxQuestionCount={MAX_QUIZ_COUNT}
    />
  )
}


