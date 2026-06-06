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

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/utils";

const C_BLACK = "var(--color-neutral-black-hex)";
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
}: FillBlankDndProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );
  const [draggingChipIdx, setDraggingChipIdx] = useState<number | null>(null);

  const fontScale = useMemo(() => computeChipFontScale(choices), [choices]);
  const chipFontSize = `${(1.5 * fontScale).toFixed(3)}cqw`;

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

  // 칩 배치 — 5지선다(빈칸 1개): 짧으면 1행(5개), 길면 2열 그리드(시안/요청).
  // 그 외(7지 등): content-sized flex-wrap (폭에 맞춰 4+3 등).
  const maxChoiceLen = choices.reduce((m, c) => Math.max(m, c.length), 0);
  const fiveSingle = blanksCount === 1 && choices.length === 5;
  const chipContainerStyle: React.CSSProperties =
    fiveSingle && maxChoiceLen <= 5
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
      <div className="flex h-full w-full flex-col" style={{ gap: "1.233cqw" }}>
        {/* 지시문 */}
        <h1 className="font-semibold leading-snug break-keep" style={{ fontSize: "2.222cqw", color: C_BLACK }}>
          빈칸에 들어갈 알맞은 단어를 넣으세요.
        </h1>
        <div className="flex w-full shrink-0 items-center" style={{ minHeight: "3.390cqw" /* figma 정오답칸 55px */ }}>
          {feedbackSlot}
        </div>

        {/* 문장 + 칩 — figma 문제영역(942:10284) 오토레이아웃 items-center: 가로 중앙 + 위쪽 정렬, 보기패널~선지 24px */}
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-start" style={{ gap: "1.481cqw" }}>
          {/* 문장 (인라인 빈칸) */}
          <p
            className="w-full break-keep text-left"
            style={{ fontSize: "1.976cqw", lineHeight: 1.7, maxWidth: "57.531cqw" /* figma 보기패널 텍스트 932px */, color: C_BLACK }}
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

          {/* 칩 — 5지: 짧으면 1행/길면 2열, 그 외: wrap (chipContainerStyle). */}
          <div className="w-full" style={chipContainerStyle}>
            {availableChips.map((c) => (
              <DraggableChip
                key={c.idx}
                chipIdx={c.idx}
                label={c.label}
                disabled={disabled || eliminatedIdx === c.idx}
                eliminated={eliminatedIdx === c.idx && !isCorrect && isCorrect !== false}
                fontSize={chipFontSize}
                highlight={typeof isCorrect === "boolean" && correctIndexes.includes(c.idx)}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggingLabel ? (
          <span
            className="select-none rounded-[0.711cqw] bg-white font-medium shadow-lg"
            style={{
              padding: "0.735cqw 1.659cqw",
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
}: {
  chipIdx: number;
  label: string;
  disabled?: boolean;
  eliminated?: boolean;
  fontSize: string;
  highlight?: boolean;
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
      type="button"
      disabled={disabled}
      aria-label={eliminated ? t("solve.eliminatedChoice") : undefined}
      style={{
        opacity: isDragging ? 0 : eliminated ? 0.45 : 1,
        touchAction: "none",
        padding: "1.363cqw 1.778cqw" /* figma 칩 높이 66px */,
        minWidth: "8.083cqw" /* figma 131px */,
        maxWidth: "23.704cqw",
        fontSize,
        lineHeight: 1.2,
        whiteSpace: "nowrap" as const,
        color: highlight ? C_MASTER : C_BLACK,
        border: highlight ? "0.154cqw solid var(--color-mastery-master)" : "0.062cqw solid transparent",
        boxShadow: "0 0.119cqw 0.593cqw rgba(17,24,39,0.12)",
      }}
      className={cn(
        "select-none rounded-[0.711cqw] bg-white text-center font-medium",
        !disabled && "cursor-grab active:cursor-grabbing hover:shadow-md",
        disabled && !eliminated && "opacity-60",
        eliminated && "cursor-not-allowed",
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
  fontSize: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `blank-${blankIdx}` });
  const isEmpty = chipIdx === null;
  const textColor = isCorrect === false ? C_DELETE : C_BLACK;
  return (
    <span
      ref={setNodeRef}
      onClick={onClear}
      style={{
        display: "inline-flex",
        verticalAlign: "middle",
        alignItems: "center",
        justifyContent: "flex-start",
        textAlign: "center",
        padding: "0.711cqw 1.659cqw" /* 세로 축소 — 빈칸이 문장 줄과 겹치지 않게 거리 확보 */,
        minWidth: isEmpty ? "12.207cqw" /* figma 198px (빈칸) */ : "5cqw" /* 채우면 단어 길이에 맞게 */,
        margin: "0 0.474cqw",
        fontSize,
        lineHeight: 1.2,
        whiteSpace: "nowrap" as const,
        backgroundColor: isCorrect === false ? WRONG_BG : "#ffffff",
        border:
          isCorrect === true
            ? `0.154cqw solid ${C_MASTER}` /* 정답: 흰 배경 + 보라 테두리 진하게 (시안) */
            : `0.095cqw solid ${isEmpty ? "rgb(209 213 219)" : "transparent"}`,
        boxShadow: isEmpty ? "inset 0 0.095cqw 0.356cqw rgba(17,24,39,0.06)" : "0 0.119cqw 0.474cqw rgba(17,24,39,0.1)",
        color: isEmpty ? "transparent" : textColor,
        fontWeight: isCorrect === true || isCorrect === false ? 700 : 500,
      }}
      className={cn(
        "select-none rounded-[0.593cqw] cursor-pointer transition-colors",
        isOver && isEmpty && "ring-2 ring-[var(--color-mastery-master)]",
        disabled && "cursor-not-allowed",
      )}
    >
      {chipLabel ?? " "}
    </span>
  );
}
