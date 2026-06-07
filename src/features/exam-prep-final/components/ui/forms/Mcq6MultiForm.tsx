/**
 * @file Mcq6MultiForm.tsx
 * @description 6지선다 복수(2개) 객관식 — description_mcq6_multi. Mcq4SingleForm 과 동일 box-style(분리 라운드 박스).
 *              6개 박스 세로 스택(박스 간 gap), 4지 대비 높이 축소로 한 화면 fit. 정확히 2개 선택.
 *              모든 치수는 SolveCanvas 기준 cqw.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies none
 */
"use client";

import { useTranslations } from "next-intl";
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
  /** 모바일(<768px) — cqw 대신 고정 px 레이아웃 (Figma 942:9052 박스 스타일). */
  mobile?: boolean;
};

const PICK = 2;

/** 치수 토큰 — 데스크탑 cqw(1620 baseline) / 모바일 고정 px. */
type Sizing6 = {
  rootGap: string;
  stem: string;
  pickMl: string;
  pickFs: string;
  feedbackMinH: string;
  fieldsetGap: string;
  boxMinH: string;
  boxRadius: string;
  boxPad: string;
  boxGap: string;
  borderEmph: string;
  borderNorm: string;
  letterFs: string;
  letterW: string;
  textFs: string;
};
const DESKTOP_SZ6: Sizing6 = {
  rootGap: "0.498cqw",
  stem: "2.222cqw",
  pickMl: "0.711cqw",
  pickFs: "1.233cqw",
  feedbackMinH: "3.390cqw",
  fieldsetGap: "0.735cqw",
  boxMinH: "5.867cqw",
  boxRadius: "0.865cqw",
  boxPad: "0 1.730cqw",
  boxGap: "1.233cqw",
  borderEmph: "0.154cqw",
  borderNorm: "0.062cqw",
  letterFs: "1.233cqw",
  letterW: "1.541cqw",
  textFs: "1.173cqw",
};
const MOBILE_SZ6: Sizing6 = {
  rootGap: "8px",
  stem: "21.6px",
  pickMl: "6px",
  pickFs: "12px",
  feedbackMinH: "28px",
  fieldsetGap: "8px",
  boxMinH: "44px",
  boxRadius: "11.25px",
  boxPad: "0 14px",
  boxGap: "14px",
  borderEmph: "2px",
  borderNorm: "1px",
  letterFs: "13px",
  letterW: "15px",
  textFs: "12px",
};
const MOBILE_BOX_SHADOW6 = "0px 1.5px 2.5px rgba(0,0,0,0.15)";
const C_MASTER = "var(--color-mastery-master)";
const C_DELETE = "rgb(var(--color-semantic-delete))";
const C_BLACK = "var(--color-neutral-black-hex)";
const C_CANVAS_FG = "var(--color-exam-canvas-fg)"; // 캔버스 직속 텍스트(지문) — 다크 반전
const C_BORDER = "rgb(229 231 235)";
const C_LETTER = "rgb(156 163 175)";
const C_TEXT = "rgb(55 65 81)";
// selected/wrong 배경은 불투명(흰 패널 합성값) — 다크 패널 위에서도 밝은 카드라 글자가 또렷.
const SELECTED_BG = "rgb(236, 237, 248)"; // 연보라 (selected 배경)
const WRONG_BG = "rgb(246, 232, 237)";    // 연빨강 (wrong 배경)

export function Mcq6MultiForm({
  questionText,
  choices,
  value,
  onChange,
  disabled,
  result,
  eliminatedIdx,
  feedbackSlot,
  mobile = false,
}: Mcq6MultiFormProps) {
  const t = useTranslations("examPrepFinal");
  const SZ = mobile ? MOBILE_SZ6 : DESKTOP_SZ6;
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
    <div className="flex w-full flex-col items-stretch" style={{ gap: SZ.rootGap /* figma 문제~정오답~선지 8px */ }}>
      {/* 문제 텍스트 + (2개 선택) */}
      <h1 className="font-semibold leading-snug break-keep" style={{ fontSize: SZ.stem, color: C_CANVAS_FG }}>
        {questionText}
        <span
          className="font-normal"
          style={{ marginLeft: SZ.pickMl, fontSize: SZ.pickFs, color: "rgb(var(--color-neutral-gray-500))" }}
        >
          (2개 선택)
        </span>
      </h1>

      <div className="flex w-full shrink-0 items-center" style={{ minHeight: SZ.feedbackMinH /* figma 정오답칸 */ }}>
        {feedbackSlot}
      </div>

      {/* 6개 선지 */}
      <fieldset className="flex w-full flex-col" style={{ gap: SZ.fieldsetGap }} disabled={disabled}>
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
                  : mobile
                    ? "transparent" /* 모바일 기본은 보더 대신 그림자로 분리 (figma) */
                    : C_BORDER;
          const borderWidth = isCorrect || isSelected ? SZ.borderEmph : SZ.borderNorm;
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
              aria-label={isEliminated ? t("solve.eliminatedChoice") : undefined}
              aria-pressed={isSelected}
              className={cn(
                "relative flex w-full items-center transition-colors",
                isEliminated && "cursor-not-allowed opacity-[0.45]",
                !isEliminated && !isEmphasized && !isOtherAfterResult && "hover:border-[var(--color-mastery-master)]",
              )}
              style={{
                minHeight: SZ.boxMinH /* figma 선지박스 */,
                borderRadius: SZ.boxRadius,
                border: `${borderWidth} solid ${borderColor}`,
                backgroundColor,
                padding: SZ.boxPad,
                gap: SZ.boxGap,
                boxShadow:
                  mobile && !isOtherAfterResult && !isWrongPick ? MOBILE_BOX_SHADOW6 : undefined,
              }}
            >
              <span
                className="shrink-0 text-center"
                style={{
                  fontSize: SZ.letterFs,
                  width: SZ.letterW,
                  color: letterColor,
                  fontWeight: isEmphasized ? 700 : 500,
                }}
              >
                {displayLetter}
              </span>
              <span
                className="flex-1 text-left break-keep leading-snug"
                style={{
                  fontSize: SZ.textFs,
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
