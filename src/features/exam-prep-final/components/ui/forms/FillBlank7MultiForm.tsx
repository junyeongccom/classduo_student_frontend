/**
 * @file FillBlank7MultiForm.tsx
 * @description 7지선다 복수(2개) 빈칸채우기 — category_fill_blank7_multi. dnd-kit 드래그&드롭.
 *              부분 채움 상태도 부모에 전달 (1칸만 채워진 경우 [n, null]). 둘 다 채워지면 number[2].
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies FillBlankDnd
 */
"use client";

import { useMemo } from "react";
import { FillBlankDnd } from "./FillBlankDnd";
import type { QuizFormResult } from "./types";

/**
 * 값 계약: value = 각 빈칸의 choice index 배열. 부분 채움 시 해당 칸은 null.
 *            number[N] (모두 채워짐) | (number|null)[N] (부분 채움) | null.
 *          onChange(value: (number | null)[]) — 빈칸 수만큼의 배열 전달.
 */
export type FillBlank7MultiFormProps = {
  questionText: string;
  choices: string[];
  /** number[N] (모두 채워짐) | (number|null)[N] (부분 채움) | null */
  value: number[] | (number | null)[] | null;
  onChange: (value: (number | null)[]) => void;
  disabled?: boolean;
  result?: QuizFormResult | null;
  /** 힌트로 제거된 오답 chip index. */
  eliminatedIdx?: number;
  feedbackSlot?: React.ReactNode;
};

export function FillBlank7MultiForm({
  questionText,
  choices,
  value,
  onChange,
  disabled,
  result,
  eliminatedIdx,
  feedbackSlot,
}: FillBlank7MultiFormProps) {
  // questionText 의 ___ 갯수를 동적으로 파싱 — 통상 2 지만 1·3 인 데이터도 안전하게 지원.
  //   "category_fill_blank7_multi" 이름이 빈칸 2개를 가정하나 실제 데이터가 1개인 quiz 가 있을 경우
  //   blanksValue 가 length 2 로 강제되어 [N, null] 로 남고 검증이 fail 하는 버그 방지.
  const blanksCount = useMemo(() => {
    const matches = questionText.match(/_{2,}/g);
    return matches?.length ?? 2;
  }, [questionText]);

  const blanksValue: (number | null)[] = useMemo(
    () =>
      Array.from(
        { length: blanksCount },
        (_, i) => (value as (number | null)[] | null)?.[i] ?? null,
      ),
    [blanksCount, value],
  );

  const handleChange = (next: (number | null)[]) => {
    onChange(next);
  };

  const correct = Array.isArray(result?.correct_answer)
    ? (result?.correct_answer as number[])
    : null;

  return (
    <FillBlankDnd
      questionText={questionText}
      choices={choices}
      blanksCount={blanksCount}
      value={blanksValue}
      onChange={handleChange}
      disabled={disabled}
      correctAnswer={correct}
      isCorrect={result?.is_correct}
      eliminatedIdx={result ? undefined : eliminatedIdx}
      feedbackSlot={feedbackSlot}
    />
  );
}
