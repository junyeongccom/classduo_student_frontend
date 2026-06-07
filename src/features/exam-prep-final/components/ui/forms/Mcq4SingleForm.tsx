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
  /** Active Recall 게이트 — 제공되면 선지 대신 이 노드를 렌더(문제만 노출, 선지 가림). */
  recallSlot?: React.ReactNode;
  /** 모바일(<768px) — cqw 대신 고정 px 레이아웃 (Figma 942:9052). */
  mobile?: boolean;
};

/** 치수 토큰 — 데스크탑은 cqw(1620 baseline), 모바일은 Figma 942:9052 고정 px. */
type Sizing = {
  rootGap: string;
  stem: string;
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
const DESKTOP_SZ: Sizing = {
  rootGap: "0.498cqw",
  stem: "2.222cqw",
  feedbackMinH: "3.390cqw",
  fieldsetGap: "1.481cqw",
  boxMinH: "5.867cqw",
  boxRadius: "0.984cqw",
  boxPad: "0 1.730cqw",
  boxGap: "1.363cqw",
  borderEmph: "0.154cqw",
  borderNorm: "0.062cqw",
  letterFs: "1.363cqw",
  letterW: "1.659cqw",
  textFs: "1.233cqw",
};
const MOBILE_SZ: Sizing = {
  rootGap: "8px",
  stem: "21.6px",
  feedbackMinH: "28px",
  fieldsetGap: "12px",
  boxMinH: "47px",
  boxRadius: "11.25px",
  boxPad: "0 15px",
  boxGap: "17.25px",
  borderEmph: "2px",
  borderNorm: "1px",
  letterFs: "13.5px",
  letterW: "16px",
  textFs: "12px",
};
const MOBILE_BOX_SHADOW = "0px 1.5px 2.5px rgba(0,0,0,0.15)";

const C_MASTER = "var(--color-mastery-master)";
const C_DELETE = "rgb(var(--color-semantic-delete))";
const C_BLACK = "var(--color-neutral-black-hex)";
const C_CANVAS_FG = "var(--color-exam-canvas-fg)"; // 캔버스 직속 텍스트(지문) — 다크 반전
const C_BORDER = "rgb(229 231 235)"; // 기본 보더 (gray-200)
const C_LETTER = "rgb(156 163 175)"; // gray-400
const C_TEXT = "rgb(55 65 81)"; // gray-700
// selected/wrong 배경은 불투명(=흰 패널 #F6F7F9 위 합성값과 동일). rgba 합성이 아니라
// 고정 밝은 카드라 다크 패널(gray-950) 위에서도 글자(어두움)가 또렷이 보인다.
const SELECTED_BG = "rgb(236, 237, 248)"; // 연보라 (selected 배경, C_MASTER #7c7aec 연한)
const WRONG_BG = "rgb(246, 232, 237)";    // 연빨강 (wrong 배경, C_DELETE 연한)

export function Mcq4SingleForm({
  questionText,
  choices,
  value,
  onChange,
  disabled,
  result,
  eliminatedIdx,
  feedbackSlot,
  recallSlot,
  mobile = false,
}: Mcq4SingleFormProps) {
  const t = useTranslations("examPrepFinal");
  const SZ = mobile ? MOBILE_SZ : DESKTOP_SZ;
  const correct =
    result && typeof result.correct_answer === "number" ? result.correct_answer : null;

  return (
    <div className="flex w-full flex-col items-stretch" style={{ gap: SZ.rootGap /* figma 문제~정오답~선지 8px */ }}>
      {/* 문제 텍스트 — SemiBold 36px @1920 / 21.6px @mobile */}
      <h1
        className="font-semibold leading-snug break-keep"
        style={{ fontSize: SZ.stem, color: C_CANVAS_FG }}
      >
        {questionText}
      </h1>

      {/* 정/오답 표시 슬롯 — 채점 전에도 자리 잡음 (레이아웃 shift 방지) */}
      <div className="flex w-full shrink-0 items-center" style={{ minHeight: SZ.feedbackMinH /* figma 정오답칸 */ }}>
        {feedbackSlot}
      </div>

      {/* Active Recall 게이트 — 선지 대신 '먼저 떠올려보기' 박스 노출 (skilled 숙련도 한정). */}
      {recallSlot ? (
        recallSlot
      ) : (
      /* 4개 선지 — 분리된 흰 라운드 박스 + letter + 텍스트 */
      <fieldset className="flex w-full flex-col" style={{ gap: SZ.fieldsetGap /* figma 선지 간격 */ }} disabled={disabled}>
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
              onClick={() => onChange(idx)}
              disabled={disabled || isEliminated}
              aria-label={isEliminated ? t("solve.eliminatedChoice") : undefined}
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
                  mobile && !isOtherAfterResult && !isWrongPick ? MOBILE_BOX_SHADOW : undefined,
              }}
            >
              {/* letter */}
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
              {/* 선지 텍스트 */}
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
      )}
    </div>
  );
}
