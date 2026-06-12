/**
 * @file FillBlankDnd.tsx
 * @description 빈칸채우기 공통 컴포넌트 (dnd-kit). 디자이너 시안(B2B) 매칭.
 *              - 상단 지시문 + 가운데 큰 문장(인라인 빈칸 박스) + 하단 흰 그림자 pill 칩.
 *              - 칩은 content-sized + flex-wrap(justify-center) →
 *                  5지선다: 짧은 선지는 한 줄(5개), 길어지면 자연스럽게 여러 행(≈2열).
 *                  7지선다: 폭에 맞춰 4+3 행으로 wrap.
 *              - 빈칸: 흰 라운드 박스(빈 상태=옅은 보더). 채움=칩 텍스트. 채점=텍스트 색만 변경.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies @dnd-kit/core
 */
"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";

const C_BLACK = "var(--color-neutral-black-hex)";
const C_CANVAS_FG = "var(--color-exam-canvas-fg)"; // 캔버스 직속 텍스트(지시문·문장) — 다크 반전
const C_MASTER = "var(--color-mastery-master)";
const C_DELETE = "rgb(var(--color-semantic-delete))";
const WRONG_BG = "rgba(244, 63, 94, 0.08)"; // 연빨강 (wrong 빈칸 배경)

const pointerCollisionDetection: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  if (pointer.length > 0) return pointer;
  return rectIntersection(args);
};

export type FillBlankDndProps = {
  questionText: string;
  choices: string[];
  blanksCount: number; // 1 or 2
  value: (number | null)[];
  onChange: (value: (number | null)[]) => void;
  disabled?: boolean;
  correctAnswer?: number | number[] | null;
  isCorrect?: boolean;
  eliminatedIdx?: number;
  feedbackSlot?: React.ReactNode;
  /** Active Recall 게이트 — 제공되면 하단 칩(선지) 풀 대신 이 노드를 렌더(문장은 유지). */
  recallSlot?: React.ReactNode;
  /** 모바일(<768px) — cqw 대신 fluid px 레이아웃. */
  mobile?: boolean;
};

/** 치수 토큰 — 데스크탑 cqw(1620 baseline) / 모바일 고정 px. */
type SizingFB = {
  rootGap: string;
  instr: string;
  feedbackMinH: string;
  sentenceGap: string;
  sentenceFs: string;
  /** 본문 줄간격 — 채워진 빈칸 pill 이 윗/아랫줄과 겹치지 않게 충분히 띄운다. */
  sentenceLineHeight: number;
  sentenceMaxW: string;
  chipPad: string;
  chipMinW: string;
  chipMaxW: string;
  chipBorderHi: string;
  chipRadius: string;
  chipShadow: string;
  blankPad: string;
  blankMinWEmpty: string;
  blankMinWFilled: string;
  blankMargin: string;
  blankBorderCorrect: string;
  blankBorderNormal: string;
  blankRadius: string;
  badgeTop: string;
  badgeLeft: string;
  badgeSize: string;
  badgeFs: string;
  containerGap: string;
};
const DESKTOP_FB: SizingFB = {
  rootGap: "1.233cqw",
  instr: "2.222cqw",
  feedbackMinH: "3.390cqw",
  sentenceGap: "1.481cqw",
  sentenceFs: "1.976cqw",
  sentenceLineHeight: 1.7,
  sentenceMaxW: "57.531cqw",
  chipPad: "1.363cqw 1.778cqw",
  chipMinW: "8.083cqw",
  chipMaxW: "23.704cqw",
  chipBorderHi: "0.185cqw",
  chipRadius: "0.711cqw",
  chipShadow: "0 0.119cqw 0.593cqw rgba(17,24,39,0.12)",
  blankPad: "0.711cqw 1.659cqw",
  blankMinWEmpty: "12.207cqw",
  blankMinWFilled: "5cqw",
  blankMargin: "0 0.474cqw",
  blankBorderCorrect: "0.185cqw",
  blankBorderNormal: "0.095cqw",
  blankRadius: "0.593cqw",
  badgeTop: "-0.864cqw",
  badgeLeft: "-0.802cqw",
  badgeSize: "1.728cqw",
  badgeFs: "0.988cqw",
  containerGap: "1.363cqw",
};
const MOBILE_FB: SizingFB = {
  rootGap: "12px",
  instr: "20px",
  feedbackMinH: "28px",
  sentenceGap: "16px",
  sentenceFs: "16px",
  sentenceLineHeight: 2.3,
  sentenceMaxW: "100%",
  chipPad: "9px 13px",
  chipMinW: "60px",
  chipMaxW: "160px",
  chipBorderHi: "2px",
  chipRadius: "8px",
  chipShadow: "0 1px 5px rgba(17,24,39,0.12)",
  blankPad: "5px 10px",
  blankMinWEmpty: "78px",
  blankMinWFilled: "32px",
  blankMargin: "0 4px",
  blankBorderCorrect: "2px",
  blankBorderNormal: "1px",
  blankRadius: "5px",
  badgeTop: "-9px",
  badgeLeft: "-8px",
  badgeSize: "18px",
  badgeFs: "11px",
  containerGap: "10px",
};

/** 선지 길이에 따른 폰트 스케일 — 긴 선지일수록 약간 축소(겹침 방지). */
function computeChipFontScale(choices: string[]): number {
  if (choices.length === 0) return 1;
  const maxLen = Math.max(...choices.map((c) => c.length));
  if (maxLen <= 8) return 1;
  return Math.max(0.62, 1 - (maxLen - 8) * 0.03);
}

export function FillBlankDnd({
  questionText,
  choices,
  blanksCount,
  value,
  onChange,
  disabled,
  correctAnswer,
  isCorrect,
  eliminatedIdx,
  feedbackSlot,
  recallSlot,
  mobile = false,
}: FillBlankDndProps) {
  const SZ = mobile ? MOBILE_FB : DESKTOP_FB;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );
  const [draggingChipIdx, setDraggingChipIdx] = useState<number | null>(null);
  // 드래그 종료 직후 발생하는 합성 click 으로 탭-채우기가 중복 발동하는 것을 막는 가드.
  const dragJustEndedRef = useRef(false);

  const fontScale = useMemo(() => computeChipFontScale(choices), [choices]);
  const chipFontSize = mobile
    ? `${(14 * fontScale).toFixed(1)}px`
    : `${(1.5 * fontScale).toFixed(3)}cqw`;

  const parts = useMemo(() => questionText.split(/_{2,}/), [questionText]);

  // 채점 완료 여부 (isCorrect 가 boolean 으로 도착).
  const graded = typeof isCorrect === "boolean";
  const correctIndexes = useMemo(() => {
    if (correctAnswer === null || correctAnswer === undefined) return [];
    if (Array.isArray(correctAnswer)) return correctAnswer as number[];
    return [correctAnswer];
  }, [correctAnswer]);
  const correctSet = useMemo(
    () => new Set(correctIndexes.filter((x): x is number => typeof x === "number")),
    [correctIndexes],
  );

  // 하단 칩 풀에서 숨길 칩(=빈칸에 놓인 칩). 단, 채점 후 정답 칩을 '제 위치가 아닌'
  // 빈칸에 잘못 넣은 경우엔 풀에 남겨 정답(순서 배지)으로 다시 노출한다. (오배치된 정답 누락 방지)
  const usedChipIndexes = new Set<number>();
  value.forEach((v, i) => {
    if (v === null) return;
    // 전체 정답이면(순서무관 swap 포함) 배치를 그대로 인정 → 칩 숨김.
    // 오답일 때만 '제 위치 아닌' 칸의 정답 칩을 풀에 남겨 정답으로 재노출.
    if (graded && isCorrect !== true && correctSet.has(v) && correctIndexes[i] !== v) return;
    usedChipIndexes.add(v);
  });
  const availableChips = choices
    .map((label, idx) => ({ label, idx }))
    .filter((c) => !usedChipIndexes.has(c.idx));

  const onDragStart = (e: DragStartEvent) => {
    const id = e.active.id;
    if (typeof id !== "string") return;
    const idx = parseInt(id.replace("chip-", ""), 10);
    if (!Number.isNaN(idx)) setDraggingChipIdx(idx);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setDraggingChipIdx(null);
    // 실제 드래그가 끝났음을 기록 → 직후의 합성 click(탭-채우기)을 1틱 동안 무시.
    dragJustEndedRef.current = true;
    setTimeout(() => {
      dragJustEndedRef.current = false;
    }, 0);
    if (disabled) return;
    if (!e.over) return;
    const overId = e.over.id;
    const activeId = e.active.id;
    if (typeof overId !== "string" || typeof activeId !== "string") return;
    const blankIdx = parseInt(overId.replace("blank-", ""), 10);
    const chipIdx = parseInt(activeId.replace("chip-", ""), 10);
    if (Number.isNaN(blankIdx) || Number.isNaN(chipIdx)) return;
    const next = [...value];
    next.forEach((v, i) => {
      if (v === chipIdx) next[i] = null;
    });
    next[blankIdx] = chipIdx;
    onChange(next);
  };

  const clearBlank = (blankIdx: number) => {
    if (disabled) return;
    const next = [...value];
    next[blankIdx] = null;
    onChange(next);
  };

  // 모바일 탭-채우기: 칩을 탭하면 첫 번째 빈 칸을 채운다(모두 차 있으면 무시 — 칸 탭으로 해제 후 재선택).
  const fillFirstEmptyBlank = (chipIdx: number) => {
    if (disabled) return;
    if (dragJustEndedRef.current) return; // 드래그 직후 합성 click 방어
    const firstEmpty = value.findIndex((v) => v === null);
    if (firstEmpty === -1) return;
    const next = [...value];
    next.forEach((v, i) => {
      if (v === chipIdx) next[i] = null; // 혹시 다른 칸에 있던 칩이면 제거(중복 방지)
    });
    next[firstEmpty] = chipIdx;
    onChange(next);
  };

  // 빈칸별 정/오답: 전체 정답이면 모든 칸을 정답으로(순서무관 문항이 swap 으로 정답인 경우 포함),
  // 아니면 위치별 일치(value[i]===correctIndexes[i]) — 한 칸만 맞아도 그 칸은 정답(시안).
  // 정답 choice index → 빈칸 위치(0-based). 순서 배지 번호 = position+1. (정답 선지에 1·2 배지)
  const choicePosition = useMemo(() => {
    const m = new Map<number, number>();
    correctIndexes.forEach((ci, i) => {
      if (typeof ci === "number" && !m.has(ci)) m.set(ci, i);
    });
    return m;
  }, [correctIndexes]);

  const draggingLabel = draggingChipIdx !== null ? choices[draggingChipIdx] : null;

  // 칩 배치 — 5지선다(빈칸 1개): 짧으면 1행(5개), 길면 2열 그리드(시안/요청).
  // 그 외(7지 등): content-sized flex-wrap (폭에 맞춰 4+3 등).
  const maxChoiceLen = choices.reduce((m, c) => Math.max(m, c.length), 0);
  const fiveSingle = blanksCount === 1 && choices.length === 5;
  const chipContainerStyle: React.CSSProperties = mobile
    ? // 모바일: 칩 폭이 작아 그리드 강제 불필요 — flex-wrap 가운데 정렬.
      {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: SZ.containerGap,
        maxWidth: "100%",
        margin: "0 auto",
      }
    : fiveSingle && maxChoiceLen <= 5
      ? { display: "grid", gridTemplateColumns: "repeat(5, max-content)", justifyContent: "center", gap: "1.363cqw" }
      : fiveSingle
        ? {
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            justifyItems: "center",
            columnGap: "1.896cqw",
            rowGap: "1.363cqw",
            maxWidth: "42.667cqw",
            margin: "0 auto",
          }
        : { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: "1.363cqw", maxWidth: "57.963cqw" /* figma 선지 프레임 939px */, margin: "0 auto" };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerCollisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-full w-full flex-col" style={{ gap: SZ.rootGap }}>
        {/* 지시문 */}
        <h1 className="font-semibold leading-snug break-keep" style={{ fontSize: SZ.instr, color: C_CANVAS_FG }}>
          빈칸에 들어갈 알맞은 단어를 넣으세요.
        </h1>
        <div className="flex w-full shrink-0 items-center" style={{ minHeight: SZ.feedbackMinH /* figma 정오답칸 55px */ }}>
          {feedbackSlot}
        </div>

        {/* 문장 + 칩 — figma 문제영역(942:10284) 오토레이아웃 items-center: 가로 중앙 + 위쪽 정렬, 보기패널~선지 24px */}
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start" style={{ gap: SZ.sentenceGap }}>
          {/* 문장 (인라인 빈칸) */}
          <p
            className="w-full break-keep text-left"
            style={{ fontSize: SZ.sentenceFs, lineHeight: SZ.sentenceLineHeight, maxWidth: SZ.sentenceMaxW /* figma 보기패널 텍스트 932px */, color: C_CANVAS_FG }}
          >
            {parts.map((text, i) => {
              const isLastPart = i === parts.length - 1;
              const blankIdx = i;
              const hasBlank = !isLastPart && blankIdx < blanksCount;
              return (
                <Fragment key={i}>
                  {text}
                  {hasBlank ? (
                    <DroppableBlank
                      blankIdx={blankIdx}
                      chipIdx={value[blankIdx]}
                      chipLabel={value[blankIdx] !== null ? choices[value[blankIdx] as number] : null}
                      onClear={() => clearBlank(blankIdx)}
                      disabled={disabled}
                      isCorrect={
                        graded
                          ? value[blankIdx] !== null &&
                            (isCorrect === true ||
                              value[blankIdx] === correctIndexes[blankIdx])
                          : null
                      }
                      orderNo={blankIdx + 1}
                      fontSize={chipFontSize}
                      sz={SZ}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </p>

          {/* Active Recall 게이트면 칩(선지) 풀 대신 박스 노출 (문장은 위에 유지). */}
          {recallSlot ? (
            recallSlot
          ) : (
            /* 칩 — 5지: 짧으면 1행/길면 2열, 그 외: wrap (chipContainerStyle). */
            <div className="w-full" style={chipContainerStyle}>
              {availableChips.map((c) => (
                <DraggableChip
                  key={c.idx}
                  chipIdx={c.idx}
                  label={c.label}
                  disabled={disabled || eliminatedIdx === c.idx}
                  eliminated={eliminatedIdx === c.idx && !isCorrect && isCorrect !== false}
                  fontSize={chipFontSize}
                  highlight={graded && correctIndexes.includes(c.idx)}
                  orderNo={graded && choicePosition.has(c.idx) ? (choicePosition.get(c.idx) as number) + 1 : undefined}
                  sz={SZ}
                  onSelect={mobile ? () => fillFirstEmptyBlank(c.idx) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {draggingLabel ? (
          <span
            className="select-none bg-white font-medium shadow-lg"
            style={{
              padding: SZ.chipPad,
              borderRadius: SZ.chipRadius,
              fontSize: chipFontSize,
              lineHeight: 1.2,
              color: C_BLACK,
            }}
          >
            {draggingLabel}
          </span>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DraggableChip({
  chipIdx,
  label,
  disabled,
  eliminated,
  fontSize,
  highlight,
  orderNo,
  sz,
  onSelect,
}: {
  chipIdx: number;
  label: string;
  disabled?: boolean;
  eliminated?: boolean;
  fontSize: string;
  highlight?: boolean;
  /** 정답 선지일 때 표시할 순서 번호(1-based). */
  orderNo?: number;
  sz: SizingFB;
  /** 모바일 탭-채우기 — 제공되면 칩 탭 시 첫 빈칸 채움(드래그도 그대로 동작). */
  onSelect?: () => void;
}) {
  const t = useTranslations("examPrepFinal");
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${chipIdx}`,
    disabled,
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      type="button"
      disabled={disabled}
      aria-label={eliminated ? t("solve.eliminatedChoice") : undefined}
      style={{
        position: "relative",
        opacity: isDragging ? 0 : eliminated ? 0.45 : 1,
        touchAction: "none",
        padding: sz.chipPad /* figma 칩 높이 66px */,
        minWidth: sz.chipMinW /* figma 131px */,
        maxWidth: sz.chipMaxW,
        borderRadius: sz.chipRadius,
        fontSize,
        lineHeight: 1.2,
        whiteSpace: "nowrap" as const,
        color: highlight ? C_MASTER : C_BLACK,
        border: highlight
          ? `${sz.chipBorderHi} solid var(--color-mastery-master)` /* figma 정답 3px 보라 */
          : `${sz.blankBorderNormal} solid transparent`,
        boxShadow: sz.chipShadow,
      }}
      className={cn(
        "select-none bg-white text-center font-medium",
        !disabled && "cursor-grab active:cursor-grabbing hover:shadow-md",
        disabled && !eliminated && "opacity-60",
        eliminated && "cursor-not-allowed",
      )}
    >
      {highlight && orderNo !== undefined ? <OrderBadge n={orderNo} sz={sz} /> : null}
      {label}
    </button>
  );
}

function DroppableBlank({
  blankIdx,
  chipIdx,
  chipLabel,
  onClear,
  disabled,
  isCorrect,
  orderNo,
  fontSize,
  sz,
}: {
  blankIdx: number;
  chipIdx: number | null;
  chipLabel: string | null;
  onClear: () => void;
  disabled?: boolean;
  isCorrect: boolean | null;
  /** 정답 빈칸일 때 표시할 순서 번호(1-based). */
  orderNo?: number;
  fontSize: string;
  sz: SizingFB;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `blank-${blankIdx}` });
  const isEmpty = chipIdx === null;
  // 시안: 정답=보라 텍스트 / 오답=빨강 / 미채점=검정
  const textColor =
    isCorrect === false ? C_DELETE : isCorrect === true ? C_MASTER : C_BLACK;
  return (
    <span
      ref={setNodeRef}
      onClick={onClear}
      style={{
        position: "relative",
        display: "inline-flex",
        verticalAlign: "middle",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "center",
        padding: sz.blankPad /* 세로 축소 — 빈칸이 문장 줄과 겹치지 않게 거리 확보 */,
        minWidth: isEmpty ? sz.blankMinWEmpty /* figma 198px (빈칸) */ : sz.blankMinWFilled /* 채우면 단어 길이에 맞게 */,
        margin: sz.blankMargin,
        borderRadius: sz.blankRadius,
        fontSize,
        lineHeight: 1.2,
        whiteSpace: "nowrap" as const,
        backgroundColor: isCorrect === false ? WRONG_BG : "#ffffff",
        border:
          isCorrect === true
            ? `${sz.blankBorderCorrect} solid ${C_MASTER}` /* 정답: 흰 배경 + 보라 3px 테두리 (figma) */
            : `${sz.blankBorderNormal} solid ${isEmpty ? "rgb(209 213 219)" : "transparent"}`,
        boxShadow: isEmpty ? "inset 0 0.095cqw 0.356cqw rgba(17,24,39,0.06)" : "0 0.119cqw 0.474cqw rgba(17,24,39,0.1)",
        color: isEmpty ? "transparent" : textColor,
        fontWeight: isCorrect === true ? 600 : isCorrect === false ? 400 : 500,
      }}
      className={cn(
        "select-none cursor-pointer transition-colors",
        isOver && isEmpty && "ring-2 ring-[var(--color-mastery-master)]",
        disabled && "cursor-not-allowed",
      )}
    >
      {isCorrect === true && orderNo !== undefined ? <OrderBadge n={orderNo} sz={sz} /> : null}
      {chipLabel ?? " "}
    </span>
  );
}

/** 정답 칩/빈칸 좌상단 순서 번호 배지 — figma 28px 보라 원 + 흰 16px 숫자, 모서리에 걸침. */
function OrderBadge({ n, sz }: { n: number; sz: SizingFB }) {
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        top: sz.badgeTop /* figma: 칩 좌상단 모서리 (-14px) */,
        left: sz.badgeLeft /* -13px */,
        width: sz.badgeSize /* figma 28px */,
        height: sz.badgeSize,
        borderRadius: "9999px",
        backgroundColor: C_MASTER,
        color: "#ffffff",
        fontSize: sz.badgeFs /* figma 16px */,
        fontWeight: 600,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 0.119cqw 0.356cqw rgba(0,0,0,0.18)",
        pointerEvents: "none",
      }}
    >
      {n}
    </span>
  );
}
