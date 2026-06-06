/**
 * @file Mcq4SingleForm.tsx
 * @description 4지선다 단수 객관식 — 디자이너 시안(B2B) 매칭.
 *              분리된 흰 라운드 박스 4개가 세로 스택(박스 간 gap). 각 박스: letter + 세로 구분선 + 텍스트.
 *              선택중 = 보라 보더. 채점 후 정/오답 색상 로직 보존.
 *              모든 치수는 SolveCanvas 기준 cqw(=캔버스폭 1%, 1920 baseline).
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies none
 */
"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";
import type { QuizFormResult } from "./types";

export type Mcq4SingleFormProps = {
  questionText: string;
  choices: string[];
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  result?: QuizFormResult | null;
  /** 힌트로 제거된 오답 인덱스 — 해당 선택지는 비활성/취소선 표시. */
  eliminatedIdx?: number;
  feedbackSlot?: React.ReactNode;
};

const C_MASTER = "var(--color-mastery-master)";
const C_DELETE = "rgb(var(--color-semantic-delete))";
const C_BLACK = "var(--color-neutral-black-hex)";
const C_BORDER = "rgb(229 231 235)"; // 기본 보더 (gray-200)
const C_LETTER = "rgb(156 163 175)"; // gray-400
const C_TEXT = "rgb(55 65 81)"; // gray-700
const SELECTED_BG = "rgba(124, 122, 236, 0.08)"; // 연보라 (selected 배경, C_MASTER #7c7aec 연한)
const WRONG_BG = "rgba(244, 63, 94, 0.08)";      // 연빨강 (wrong 배경, C_DELETE 연한)

export function Mcq4SingleForm({
  questionText,
  choices,
  value,
  onChange,
  disabled,
  result,
  eliminatedIdx,
  feedbackSlot,
}: Mcq4SingleFormProps) {
  const t = useTranslations("examPrepFinal");
  const correct =
    result && typeof result.correct_answer === "number" ? result.correct_answer : null;

  return (
    <div className="flex w-full flex-col items-stretch" style={{ gap: "0.498cqw" /* figma 문제~정오답~선지 8px */ }}>
      {/* 문제 텍스트 — SemiBold 36px @1920 */}
      <h1
        className="font-semibold leading-snug break-keep"
        style={{ fontSize: "2.222cqw", color: C_BLACK }}
      >
        {questionText}
      </h1>

      {/* 정/오답 표시 슬롯 — 채점 전에도 자리 잡음 (레이아웃 shift 방지) */}
      <div className="flex w-full shrink-0 items-center" style={{ minHeight: "3.390cqw" /* figma 정오답칸 55px */ }}>
        {feedbackSlot}
      </div>

      {/* 4개 선지 — 분리된 흰 라운드 박스 + letter + 세로 구분선 + 텍스트 */}
      <fieldset className="flex w-full flex-col" style={{ gap: "1.481cqw" /* figma 선지 간격 24px */ }} disabled={disabled}>
        {choices.map((choice, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = value === idx;
          const showResult = !!result;
          const isCorrect = !!(result && correct === idx);
          const isWrongPick = !!(result && isSelected && correct !== null && !result.is_correct);
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
              onClick={() => onChange(idx)}
              disabled={disabled || isEliminated}
              aria-label={isEliminated ? t("solve.eliminatedChoice") : undefined}
              className={cn(
                "relative flex w-full items-center transition-colors",
                isEliminated && "cursor-not-allowed opacity-[0.45]",
                !isEliminated && !isEmphasized && !isOtherAfterResult && "hover:border-[var(--color-mastery-master)]",
              )}
              style={{
                minHeight: "5.867cqw" /* figma 선지박스 95px */,
                borderRadius: "0.984cqw",
                border: `${borderWidth} solid ${borderColor}`,
                backgroundColor,
                padding: "0 1.730cqw",
                gap: "1.363cqw",
              }}
            >
              {/* letter */}
              <span
                className="shrink-0 text-center"
                style={{
                  fontSize: "1.363cqw",
                  width: "1.659cqw",
                  color: letterColor,
                  fontWeight: isEmphasized ? 700 : 500,
                }}
              >
                {displayLetter}
              </span>
              {/* 선지 텍스트 */}
              <span
                className="flex-1 text-left break-keep leading-snug"
                style={{
                  fontSize: "1.233cqw",
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
