/**
 * @file MatchForm.tsx
 * @description 3개 고정 매칭 — term_definition_match3. 좌측 개념 컬럼 + 우측 정의 컬럼(고정 순서) +
 *   가운데 SVG 연결선. 클릭 매칭(좌↔우 어느 쪽이든 먼저). 연결선/점/박스 색상:
 *   default(회색) / selected(연보라) / wrong(빨강, 선은 점보다 연함) / correct(보라).
 *   wrong 채점 시 정답 박스는 보라 테두리. 모든 치수는 본문 캔버스(1620) 기준 cqw.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies none
 */
"use client";

import { useState } from "react";

import { cn } from "@/shared/lib/utils";
import type { QuizFormResult } from "./types";

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

type ActiveSel = { side: "left" | "right"; idx: number } | null;

const C_MASTER = "var(--color-mastery-master)";
const C_DELETE = "rgb(var(--color-semantic-delete))";
const C_BLACK = "var(--color-neutral-black-hex)";
const C_BORDER = "rgb(229 231 235)";
const PT_DEFAULT = "#D1D5DB"; // 회색 (미선택 점)
const PT_SELECTED = "#A78BFA"; // 연보라 (선택/연결, 채점 전)
const WRONG_BG = "rgba(244, 63, 94, 0.08)"; // 연빨강 (wrong 박스 배경)

// SVG viewBox(design px) — 좌카드 232 + 가운데 211 + 우카드 395 = 838, 카드높이 125·행간 38.
const VB_W = 838;
const CARD_H = 125;
const ROW_GAP = 38;
const VB_H = 3 * CARD_H + 2 * ROW_GAP; // 451
const LEFT_PX = 232; // 좌카드 우측 점 x
const RIGHT_PX = 443; // 우카드 좌측 점 x (838-395)
const rowY = (i: number) => i * (CARD_H + ROW_GAP) + CARD_H / 2; // 62.5 / 225.5 / 388.5

/** 우측 정의 텍스트 길이에 따라 폰트 크기(cqw) 동적 결정. */
function getRightFontSizeCqw(text: string): string {
  const len = text.length;
  if (len <= 22) return "1.233cqw";
  if (len <= 38) return "1.114cqw";
  if (len <= 58) return "0.984cqw";
  if (len <= 86) return "0.865cqw";
  return "0.747cqw";
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

  const pairedLeft = new Map(pairs.map(([l, r]) => [l, r]));
  const pairedRight = new Map(pairs.map(([l, r]) => [r, l]));

  const correctPairs = Array.isArray(result?.correct_answer)
    ? (result?.correct_answer as [number, number][])
    : [];
  const correctSet = new Set(correctPairs.map((p) => p.join(",")));
  const showResult = !!result;

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

  /** 매칭 쌍의 상태 색 — 채점 후 correct(보라)/wrong(빨강), 채점 전 selected(연보라). */
  const pairColor = (l: number, r: number): string =>
    showResult ? (correctSet.has(`${l},${r}`) ? C_MASTER : C_DELETE) : PT_SELECTED;

  /** 좌/우 강조색 — 매칭된 쌍 색 우선, 그다음 활성(연보라), 채점 시 정답 박스(보라). */
  const leftEmph = (l: number): string | null => {
    if (pairedLeft.has(l)) return pairColor(l, pairedLeft.get(l)!);
    if (active?.side === "left" && active.idx === l) return PT_SELECTED;
    if (showResult && correctPairs.some(([cl]) => cl === l)) return C_MASTER;
    return null;
  };
  const rightEmph = (r: number): string | null => {
    if (pairedRight.has(r)) return pairColor(pairedRight.get(r)!, r);
    if (active?.side === "right" && active.idx === r) return PT_SELECTED;
    if (showResult && correctPairs.some(([, cr]) => cr === r)) return C_MASTER;
    return null;
  };

  return (
    <div className="flex w-full flex-col items-stretch" style={{ gap: "0.498cqw" }}>
      <h1 className="font-semibold leading-snug break-keep" style={{ fontSize: "2.222cqw", color: C_BLACK }}>
        {questionText || "좌측 개념을 클릭한 뒤, 우측에서 알맞은 정의를 클릭하세요."}
      </h1>

      <div className="flex w-full shrink-0 items-center" style={{ minHeight: "3.390cqw" }}>
        {feedbackSlot}
      </div>

      <div className="relative mx-auto w-full" style={{ maxWidth: "51.728cqw" /* 838px */ }}>
        <div className="flex justify-between">
          {/* 좌측 개념 컬럼 */}
          <div className="flex shrink-0 flex-col" style={{ width: "14.317cqw" /* 232 */, gap: "2.347cqw" /* 38 */ }}>
            {leftItems.map((item, i) => {
              const emph = leftEmph(i);
              const isWrong = showResult && emph === C_DELETE;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onLeftClick(i)}
                  disabled={disabled}
                  className={cn(
                    "relative flex items-center justify-center break-keep text-center transition-colors",
                    !disabled && !emph && "cursor-pointer hover:border-[var(--color-mastery-master)]",
                  )}
                  style={{
                    minHeight: "7.716cqw" /* 125 */,
                    borderRadius: "0.984cqw",
                    border: `${emph ? "0.154cqw" : "0.062cqw"} solid ${emph ?? C_BORDER}`,
                    backgroundColor: isWrong ? WRONG_BG : "#ffffff",
                    padding: "0.711cqw 1.067cqw",
                  }}
                >
                  <span style={{ fontSize: "1.233cqw", fontWeight: 700, color: emph ?? C_BLACK }}>{item}</span>
                </button>
              );
            })}
          </div>

          {/* 우측 정의 컬럼 (고정 순서) */}
          <div className="flex shrink-0 flex-col" style={{ width: "24.383cqw" /* 395 */, gap: "2.347cqw" }}>
            {rightItems.map((item, j) => {
              const emph = rightEmph(j);
              const isWrong = showResult && emph === C_DELETE;
              return (
                <button
                  key={j}
                  type="button"
                  onClick={() => onRightClick(j)}
                  disabled={disabled}
                  className={cn(
                    "relative flex items-center break-keep text-left transition-colors",
                    !disabled && !emph && "cursor-pointer hover:border-[var(--color-mastery-master)]",
                  )}
                  style={{
                    minHeight: "7.716cqw",
                    borderRadius: "0.984cqw",
                    border: `${emph ? "0.154cqw" : "0.062cqw"} solid ${emph ?? C_BORDER}`,
                    backgroundColor: isWrong ? WRONG_BG : "#ffffff",
                    padding: "0.711cqw 1.358cqw",
                  }}
                >
                  <span className="leading-snug" style={{ fontSize: getRightFontSizeCqw(item), color: emph ?? C_BLACK }}>
                    {item}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 연결선 + 점 (SVG 오버레이) — viewBox 비율 = 카드영역 비율이라 원 왜곡 없음 */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
        >
          {/* 연결선 (점보다 연하게) */}
          {pairs.map(([l, r], k) => (
            <line
              key={k}
              x1={LEFT_PX}
              y1={rowY(l)}
              x2={RIGHT_PX}
              y2={rowY(r)}
              stroke={pairColor(l, r)}
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* 좌측 점 */}
          {leftItems.map((_, i) => (
            <circle key={`lp${i}`} cx={LEFT_PX} cy={rowY(i)} r={7.5} fill={leftEmph(i) ?? PT_DEFAULT} />
          ))}
          {/* 우측 점 */}
          {rightItems.map((_, j) => (
            <circle key={`rp${j}`} cx={RIGHT_PX} cy={rowY(j)} r={7.5} fill={rightEmph(j) ?? PT_DEFAULT} />
          ))}
        </svg>
      </div>
    </div>
  );
}
