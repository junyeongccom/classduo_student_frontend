/**
 * @file Mcq6MultiForm.tsx
 * @description 6지선다 복수(2개) 객관식 — description_mcq6_multi. Mcq4SingleForm 과 동일 box-style(분리 라운드 박스).
 *              6개 박스 세로 스택(박스 간 gap), 4지 대비 높이 축소로 한 화면 fit. 정확히 2개 선택.
 *              모든 치수는 SolveCanvas 기준 cqw.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies none
 */
"use client";

import { cn } from "@/shared/lib/utils";
import type { QuizFormResult } from "./types";

export type Mcq6MultiFormProps = {
  questionText: string;
  choices: string[];
  value: number[] | null;
  onChange: (value: number[]) => void;
  disabled?: boolean;
  result?: QuizFormResult | null;
  eliminatedIdx?: number;
  feedbackSlot?: React.ReactNode;
};

const PICK = 2;
const C_MASTER = "var(--color-mastery-master)";
const C_DELETE = "rgb(var(--color-semantic-delete))";
const C_BLACK = "var(--color-neutral-black-hex)";
const C_BORDER = "rgb(229 231 235)";
const C_DIVIDER = "rgb(229 231 235)";
const C_LETTER = "rgb(156 163 175)";
const C_TEXT = "rgb(55 65 81)";
const SELECTED_BG = "rgba(124, 122, 236, 0.08)"; // 연보라 (selected 배경)
const WRONG_BG = "rgba(244, 63, 94, 0.08)";      // 연빨강 (wrong 배경)

export function Mcq6MultiForm({
  questionText,
  choices,
  value,
  onChange,
  disabled,
  result,
  eliminatedIdx,
  feedbackSlot,
}: Mcq6MultiFormProps) {
  const selected = new Set(value ?? []);
  const correctSet = new Set(
    Array.isArray(result?.correct_answer) ? (result?.correct_answer as number[]) : [],
  );

  const toggle = (idx: number) => {
    const next = new Set(selected);
    if (next.has(idx)) next.delete(idx);
    else {
      if (next.size >= PICK) {
        const first = [...next][0];
        next.delete(first);
      }
      next.add(idx);
    }
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div className="flex w-full flex-col items-stretch" style={{ gap: "0.498cqw" /* figma 문제~정오답~선지 8px */ }}>
      {/* 문제 텍스트 + (2개 선택) */}
      <h1 className="font-semibold leading-snug break-keep" style={{ fontSize: "2.222cqw", color: C_BLACK }}>
        {questionText}
        <span
          className="ml-[0.711cqw] font-normal"
          style={{ fontSize: "1.233cqw", color: "rgb(var(--color-neutral-gray-500))" }}
        >
          (2개 선택)
        </span>
      </h1>

      <div className="flex w-full shrink-0 items-center" style={{ minHeight: "3.390cqw" /* figma 정오답칸 55px */ }}>
        {feedbackSlot}
      </div>

      {/* 6개 선지 */}
      <fieldset className="flex w-full flex-col" style={{ gap: "0.735cqw" }} disabled={disabled}>
        {choices.map((choice, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selected.has(idx);
          const showResult = !!result;
          const isCorrect = !!(result && correctSet.has(idx));
          const isWrongPick = !!(result && isSelected && !isCorrect);
          const isOtherAfterResult = showResult && !isCorrect && !isWrongPick;
          const isEliminated = eliminatedIdx === idx && !result;
          const isEmphasized = isCorrect || isWrongPick || isSelected;

          const borderColor = isCorrect
            ? C_MASTER
            : isWrongPick
              ? "transparent"
              : isSelected
                ? C_MASTER
                : isOtherAfterResult
                  ? "rgb(var(--color-neutral-gray-300))"
                  : C_BORDER;
          const borderWidth = isCorrect || isSelected ? "0.154cqw" : "0.062cqw";
          const backgroundColor = isWrongPick
            ? WRONG_BG
            : isSelected
              ? SELECTED_BG
              : isOtherAfterResult
                ? "rgb(var(--color-neutral-gray-200))"
                : "#ffffff";
          const textColor = isWrongPick
            ? C_DELETE
            : isOtherAfterResult
              ? "rgb(var(--color-neutral-gray-500))"
              : isSelected || isCorrect
                ? C_BLACK
                : C_TEXT;
          const letterColor = isCorrect ? C_MASTER : isWrongPick ? C_DELETE : isSelected ? C_MASTER : C_LETTER;
          const displayLetter = letter;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => toggle(idx)}
              disabled={disabled || isEliminated}
              aria-label={isEliminated ? "힌트로 제거된 선택지" : undefined}
              aria-pressed={isSelected}
              className={cn(
                "relative flex w-full items-center transition-colors",
                isEliminated && "cursor-not-allowed opacity-30 [&_*]:line-through",
                !isEliminated && !isEmphasized && !isOtherAfterResult && "hover:border-[var(--color-mastery-master)]",
              )}
              style={{
                minHeight: "5.867cqw" /* figma 선지박스 95px */,
                borderRadius: "0.865cqw",
                border: `${borderWidth} solid ${borderColor}`,
                backgroundColor,
                padding: "0 1.730cqw",
                gap: "1.233cqw",
              }}
            >
              <span
                className="shrink-0 text-center"
                style={{
                  fontSize: "1.233cqw",
                  width: "1.541cqw",
                  color: letterColor,
                  fontWeight: isEmphasized ? 700 : 500,
                }}
              >
                {displayLetter}
              </span>
              <span
                className="shrink-0"
                style={{ width: "0.062cqw", height: "1.541cqw", backgroundColor: C_DIVIDER }}
              />
              <span
                className="flex-1 text-left break-keep leading-snug"
                style={{
                  fontSize: "1.173cqw",
                  color: textColor,
                  fontWeight: isSelected || isCorrect ? 600 : 400,
                }}
              >
                {choice}
              </span>
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}
