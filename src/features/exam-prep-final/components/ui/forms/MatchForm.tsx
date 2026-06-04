/**
 * @file MatchForm.tsx
 * @description 3개 매칭 — term_definition_match3. Figma 시안 339:7709 (초기) / 339:9363 (매칭/채점).
 *              좌측 카드(사각, 우측 사선) BEHIND 에 검은 사다리꼴(parallelogram) letter 태그 배치 →
 *                카드 본문이 사다리꼴 상단을 덮고, 노출된 좌하단 영역에 letter (A/B/C) 표시.
 *              우측 카드(좌상단 사선 사다리꼴) — 좌측변 기울기를 좌측 letter 태그 우측변과 동일하게 매칭 →
 *                매칭 시 사선이 연속선처럼 맞물림.
 *              매칭 시 letter 태그 하단 ↔ 우측 카드 하단 BOTTOM-ALIGN (row 전체 높이 = 7.5vw).
 *              양방향 진입 가능: 좌측·우측 어디부터 클릭해도 매칭 성립. 한쪽 활성 시 같은 쪽 다른 카드 회색 비활성.
 *              우측 정의 텍스트는 길이에 따라 폰트 자동 축소 (truncate 없음 — 모든 텍스트 노출).
 *              모든 치수는 1920 baseline vw 환산. 한 화면 fit (스크롤 없음).
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

// 활성 선택 — 좌/우 어느 쪽 카드가 짝 대기중인지.
type ActiveSel = { side: "left"; idx: number } | { side: "right"; idx: number } | null;

const COLOR_CORRECT = "var(--color-mastery-master)";
const COLOR_WRONG = "rgb(var(--color-semantic-delete))";
const COLOR_DEFAULT = "var(--color-neutral-black-hex)";

/**
 * 우측 정의 텍스트 길이에 따라 폰트 크기(vw) 동적 결정.
 * 박스 안에 텍스트 전체가 들어가도록 — truncate 하지 않고 자동 축소.
 */
function getRightFontSizeVw(text: string): string {
  const len = text.length;
  if (len <= 22) return "1.25vw"; // 24px @ 1920 — 기본
  if (len <= 35) return "1.094vw"; // 21px
  if (len <= 50) return "0.938vw"; // 18px
  if (len <= 70) return "0.833vw"; // 16px
  if (len <= 100) return "0.729vw"; // 14px
  return "0.625vw"; // 12px — 매우 긴 텍스트
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
    <div
      className="flex w-full flex-col items-stretch"
      style={{ gap: "clamp(10px, 0.833vw, 22px)" /* 16/1920 */ }}
    >
      {/* 문제 텍스트 — SemiBold 36px @ 1920 + 모바일 min 18px */}
      <h1
        className="font-semibold leading-snug text-[var(--color-neutral-black-hex)] break-keep"
        style={{ fontSize: "clamp(18px, 1.875vw, 40px)" }}
      >
        {questionText || "좌측 개념을 클릭한 뒤, 우측에서 알맞은 정의를 클릭하세요."}
      </h1>

      {/* 정/오답 표시 슬롯 — 채점 전에도 자리 잡음 (레이아웃 shift 방지) */}
      <div
        className="flex w-full shrink-0 items-center"
        style={{ minHeight: "2.604vw" /* 50/1920 */ }}
      >
        {feedbackSlot}
      </div>

      {/* 3 rows — 한 화면 fit 위해 row 높이/gap 컴팩트하게 */}
      <div className="flex w-full flex-col items-stretch" style={{ gap: "1vw" /* 19/1920 */ }}>
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
              leftLetter={String.fromCharCode(65 + i)}
              leftText={leftItem}
              rightNumber={ri >= 0 ? String(ri + 1) : null}
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
  leftLetter: string;
  leftText: string;
  rightNumber: string | null;
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

// ─────────────────────────────────────────────────────────
// 시안 비율 (1920 baseline 변환):
//   row height = parallelogram height = right card height = 7.5vw (144 px)
//   left card body 5.781vw (111 px) — 우측변 slope = (313-274.1)/111 ≈ 38.9/111 = 0.35
//   노출 strip (parallelogram visible) = 7.5 - 5.781 = 1.719vw (33 px)
//
//   ★ 사선 alignment (사용자 피드백):
//     우측 카드 좌측변은 **검은 마름모 우측변(0.292)이 아니라 흰 사다리꼴(좌측 카드) 우측변(0.35)** 과
//     동일한 slope 로 매칭 → 매칭 시 두 흰 사다리꼴의 사선이 하나의 연속선처럼 보임.
//   right card path 402×144 → 좌측변 slope 50/144 ≈ 0.347 ≈ left card slope
//   매칭 시 left card 우측 상단(313, 0)과 right card 좌측 상단(313, 0) 이 정확히 일치하도록
//     marginLeft = 313 - 313 - 50(path left edge x at top) = -2.604vw (-50 px) — 오버랩
//   미매칭 시 작은 gap 으로 띄움 (marginLeft = -1vw → 시각적 gap ~31 px)
// ─────────────────────────────────────────────────────────

function MatchRow({
  leftLetter,
  leftText,
  rightNumber,
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
  const tagColor = isCorrect ? COLOR_CORRECT : isWrong ? COLOR_WRONG : COLOR_DEFAULT;
  const leftCardFill = isCorrect ? "var(--color-neutral-black-hex)" : "white";
  const leftTextColor = isCorrect ? "white" : "var(--color-neutral-black-hex)";
  const leftStrokeWidth = isLeftActive ? 3 : 1;
  const rightStrokeWidth = isRightActive ? 3 : 1;
  // 매칭 시: left card 우측변과 right card 좌측변이 연속선 → marginLeft -50px = -2.604vw (50px 오버랩).
  // 미매칭 시: 시안 339:7709 처럼 분리된 느낌 — parallelogram 우측 끝 ↔ right card 좌측 끝 사이
  //          시각적 whitespace 80px+ 확보 → marginLeft 4vw (76px).
  const rightMarginLeft = isMatched ? "-2.604vw" /* -50/1920 */ : "4vw" /* 76/1920 */;

  const leftDisabled = disabled || isLeftGrayed;
  const rightDisabled = disabled || isRightGrayed;

  const rightFontSize = rightText ? getRightFontSizeVw(rightText) : "1.25vw";

  return (
    <div
      className="relative flex w-full items-start"
      style={{ height: "7.5vw" /* 144/1920 — row = parallelogram = right card height */ }}
    >
      {/* LEFT 영역 — button 내부에 parallelogram(z:0) → card(z:1) → text(z:2) 순. */}
      <button
        type="button"
        onClick={onLeftClick}
        disabled={leftDisabled}
        aria-label={`매칭 좌측 ${leftLetter}`}
        aria-pressed={isLeftActive || isMatched}
        className={cn(
          "relative shrink-0 transition-opacity",
          leftDisabled ? "cursor-not-allowed" : "cursor-pointer",
          // opacity-30 은 '반대편 활성으로 인한 회색 비활성' 일 때만 — 채점 disabled 에는 적용 안 함
          // (적용하면 white card 도 반투명해져 뒤의 colored parallelogram 이 비침)
          isLeftGrayed && "opacity-30",
          !isMatched && !isLeftActive && !leftDisabled && "hover:opacity-80",
        )}
        style={{
          width: "16.302vw" /* 313/1920 */,
          height: "7.5vw" /* row height — letter 태그 노출 영역까지 클릭 hit */,
        }}
      >
        {/* Parallelogram letter 태그 — card BEHIND. row 전체 높이로 펼쳐 하단 정렬. */}
        <div
          className="absolute"
          style={{
            width: "9.583vw" /* 184/1920 — path width 184 */,
            height: "7.5vw" /* 144/1920 — path height 144, 비율 유지 (1.278:1) */,
            left: "9.063vw" /* 174/1920 — card 우측 끝 부근 */,
            top: 0,
            zIndex: 0,
          }}
        >
          <svg
            viewBox="0 0 184 144"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
          >
            <path d="M44 0H184L142 144H0L44 0Z" fill={tagColor} />
          </svg>
          {/* Letter — 노출된 좌하단 strip(card 가 덮지 않는 영역)에 위치. */}
          <span
            className="absolute pointer-events-none text-white"
            style={{
              // card_bottom (5.781vw = 111px) 바로 아래로 → 노출 strip 안 시작.
              top: "5.781vw" /* 111/1920 — left card bottom */,
              left: "0.78vw" /* 15/1920 — tag 좌측에서 살짝 안쪽 */,
              fontSize: "1.5vw" /* 28.8px — 33px strip 안에 fit */,
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: "'Bookk Gothic', 'Pretendard', system-ui, sans-serif",
            }}
          >
            {leftLetter}
          </span>
        </div>

        {/* Card body — parallelogram 위에 덮어 letter 상단을 가림. */}
        <svg
          viewBox="0 0 313 111"
          preserveAspectRatio="none"
          className="absolute"
          style={{
            top: 0,
            left: 0,
            width: "16.302vw",
            height: "5.781vw" /* 111/1920 */,
            zIndex: 1,
            overflow: "visible",
          }}
        >
          <path
            d="M312.297 0.5L274.144 110.5H0.5V0.5H312.297Z"
            fill={leftCardFill}
            stroke="var(--color-neutral-black-hex)"
            strokeWidth={leftStrokeWidth}
          />
        </svg>

        {/* Card text */}
        <span
          className="absolute flex items-center text-left break-keep"
          style={{
            top: 0,
            left: "1.615vw" /* 31/1920 */,
            right: "3.333vw" /* 64/1920 — 우측 사선 영역 비움 */,
            height: "5.781vw",
            fontSize: "1.25vw" /* 24/1920 */,
            fontWeight: 700,
            color: leftTextColor,
            lineHeight: 1.2,
            zIndex: 2,
          }}
        >
          {leftText}
        </span>
      </button>

      {/* RIGHT 영역 — 좌측변 slope 0.347 (LEFT CARD 우측변과 동일) → 매칭 시 연속선. */}
      <button
        type="button"
        onClick={onRightClick}
        disabled={rightDisabled}
        aria-label={`매칭 우측 ${rightNumber ?? "-"}`}
        aria-pressed={isRightActive || isMatched}
        className={cn(
          "relative shrink-0 transition-opacity",
          rightDisabled ? "cursor-not-allowed" : "cursor-pointer",
          // opacity-30 은 회색 비활성 일 때만 (채점 후 disabled 에는 적용 X —
          //   white card 가 colored parallelogram 을 완전히 가려야 정의 영역에 색 침범 X)
          isRightGrayed && "opacity-30",
          !isMatched && !isRightActive && !rightDisabled && "hover:opacity-80",
        )}
        style={{
          width: "20.938vw" /* 402/1920 */,
          height: "7.5vw" /* 144/1920 — row 높이와 동일 */,
          marginLeft: rightMarginLeft,
        }}
      >
        <svg
          viewBox="0 0 402 144"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          {/* 좌측변 slope = 50/144 ≈ 0.347 (LEFT CARD 우측변 38.9/111 = 0.35 과 매칭) */}
          <path
            d="M0 144L50 0L402 0L402 144L0 144Z"
            fill="white"
            stroke="var(--color-neutral-black-hex)"
            strokeWidth={rightStrokeWidth}
          />
        </svg>
        {/* 본문 텍스트 — 길이에 따라 폰트 자동 축소 (truncate 없음). */}
        <span
          className="absolute flex items-center text-left break-keep overflow-hidden"
          style={{
            // 좌측 padding: 사다리꼴 좌측변 top 정점(x=50 in path = 2.604vw)에서 ~2vw 안쪽으로 들여 사선 침범 방지.
            //   기존 3vw 는 path TL(2.604vw)과 0.4vw 차이라 viewport 작거나 sub-pixel rounding 시 텍스트가 사선 밖으로 새던 버그.
            left: "4.5vw" /* 86/1920 — 우측 padding 과 대칭, 사다리꼴 안쪽 명확 여백 */,
            right: "4.5vw" /* 86/1920 — number 영역(80px) + buffer 비움 */,
            top: "0.625vw" /* 12/1920 */,
            bottom: "0.625vw",
            fontSize: rightFontSize,
            fontWeight: 400,
            color: "var(--color-neutral-black-hex)",
            lineHeight: 1.25,
          }}
        >
          {rightText ?? ""}
        </span>
        {/* Number — 항상 단순 검정 텍스트 (채점 시 색상 강조는 좌측 letter 만 수행). */}
        {rightNumber ? (
          <span
            className="absolute pointer-events-none text-[var(--color-neutral-black-hex)]"
            style={{
              right: "1vw" /* 19/1920 */,
              bottom: "0.625vw" /* 12/1920 */,
              fontSize: "1.5vw",
              fontWeight: 700,
              lineHeight: 1,
              fontFamily: "'Bookk Gothic', 'Pretendard', system-ui, sans-serif",
            }}
          >
            {rightNumber}
          </span>
        ) : null}
      </button>
    </div>
  );
}
