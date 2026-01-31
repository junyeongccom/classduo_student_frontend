import type { ExamPrepQuizItem, ExamPrepUserAnswer } from '../types'

const normalizeTextAnswer = (value: string) => value.trim().toLowerCase()

export function gradeQuizAnswer(
  quiz: ExamPrepQuizItem,
  answerText: string | null,
  choiceOrder: number | null
): ExamPrepUserAnswer | null {
  if (choiceOrder !== null) {
    const selected = quiz.choices?.find(choice => choice.choice_order === choiceOrder) ?? null
    if (!selected) return null
    return {
      is_correct: !!selected.is_correct,
      choice_order: choiceOrder,
    }
  }

  if (answerText === null) return null
  if (!quiz.answer) return null

  return {
    is_correct: normalizeTextAnswer(answerText) === normalizeTextAnswer(quiz.answer),
    answer_text: answerText,
  }
}


