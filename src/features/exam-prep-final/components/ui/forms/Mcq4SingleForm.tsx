/**
 * @file Mcq4SingleForm.tsx
 * @description 4지선다 단수 객관식 — Figma 시안 591:4034 매칭.
 *              네모 박스로 둘러쌓인 4개 선지가 인접 보더를 공유하며 세로 스택.
 *              선택중인 선지는 외곽 보더 3px + 텍스트 SemiBold/Bold 로 강조.
 *              모든 치수는 1920 baseline vw 환산 (viewport 폭에 비례 스케일).
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies none
 */
"use client";

import { cn } from "@/shared/lib/utils";
import type { QuizFormResult } from "./types";

/**
 * 값 계약: value = 선택한 선지 index (number) | 미선택 시 null.
 *          onChange(idx: number) — 단일 선택 토글 없음(같은 항목 다시 눌러도 유지).
 */
export type Mcq4SingleFormProps = {
  questionText: string;
  choices: string[];
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  result?: QuizFormResult | null;
  /** 힌트로 제거된 오답 인덱스 — 해당 선택지는 비활성/취소선 표시. */
  eliminatedIdx?: number;
  /** 문제와 선지 사이에 끼울 슬롯 — 채점 후 정/오답 한 줄 헤더. 자리는 항상 잡힘. */
  feedbackSlot?: React.ReactNode;
};

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
  const correct =
    result && typeof result.correct_answer === "number" ? result.correct_answer : null;

  return (
    <div
      className="flex w-full flex-col items-stretch"
      style={{ gap: "clamp(12px, 1.04vw, 24px)" /* 20/1920 */ }}
    >
      {/* 문제 텍스트 — SemiBold 36px (시안). 화면 폭에 비례 + 모바일 min 18px. */}
      <h1
        className="font-semibold leading-snug text-[var(--color-neutral-black-hex)] break-keep"
        style={{ fontSize: "clamp(18px, 1.875vw, 40px)" /* 36/1920 */ }}
      >
        {questionText}
      </h1>

      {/* 정/오답 표시 슬롯 — 채점 전에도 자리 잡음 (레이아웃 shift 방지) */}
      <div
        className="flex w-full shrink-0 items-center"
        style={{ minHeight: "clamp(36px, 2.864vw, 64px)" /* 55/1920 */ }}
      >
        {feedbackSlot}
      </div>

      {/* 4개 선지 — 박스끼리 보더 공유 (인접 박스 1px 겹침). 선택중은 보더 3px 로 강조.
            채점 후: 정답 = 파란 보더, 사용자 픽 오답 = 빨강 배경 + 흰 텍스트, 그 외 비-정답 = 회색 배경 + 회색 텍스트.
            정답이 아닌 모든 선지의 letter 는 "X" 로 치환. */}
      <fieldset className="flex w-full flex-col" disabled={disabled}>
        {choices.map((choice, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = value === idx;
          const showResult = !!result;
          const isCorrect = !!(result && correct === idx);
          const isWrongPick = !!(result && isSelected && correct !== null && !result.is_correct);
          // 채점 후 + 정답도 아니고 사용자 픽도 아닌 선지 — 회색 dim 처리.
          const isOtherAfterResult = showResult && !isCorrect && !isWrongPick;
          const isEliminated = eliminatedIdx === idx && !result;

          // 외곽 보더 색/굵기 — 채점 후 정/오답이 우선, 그 다음 선택중.
          const borderColor = isCorrect
            ? "var(--color-mastery-master)"
            : isWrongPick
              ? "rgb(var(--color-semantic-delete))"
              : isOtherAfterResult
                ? "rgb(var(--color-neutral-gray-300))"
                : "var(--color-neutral-black-hex)";
          const borderWidth = isCorrect || isWrongPick || isSelected
            ? "max(2px, 0.156vw)" // 3/1920 — 선택/정답/오답 시 굵게
            : "max(1px, 0.052vw)"; // 1/1920 — 기본
          // 인접 박스끼리 보더 겹침: 굵은 보더가 위/아래 박스 위로 올라오도록 zIndex 처리.
          const isEmphasized = isCorrect || isWrongPick || isSelected;

          // 배경/텍스트 색 — 채점 후 비-정답 dim, 사용자 픽 오답 빨강 채움.
          const backgroundColor = isWrongPick
            ? "rgb(var(--color-semantic-delete))"
            : isOtherAfterResult
              ? "rgb(var(--color-neutral-gray-200))"
              : undefined; // 기본 = className bg-button-primary-bg
          const itemTextColor = isWrongPick
            ? "var(--color-text-inverse)"   /* 빨강 BG 위 텍스트는 inverse — 다크에서도 가독성 유지 */
            : isOtherAfterResult
              ? "rgb(var(--color-neutral-gray-500))"
              : "var(--color-neutral-black-hex)";
          // 정답 letter 는 보더와 동일한 파란색(mastery-master) 으로 강조.
          const letterColor = isCorrect ? "var(--color-mastery-master)" : itemTextColor;
          // 정답이 아닌 모든 선지(채점 후)는 라벨 X. 정답은 원래 letter 유지.
          const displayLetter = showResult && !isCorrect ? "X" : letter;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onChange(idx)}
              disabled={disabled || isEliminated}
              aria-label={isEliminated ? "힌트로 제거된 선택지" : undefined}
              className={cn(
                "relative flex w-full items-center transition-colors",
                // 채점 후 빨강/회색 배경이 아닐 때만 기본 흰 배경 + hover.
                !isWrongPick && !isOtherAfterResult && "bg-button-primary-bg",
                isEliminated && "cursor-not-allowed opacity-30 [&_*]:line-through",
                !isEliminated && !isEmphasized && !isOtherAfterResult && "hover:bg-[rgb(var(--color-neutral-gray-100))]",
              )}
              style={{
                minHeight: "clamp(56px, 4.948vw, 110px)" /* 95/1920 */,
                paddingTop: "12px",
                paddingBottom: "12px",
                paddingLeft: "clamp(12px, 1.25vw, 28px)" /* 24/1920 */,
                paddingRight: "clamp(12px, 1.25vw, 28px)",
                marginTop: idx === 0 ? 0 : "-1px" /* 인접 보더 1px 겹침 */,
                border: `${borderWidth} solid ${borderColor}`,
                backgroundColor,
                zIndex: isEmphasized ? 2 : 1,
                gap: "clamp(16px, 2.083vw, 48px)" /* 40/1920 */,
              }}
            >
              {/* 영문 letter (또는 X) — Bookk Gothic. 36px Light, 선택/정답/픽 시 Bold. */}
              <span
                className={cn(
                  "font-bookk shrink-0 text-center",
                  isSelected || isCorrect || isWrongPick ? "font-bold" : "font-light",
                )}
                style={{
                  fontSize: "clamp(18px, 1.875vw, 40px)" /* 36/1920 */,
                  width: "clamp(16px, 1.406vw, 32px)" /* 27/1920 */,
                  color: letterColor,
                }}
              >
                {displayLetter}
              </span>
              {/* 선지 텍스트 — 24px, 선택/정답 시 굵게. 좌측 정렬 (긴 문장 wrap 시 자연스러운 시선 흐름). */}
              <span
                className="flex-1 text-left break-keep leading-snug"
                style={{
                  fontSize: "clamp(14px, 1.25vw, 28px)" /* 24/1920 */,
                  color: itemTextColor,
                  fontVariationSettings: isSelected || isCorrect
                    ? "'wght' 600"
                    : isWrongPick
                      ? "'wght' 500"
                      : "'wght' 400",
                  fontWeight: "normal", // 가변 wght 만 쓰도록 강제
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
