/**
 * @file MatchForm.tsx
 * @description 3개 고정 매칭 — term_definition_match3. 디자이너 시안(B2B) 매칭.
 *              좌측 개념카드 · 가운데 연결 점(··) · 우측 정의카드 의 라운드 박스 3행.
 *              양방향 진입: 좌/우 어디부터 클릭해도 매칭 성립. 한쪽 활성 시 같은 쪽 다른 카드 회색 비활성.
 *              매칭/채점 시 두 카드 + 연결점이 보라(정답)·빨강(오답)으로 강조.
 *              모든 치수는 SolveCanvas 기준 cqw.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies none
 */
"use client";

import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import type { QuizFormResult } from "./types";

/**
 * 값 계약: value = 매칭된 [좌측 index, 우측 index] 쌍 배열 ([number, number][]) | 미매칭 시 null.
 *          onChange(value: [number, number][]) — 쌍 추가/제거 시 전체 배열 전달.
 */
export type MatchFormProps = {
  questionText: string;
  leftItems: string[];
  rightItems: string[];
  value: [number, number][] | null;
  onChange: (value: [number, number][]) => void;
  disabled?: boolean;
  result?: QuizFormResult | null;
  feedbackSlot?: React.ReactNode;
};

type ActiveSel = { side: "left"; idx: number } | { side: "right"; idx: number } | null;

const C_MASTER = "var(--color-mastery-master)";
const C_DELETE = "rgb(var(--color-semantic-delete))";
const C_BLACK = "var(--color-neutral-black-hex)";
const C_BORDER = "rgb(229 231 235)";

/** 우측 정의 텍스트 길이에 따라 폰트 크기(cqw) 동적 결정. truncate 없이 자동 축소. */
function getRightFontSizeCqw(text: string): string {
  const len = text.length;
  if (len <= 22) return "1.04cqw";
  if (len <= 38) return "0.94cqw";
  if (len <= 58) return "0.83cqw";
  if (len <= 86) return "0.73cqw";
  return "0.63cqw";
}

export function MatchForm({
  questionText,
  leftItems,
  rightItems,
  value,
  onChange,
  disabled,
  result,
  feedbackSlot,
}: MatchFormProps) {
  const pairs = value ?? [];
  const [active, setActive] = useState<ActiveSel>(null);

  const pairedLeft = new Set(pairs.map(([l]) => l));
  const pairedRight = new Set(pairs.map(([, r]) => r));

  const correctPairs = Array.isArray(result?.correct_answer)
    ? (result?.correct_answer as [number, number][])
    : [];
  const correctSet = new Set(correctPairs.map((p) => p.join(",")));

  const rightInRow: number[] = computeRightLayout(pairs, leftItems.length, rightItems.length);

  const commitPair = (l: number, r: number) => {
    const next: [number, number][] = pairs.filter(([pl, pr]) => pl !== l && pr !== r);
    next.push([l, r]);
    onChange(next);
    setActive(null);
  };

  const onLeftClick = (l: number) => {
    if (disabled) return;
    if (pairedLeft.has(l)) {
      onChange(pairs.filter(([pl]) => pl !== l));
      setActive(null);
      return;
    }
    if (active?.side === "right") {
      commitPair(l, active.idx);
      return;
    }
    setActive(active?.side === "left" && active.idx === l ? null : { side: "left", idx: l });
  };

  const onRightClick = (r: number) => {
    if (disabled) return;
    if (pairedRight.has(r)) {
      onChange(pairs.filter(([, pr]) => pr !== r));
      setActive(null);
      return;
    }
    if (active?.side === "left") {
      commitPair(active.idx, r);
      return;
    }
    setActive(active?.side === "right" && active.idx === r ? null : { side: "right", idx: r });
  };

  return (
    <div className="flex w-full flex-col items-stretch" style={{ gap: "1.04cqw" }}>
      <h1 className="font-semibold leading-snug break-keep" style={{ fontSize: "1.875cqw", color: C_BLACK }}>
        {questionText || "좌측 개념을 클릭한 뒤, 우측에서 알맞은 정의를 클릭하세요."}
      </h1>

      <div className="flex w-full shrink-0 items-center" style={{ minHeight: "1.6cqw" }}>
        {feedbackSlot}
      </div>

      {/* 3 rows */}
      <div className="mx-auto flex w-full flex-col items-stretch" style={{ gap: "1.15cqw", maxWidth: "44cqw" }}>
        {leftItems.map((leftItem, i) => {
          const ri = rightInRow[i];
          const rightItem = ri >= 0 ? rightItems[ri] ?? null : null;
          const isMatched = pairedLeft.has(i);
          const isLeftActive = active?.side === "left" && active.idx === i;
          const isRightActive = ri >= 0 && active?.side === "right" && active.idx === ri;
          const isCorrect = !!(result && isMatched && ri >= 0 && correctSet.has(`${i},${ri}`));
          const isWrong = !!(result && isMatched && !isCorrect);
          const isLeftGrayed = !!active && active.side === "left" && active.idx !== i && !isMatched;
          const isRightGrayed =
            !!active && active.side === "right" && ri >= 0 && active.idx !== ri && !isMatched;

          return (
            <MatchRow
              key={i}
              leftText={leftItem}
              rightText={rightItem}
              isMatched={isMatched}
              isLeftActive={isLeftActive}
              isRightActive={isRightActive}
              isLeftGrayed={isLeftGrayed}
              isRightGrayed={isRightGrayed}
              isCorrect={isCorrect}
              isWrong={isWrong}
              onLeftClick={() => onLeftClick(i)}
              onRightClick={() => {
                if (ri >= 0) onRightClick(ri);
              }}
              disabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
}

function computeRightLayout(
  pairs: [number, number][],
  leftLen: number,
  rightLen: number,
): number[] {
  const result = new Array<number>(leftLen).fill(-1);
  const pairedRightSet = new Set(pairs.map(([, r]) => r));
  for (const [l, r] of pairs) {
    if (l >= 0 && l < leftLen) result[l] = r;
  }
  const unmatchedRights: number[] = [];
  for (let r = 0; r < rightLen; r++) {
    if (!pairedRightSet.has(r)) unmatchedRights.push(r);
  }
  let cursor = 0;
  for (let i = 0; i < leftLen; i++) {
    if (result[i] === -1) {
      result[i] = unmatchedRights[cursor] ?? -1;
      cursor++;
    }
  }
  return result;
}

type MatchRowProps = {
  leftText: string;
  rightText: string | null;
  isMatched: boolean;
  isLeftActive: boolean;
  isRightActive: boolean;
  isLeftGrayed: boolean;
  isRightGrayed: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  onLeftClick: () => void;
  onRightClick: () => void;
  disabled?: boolean;
};

function MatchRow({
  leftText,
  rightText,
  isMatched,
  isLeftActive,
  isRightActive,
  isLeftGrayed,
  isRightGrayed,
  isCorrect,
  isWrong,
  onLeftClick,
  onRightClick,
  disabled,
}: MatchRowProps) {
  // 강조 색 — 채점(정/오답) 우선, 그다음 매칭/활성.
  const accent = isCorrect ? C_MASTER : isWrong ? C_DELETE : C_MASTER;
  const leftEmph = isMatched || isLeftActive || isCorrect || isWrong;
  const rightEmph = isMatched || isRightActive || isCorrect || isWrong;
  const dotColor = isMatched || isLeftActive || isRightActive ? accent : "rgb(209 213 219)";

  const cardBase =
    "relative flex items-center transition-colors break-keep";
  const leftStyle = {
    width: "12cqw",
    minHeight: "4.4cqw",
    borderRadius: "0.83cqw",
    border: `${leftEmph ? "0.13cqw" : "0.052cqw"} solid ${leftEmph ? accent : C_BORDER}`,
    backgroundColor: "#ffffff",
    padding: "0.6cqw 0.9cqw",
  } as const;
  const rightStyle = {
    flex: 1,
    minHeight: "4.4cqw",
    borderRadius: "0.83cqw",
    border: `${rightEmph ? "0.13cqw" : "0.052cqw"} solid ${rightEmph ? accent : C_BORDER}`,
    backgroundColor: "#ffffff",
    padding: "0.6cqw 1.1cqw",
  } as const;

  return (
    <div className="flex w-full items-stretch">
      <button
        type="button"
        onClick={onLeftClick}
        disabled={disabled || isLeftGrayed}
        aria-pressed={isLeftActive || isMatched}
        className={cn(
          cardBase,
          "shrink-0 justify-center text-center",
          isLeftGrayed && "opacity-30",
          disabled || isLeftGrayed ? "cursor-not-allowed" : "cursor-pointer hover:border-[var(--color-mastery-master)]",
        )}
        style={leftStyle}
      >
        <span style={{ fontSize: "1.04cqw", fontWeight: 700, color: C_BLACK }}>{leftText}</span>
      </button>

      {/* 연결 점 (··) */}
      <div className="flex shrink-0 items-center justify-center" style={{ width: "3.6cqw", gap: "0.5cqw" }}>
        <span className="rounded-full" style={{ width: "0.5cqw", height: "0.5cqw", backgroundColor: dotColor }} />
        <span className="rounded-full" style={{ width: "0.5cqw", height: "0.5cqw", backgroundColor: dotColor }} />
      </div>

      <button
        type="button"
        onClick={onRightClick}
        disabled={disabled || isRightGrayed}
        aria-pressed={isRightActive || isMatched}
        className={cn(
          cardBase,
          "text-left",
          isRightGrayed && "opacity-30",
          disabled || isRightGrayed ? "cursor-not-allowed" : "cursor-pointer hover:border-[var(--color-mastery-master)]",
        )}
        style={rightStyle}
      >
        <span
          className="break-keep leading-snug"
          style={{ fontSize: rightText ? getRightFontSizeCqw(rightText) : "1.04cqw", color: C_BLACK }}
        >
          {rightText ?? ""}
        </span>
      </button>
    </div>
  );
}
