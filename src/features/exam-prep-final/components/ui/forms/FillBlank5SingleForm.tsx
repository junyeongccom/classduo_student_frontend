/**
 * @file FillBlank5SingleForm.tsx
 * @description 5지선다 단수 빈칸채우기 — category_fill_blank5_single. dnd-kit 드래그&드롭.
 *              빈칸 1개. 채워지면 부모에 number 단일 전달, 빈 상태면 null.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies FillBlankDnd
 */
"use client";

import { FillBlankDnd } from "./FillBlankDnd";
import type { QuizFormResult } from "./types";

/**
 * 값 계약: value = 빈칸에 들어간 choice index (number) | 빈 상태면 null.
 *          onChange(value: number | null).
 */
export type FillBlank5SingleFormProps = {
  questionText: string;
  choices: string[];
  value: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  result?: QuizFormResult | null;
  /** 힌트로 제거된 오답 chip index. */
  eliminatedIdx?: number;
  feedbackSlot?: React.ReactNode;
  /** Active Recall 게이트 — 칩(선지) 풀 대신 노출할 박스. */
  recallSlot?: React.ReactNode;
};

export function FillBlank5SingleForm({
  questionText,
  choices,
  value,
  onChange,
  disabled,
  result,
  eliminatedIdx,
  feedbackSlot,
  recallSlot,
}: FillBlank5SingleFormProps) {
  const blanksValue: (number | null)[] = [value];
  const handleChange = (next: (number | null)[]) => {
    onChange(next[0] ?? null);
  };
  const correct =
    result && typeof result.correct_answer === "number" ? result.correct_answer : null;

  return (
    <FillBlankDnd
      questionText={questionText}
      choices={choices}
      blanksCount={1}
      value={blanksValue}
      onChange={handleChange}
      disabled={disabled}
      correctAnswer={correct}
      isCorrect={result?.is_correct}
      eliminatedIdx={result ? undefined : eliminatedIdx}
      feedbackSlot={feedbackSlot}
      recallSlot={recallSlot}
    />
  );
}
