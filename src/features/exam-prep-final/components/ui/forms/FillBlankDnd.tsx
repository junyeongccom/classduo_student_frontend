/**
 * @file FillBlankDnd.tsx
 * @description 빈칸채우기 공통 컴포넌트 (dnd-kit). 단어 칩을 빈칸에 드래그.
 *              question_text 의 ___ 시퀀스를 빈칸 위치로 파싱 → 빈칸 N개 배치.
 *              5지선다 1개 빈칸 (시안 339:8328):
 *                - 상단 3 chips + 하단 2 chips 를 **absolute 위치** 로 스캐터 배치
 *                  (justify-around 같은 균등 정렬 X — 시안처럼 흩어진 느낌).
 *                - 문장 박스는 넓은 padding 으로 시원하게.
 *                - 문장 내부는 flex-wrap 이 아니라 일반 <p> + inline-flex blank → 단어 단위 자연 wrap.
 *              7지선다 2개 빈칸: 기존 flex-wrap (placed 항목 collapse).
 *              빈칸 시각:
 *                - 비어있음: 검정 placeholder
 *                - 채워짐: 칩과 동일 회색 bg + 중앙 정렬 텍스트
 *                - 채점 정답: bg 그대로 + 텍스트만 파랑 (mastery-master)
 *                - 채점 오답: bg 그대로 + 텍스트만 빨강 (semantic-delete)
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies @dnd-kit/core
 */
"use client";

import { Fragment, useMemo, useState } from "react";
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

import { cn } from "@/shared/lib/utils";

// 마우스 포인터가 droppable 영역 안이면 그 droppable 선택. 포인터가 어떤 droppable 위에도 없으면
// 박스끼리 겹치는 droppable 로 폴백.
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
};

// 칩 위치 — 좌측 % 와 세로 offset. 가운데 칩을 raise 해서 "흩어진 느낌".
type ChipPos = { left: string; top: string };

// 5지선다 1개 빈칸 — 상단 3 + 하단 2.
const TOP_5: ChipPos[] = [
  { left: "15%", top: "1vw" }, // 좌
  { left: "50%", top: "0" },   // 중앙 (raised)
  { left: "82%", top: "1vw" }, // 우
];
const BOTTOM_5: ChipPos[] = [
  { left: "32%", top: "0" },
  { left: "62%", top: "0" },
];

// 7지선다 2개 빈칸 — 상단 4 + 하단 3.
const TOP_7: ChipPos[] = [
  { left: "12%", top: "1vw" },
  { left: "38%", top: "0" },   // raised
  { left: "62%", top: "1vw" },
  { left: "88%", top: "0" },   // raised
];
const BOTTOM_7: ChipPos[] = [
  { left: "20%", top: "1vw" },
  { left: "50%", top: "0" },   // 중앙 (raised)
  { left: "80%", top: "1vw" },
];

// 칩 행 container 높이 — chip height (~2.76vw) + max offset (1vw) + 약간 여유. 모바일 min 56px.
const CHIP_ROW_HEIGHT = "clamp(56px, 3.75vw, 88px)";

/**
 * 선지 폰트 크기 자동 축소 — scatter 레이아웃 칩들이 길어지면 서로 겹치는 문제 해결.
 * 기준 길이 8자 이하는 1.0, 그 이상은 linear 감소. 최소 0.55 까지.
 * 16자 ≈ 0.78, 20자 ≈ 0.62, 24자 ≈ 0.55(cap).
 */
function computeChipFontScale(choices: string[]): number {
  if (choices.length === 0) return 1;
  const maxLen = Math.max(...choices.map((c) => c.length));
  if (maxLen <= 8) return 1;
  return Math.max(0.55, 1 - (maxLen - 8) * 0.03);
}

/** scale factor 적용된 clamp() 문자열 생성 — fontSize 일관성 위해 chip/blank/overlay 공유. */
function scaledFontClamp(scale: number): string {
  const minPx = 14 * scale;
  const vw = 1.5 * scale;
  const maxPx = 32 * scale;
  return `clamp(${minPx.toFixed(1)}px, ${vw.toFixed(3)}vw, ${maxPx.toFixed(1)}px)`;
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
}: FillBlankDndProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );
  const [draggingChipIdx, setDraggingChipIdx] = useState<number | null>(null);

  // 선지 길이에 따른 폰트 스케일 — 모든 chip / blank / drag overlay 에 동일 적용해 시각 일관성 유지.
  const fontScale = useMemo(() => computeChipFontScale(choices), [choices]);
  const chipFontSize = useMemo(() => scaledFontClamp(fontScale), [fontScale]);

  // 스캐터 레이아웃 적용 — 5지/1빈칸, 7지/2빈칸.
  const scatterLayout: { top: ChipPos[]; bottom: ChipPos[] } | null =
    choices.length === 5 && blanksCount === 1
      ? { top: TOP_5, bottom: BOTTOM_5 }
      : choices.length === 7 && blanksCount === 2
        ? { top: TOP_7, bottom: BOTTOM_7 }
        : null;
  const useScatterLayout = scatterLayout !== null;

  const parts = useMemo(() => questionText.split(/_{2,}/), [questionText]);

  const usedChipIndexes = new Set(value.filter((v): v is number => v !== null));
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

  const correctIndexes = useMemo(() => {
    if (correctAnswer === null || correctAnswer === undefined) return [];
    if (Array.isArray(correctAnswer)) return correctAnswer as number[];
    return [correctAnswer];
  }, [correctAnswer]);

  const draggingLabel = draggingChipIdx !== null ? choices[draggingChipIdx] : null;

  // 스캐터 배치 — chip 의 절대 위치에 렌더 (placed 면 null → 사라짐).
  const renderChipAtPosition = (idx: number, pos: ChipPos) => {
    const isPlaced = usedChipIndexes.has(idx);
    if (isPlaced) return null;
    const isEliminatedHint = eliminatedIdx === idx && !isCorrect && isCorrect !== false;
    return (
      <div
        key={idx}
        className="absolute"
        style={{
          left: pos.left,
          top: pos.top,
          transform: "translateX(-50%)",
        }}
      >
        <DraggableChip
          chipIdx={idx}
          label={choices[idx]}
          disabled={disabled || eliminatedIdx === idx}
          eliminated={isEliminatedHint}
          fontSize={chipFontSize}
        />
      </div>
    );
  };

  // 문장 박스 — 시원한 padding + 단어 단위 자연 wrap (flex 아님).
  // padding/line-height 는 한 화면 fit 위해 컴팩트하게 (특히 7-다중 3줄 wrap 대비).
  const sentenceBox = (
    <div
      className="w-full rounded-md bg-white"
      style={{
        border: "max(2px, 0.156vw) solid var(--color-neutral-black-hex)" /* 3/1920 */,
        padding: "clamp(14px, 1.667vw, 36px) clamp(16px, 2.5vw, 56px)" /* 32/48 px @ 1920 */,
        minHeight: "clamp(80px, 6vw, 140px)" /* 115/1920 */,
      }}
    >
      <p
        className="break-keep text-[var(--color-neutral-black-hex)]"
        style={{
          fontSize: "clamp(16px, 1.667vw, 36px)" /* 32/1920 */,
          lineHeight: 1.5,
          wordBreak: "keep-all" as const,
        }}
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
                  chipLabel={
                    value[blankIdx] !== null ? choices[value[blankIdx] as number] : null
                  }
                  onClear={() => clearBlank(blankIdx)}
                  disabled={disabled}
                  isCorrect={
                    typeof isCorrect === "boolean"
                      ? isCorrect && correctIndexes.includes(value[blankIdx] as number)
                      : null
                  }
                  fontSize={chipFontSize}
                />
              ) : null}
            </Fragment>
          );
        })}
      </p>
    </div>
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerCollisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex w-full flex-col" style={{ gap: "clamp(12px, 1.04vw, 24px)" /* 20/1920 */ }}>
        <h1
          className="font-semibold leading-snug text-[var(--color-neutral-black-hex)] break-keep"
          style={{ fontSize: "clamp(18px, 1.875vw, 40px)" /* 36/1920 */ }}
        >
          아래 문장에 알맞은 단어를 드래그하여 넣으세요.
        </h1>
        <div
          className="flex w-full shrink-0 items-center"
          style={{ minHeight: "clamp(32px, 2.604vw, 60px)" /* 50/1920 */ }}
        >
          {feedbackSlot}
        </div>

        {useScatterLayout && scatterLayout ? (
          <div
            className="flex w-full flex-col items-stretch"
            style={{ gap: "clamp(10px, 0.833vw, 22px)" /* 16/1920 — 컴팩트 */ }}
          >
            {/* 상단 chips — absolute scattered */}
            <div className="relative w-full" style={{ height: CHIP_ROW_HEIGHT }}>
              {scatterLayout.top.map((pos, i) => renderChipAtPosition(i, pos))}
            </div>
            {sentenceBox}
            {/* 하단 chips — absolute scattered */}
            <div className="relative w-full" style={{ height: CHIP_ROW_HEIGHT }}>
              {scatterLayout.bottom.map((pos, i) =>
                renderChipAtPosition(scatterLayout.top.length + i, pos),
              )}
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col" style={{ gap: "clamp(14px, 1.5vw, 32px)" }}>
            <div className="flex flex-wrap" style={{ gap: "clamp(10px, 1vw, 22px)" /* 19/1920 */ }}>
              {availableChips.map((c) => (
                <DraggableChip
                  key={c.idx}
                  chipIdx={c.idx}
                  label={c.label}
                  disabled={disabled || eliminatedIdx === c.idx}
                  eliminated={eliminatedIdx === c.idx && !isCorrect && isCorrect !== false}
                  fontSize={chipFontSize}
                />
              ))}
            </div>
            {sentenceBox}
          </div>
        )}
      </div>
      <DragOverlay>
        {draggingLabel ? (
          <span
            className="select-none rounded-md bg-[rgb(var(--color-neutral-gray-100))] font-medium text-[var(--color-neutral-black-hex)] shadow-md"
            style={{
              padding: "clamp(8px, 0.625vw, 14px) clamp(14px, 1.5vw, 32px)",
              fontSize: chipFontSize,
              lineHeight: 1.2,
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
}: {
  chipIdx: number;
  label: string;
  disabled?: boolean;
  eliminated?: boolean;
  /** 부모(FillBlankDnd) 가 choices 길이 기반으로 계산해 일관 적용. */
  fontSize: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `chip-${chipIdx}`,
    disabled,
  });
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      type="button"
      disabled={disabled}
      aria-label={eliminated ? "힌트로 제거된 선택지" : undefined}
      style={{
        opacity: isDragging ? 0 : 1,
        touchAction: "none",
        padding: "clamp(8px, 0.625vw, 14px) clamp(14px, 1.5vw, 32px)" /* 12/29 px @ 1920 */,
        minWidth: "clamp(72px, 7vw, 160px)" /* 134/1920 — 한글 4~5자 까지 nowrap 으로 fit */,
        fontSize,
        lineHeight: 1.2,
        whiteSpace: "nowrap" as const,
      }}
      className={cn(
        "select-none rounded-md bg-[rgb(var(--color-neutral-gray-100))] text-center font-medium text-[var(--color-neutral-black-hex)]",
        !disabled && "cursor-grab active:cursor-grabbing",
        disabled && !eliminated && "opacity-60",
        eliminated && "cursor-not-allowed opacity-30 line-through",
      )}
    >
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
  fontSize,
}: {
  blankIdx: number;
  chipIdx: number | null;
  chipLabel: string | null;
  onClear: () => void;
  disabled?: boolean;
  isCorrect: boolean | null;
  /** 부모(FillBlankDnd) 가 choices 길이 기반으로 계산해 일관 적용. */
  fontSize: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `blank-${blankIdx}` });
  const isEmpty = chipIdx === null;
  const textColor =
    isCorrect === true
      ? "var(--color-mastery-master)"
      : isCorrect === false
        ? "rgb(var(--color-semantic-delete))"
        : "var(--color-neutral-black-hex)";
  return (
    <span
      ref={setNodeRef}
      onClick={onClear}
      style={{
        // inline-flex 로 문장 안에서 자연스럽게 흐름.
        display: "inline-flex",
        verticalAlign: "middle",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        // 칩과 동일 dimension/스타일 + nowrap.
        padding: "clamp(8px, 0.625vw, 14px) clamp(14px, 1.5vw, 32px)" /* 12/29 px @ 1920 */,
        minWidth: "clamp(72px, 7vw, 160px)" /* 134/1920 — 칩과 매칭, 빈상태도 충분히 보이는 크기 */,
        fontSize,
        lineHeight: 1.2,
        whiteSpace: "nowrap" as const,
        // 빈칸: 검정. 채워짐: 칩과 동일 회색.
        backgroundColor: isEmpty
          ? "var(--color-neutral-black-hex)"
          : "rgb(var(--color-neutral-gray-100))",
        color: isEmpty ? "transparent" : textColor,
        fontWeight: isCorrect === true || isCorrect === false ? 700 : 500,
        margin: "0 4px" /* 약간의 좌우 여유 */,
      }}
      className={cn(
        "select-none rounded-md cursor-pointer transition-colors",
        isOver && isEmpty && "ring-2 ring-[var(--color-mastery-master)]",
        disabled && "cursor-not-allowed",
      )}
    >
      {chipLabel ?? " "}
    </span>
  );
}
