/**
 * @file Mcq6MultiForm.tsx
 * @description 6지선다 복수(2개) 객관식 — description_mcq6_multi. Mcq4SingleForm 과 동일한 box-style UI.
 *              네모 박스 6개가 인접 보더를 공유하며 세로 스택. 정확히 2개 선택 시 검정 보더 강조.
 *              4지선다 대비 박스 높이를 줄여 한 화면 fit 유지 (6 × 3.75vw = 22.5vw).
 *              모든 치수는 1920 baseline vw 환산.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies none
 */
"use client";

import { cn } from "@/shared/lib/utils";
import type { QuizFormResult } from "./types";

/**
 * 값 계약: value = 선택한 선지 index 배열 (number[]), 정렬됨, 최대 2개 (FIFO 교체) | 미선택 시 null.
 *          onChange(value: number[]) — 정확히 2개 선택 토글.
 */
export type Mcq6MultiFormProps = {
  questionText: string;
  choices: string[];
  value: number[] | null;
  onChange: (value: number[]) => void;
  disabled?: boolean;
  result?: QuizFormResult | null;
  /** 힌트로 제거된 오답 인덱스. */
  eliminatedIdx?: number;
  feedbackSlot?: React.ReactNode;
};

const PICK = 2;

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
        // FIFO 교체 — 가장 먼저 선택한 항목 제거.
        const first = [...next][0];
        next.delete(first);
      }
      next.add(idx);
    }
    onChange([...next].sort((a, b) => a - b));
  };

  return (
    <div
      className="flex w-full flex-col items-stretch"
      style={{ gap: "clamp(12px, 1.04vw, 24px)" /* 20/1920 */ }}
    >
      {/* 문제 텍스트 — SemiBold 36px @ 1920 + 모바일 min 18px + "(2개 선택)" 보조 */}
      <h1
        className="font-semibold leading-snug text-[var(--color-neutral-black-hex)] break-keep"
        style={{ fontSize: "clamp(18px, 1.875vw, 40px)" /* 36/1920 */ }}
      >
        {questionText}
        <span
          className="ml-3 font-normal text-[rgb(var(--color-neutral-gray-500))]"
          style={{ fontSize: "clamp(12px, 1.042vw, 22px)" /* 20/1920 */ }}
        >
          (2개 선택)
        </span>
      </h1>

      {/* 정/오답 표시 슬롯 — 채점 전에도 자리 잡음 (레이아웃 shift 방지) */}
      <div
        className="flex w-full shrink-0 items-center"
        style={{ minHeight: "clamp(32px, 2.864vw, 64px)" /* 55/1920 */ }}
      >
        {feedbackSlot}
      </div>

      {/* 6개 선지 — 박스끼리 보더 공유 (인접 박스 1px 겹침). 선택중·정답·오답시 보더 3px.
            채점 후: 정답(전체) = 파란 보더, 사용자 픽 오답 = 빨강 배경 + 흰 텍스트, 그 외 비-정답 = 회색 배경 + 회색 텍스트.
            정답이 아닌 모든 선지의 letter 는 "X" 로 치환 (복수 정답인 경우 정답 셀은 모두 letter 유지). */}
      <fieldset className="flex w-full flex-col" disabled={disabled}>
        {choices.map((choice, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = selected.has(idx);
          const showResult = !!result;
          const isCorrect = !!(result && correctSet.has(idx));
          const isWrongPick = !!(result && isSelected && !isCorrect);
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
          const isEmphasized = isCorrect || isWrongPick || isSelected;
          const borderWidth = isEmphasized
            ? "0.156vw" // 3/1920
            : "0.052vw"; // 1/1920

          // 배경/텍스트 색 — 채점 후 비-정답 dim, 사용자 픽 오답 빨강 채움.
          const backgroundColor = isWrongPick
            ? "rgb(var(--color-semantic-delete))"
            : isOtherAfterResult
              ? "rgb(var(--color-neutral-gray-200))"
              : undefined;
          const itemTextColor = isWrongPick
            ? "var(--color-text-inverse)"   /* 빨강 BG 위 텍스트는 inverse — 다크에서도 가독성 유지 */
            : isOtherAfterResult
              ? "rgb(var(--color-neutral-gray-500))"
              : "var(--color-neutral-black-hex)";
          // 정답 letter 는 보더와 동일한 파란색(mastery-master) 으로 강조.
          const letterColor = isCorrect ? "var(--color-mastery-master)" : itemTextColor;
          // 정답이 아닌 모든 선지(채점 후)는 라벨 X. 정답 셀은 원래 letter 유지.
          const displayLetter = showResult && !isCorrect ? "X" : letter;

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
                !isWrongPick && !isOtherAfterResult && "bg-button-primary-bg",
                isEliminated && "cursor-not-allowed opacity-30 [&_*]:line-through",
                !isEliminated && !isEmphasized && !isOtherAfterResult && "hover:bg-[rgb(var(--color-neutral-gray-100))]",
              )}
              style={{
                // 6개 fit 위해 4지선다 대비 축소. 모바일은 min 48px 유지.
                minHeight: "clamp(48px, 3.75vw, 88px)" /* 72/1920 */,
                paddingTop: "10px",
                paddingBottom: "10px",
                paddingLeft: "clamp(12px, 1.25vw, 28px)" /* 24/1920 */,
                paddingRight: "clamp(12px, 1.25vw, 28px)",
                marginTop: idx === 0 ? 0 : "-1px" /* 인접 보더 1px 겹침 */,
                border: `${borderWidth} solid ${borderColor}`,
                backgroundColor,
                zIndex: isEmphasized ? 2 : 1,
                gap: "clamp(14px, 2.083vw, 48px)" /* 40/1920 */,
              }}
            >
              {/* 영문 letter (또는 X) — Bookk Gothic. Light, 선택/정답/픽 시 Bold. */}
              <span
                className={cn(
                  "font-bookk shrink-0 text-center",
                  isSelected || isCorrect || isWrongPick ? "font-bold" : "font-light",
                )}
                style={{
                  fontSize: "clamp(16px, 1.875vw, 40px)" /* 36/1920 */,
                  width: "clamp(14px, 1.406vw, 32px)" /* 27/1920 */,
                  color: letterColor,
                }}
              >
                {displayLetter}
              </span>
              {/* 선지 텍스트 — 22px @ 1920. 좌측 정렬 + 가변 wght (긴 문장 wrap 시 자연스러운 시선 흐름). */}
              <span
                className="flex-1 text-left break-keep leading-snug"
                style={{
                  fontSize: "clamp(13px, 1.146vw, 26px)" /* 22/1920 */,
                  color: itemTextColor,
                  fontVariationSettings: isSelected || isCorrect
                    ? "'wght' 600"
                    : isWrongPick
                      ? "'wght' 500"
                      : "'wght' 400",
                  fontWeight: "normal",
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
