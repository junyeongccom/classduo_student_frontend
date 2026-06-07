/**
 * @file EssayForm.tsx
 * @description 서술형 오류탐지형 풀이 폼 — error_diagnosis_evaluation (중간테스트 전용).
 *              상단: 질문 텍스트(Bold) / 중단: <보기> 인용 박스(회색 bg + 보라 좌측 바) / 하단: 답안 textarea.
 *              제출 후: [답안 | 정답(모범답안)] 노출. 자가평가 — mastery 무관, 채점 색상 없음.
 *              모든 치수는 SolveCanvas 기준 cqw.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies (none)
 */
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import type { PrincipleQuiz, PrincipleQuizPayload, QuizFormResult } from "./types";

const C_BLACK = "var(--color-neutral-black-hex)";
const C_CANVAS_FG = "var(--color-exam-canvas-fg)"; // 캔버스 직속 텍스트(질문·라벨) — 다크 반전
const C_MASTER = "var(--color-mastery-master)";

export type EssayFormProps = {
  quiz: PrincipleQuiz;
  value: string;
  onChange: (text: string) => void;
  hasSubmitted: boolean;
  result?: QuizFormResult | null;
  /** 모바일(<768px) — cqw 대신 fluid px 레이아웃. */
  mobile?: boolean;
};

/** 치수 토큰 — 데스크탑 cqw(1620 baseline) / 모바일 고정 px. */
type SizingE = {
  rootGap: string;
  stem: string;
  quoteBar: string;
  quoteRadius: string;
  quotePad: string;
  quoteFs: string;
  taBorder: string;
  taPad: string;
  taMinH: string;
  taFs: string;
  ansGap: string;
  labelFs: string;
  labelMb: string;
  boxBorder: string;
  boxRadius: string;
  boxPad: string;
  boxFs: string;
  boxMinH: string;
  modelBar: string;
  modelRadius: string;
  modelPad: string;
};
const DESKTOP_E: SizingE = {
  rootGap: "1.730cqw",
  stem: "2.222cqw",
  quoteBar: "0.676cqw",
  quoteRadius: "0 0.711cqw 0.711cqw 0",
  quotePad: "1.019cqw 2.465cqw",
  quoteFs: "1.481cqw",
  taBorder: "0.123cqw",
  taPad: "1.422cqw 1.659cqw",
  taMinH: "11.544cqw",
  taFs: "1.233cqw",
  ansGap: "1.185cqw",
  labelFs: "1.233cqw",
  labelMb: "0.593cqw",
  boxBorder: "0.095cqw",
  boxRadius: "0.711cqw",
  boxPad: "1.185cqw 1.659cqw",
  boxFs: "1.233cqw",
  boxMinH: "5.926cqw",
  modelBar: "0.249cqw",
  modelRadius: "0 0.711cqw 0.711cqw 0",
  modelPad: "1.185cqw 1.659cqw",
};
const MOBILE_E: SizingE = {
  rootGap: "14px",
  stem: "18px",
  quoteBar: "6px",
  quoteRadius: "0 6px 6px 0",
  quotePad: "12px 16px",
  quoteFs: "14px",
  taBorder: "1.5px",
  taPad: "12px 13px",
  taMinH: "140px",
  taFs: "14px",
  ansGap: "12px",
  labelFs: "13px",
  labelMb: "5px",
  boxBorder: "1px",
  boxRadius: "6px",
  boxPad: "10px 13px",
  boxFs: "14px",
  boxMinH: "72px",
  modelBar: "3px",
  modelRadius: "0 6px 6px 0",
  modelPad: "10px 13px",
};

function getBodyText(payload: PrincipleQuizPayload, subType: string): string {
  if (subType === "calculation_apply") return payload.situation ?? "";
  if (subType === "problem_solving_analysis") return payload.scenario ?? "";
  if (subType === "error_diagnosis_evaluation") return payload.explanation ?? "";
  return "";
}

export function EssayForm({ quiz, value, onChange, hasSubmitted, result, mobile = false }: EssayFormProps) {
  const t = useTranslations("examPrepFinal");
  const SZ = mobile ? MOBILE_E : DESKTOP_E;
  const bodyText = getBodyText(quiz.payload, quiz.sub_type);
  const modelAnswer =
    ((result?.payload as PrincipleQuizPayload | null) ?? quiz.payload)?.model_answer ?? "";

  return (
    <div className="flex w-full flex-col" style={{ gap: SZ.rootGap }}>
      {/* 질문 텍스트 */}
      <h1 className="font-bold leading-snug break-keep" style={{ fontSize: SZ.stem, color: C_CANVAS_FG }}>
        {quiz.question_text}
      </h1>

      {/* <보기> — 회색 bg + 보라 좌측 바 */}
      <div
        className="w-full break-keep"
        style={{
          backgroundColor: "rgb(243 244 246)",
          borderLeft: `${SZ.quoteBar} solid ${C_MASTER}` /* figma 인용바 11px */,
          borderRadius: SZ.quoteRadius,
          padding: SZ.quotePad /* figma 좌측 바+여백 51px, 상하 16.5px */,
          fontSize: SZ.quoteFs,
          lineHeight: 1.7,
          color: C_BLACK,
        }}
      >
        {bodyText}
      </div>

      {/* 하단 — 제출 전/후 분기 */}
      {!hasSubmitted ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("solve.essayPlaceholder")}
          className="w-full resize-none bg-white outline-none focus:ring-2"
          style={{
            border: `${SZ.taBorder} solid #4f4f4f` /* figma 답작성영역(941:9044) border-2 #4f4f4f */,
            borderRadius: "0",
            padding: SZ.taPad,
            minHeight: SZ.taMinH /* figma 답작성영역 187px */,
            fontSize: SZ.taFs,
            lineHeight: 1.6,
            color: C_BLACK,
          }}
        />
      ) : (
        <AnsweredView userAnswer={value} modelAnswer={modelAnswer} sz={SZ} />
      )}
    </div>
  );
}

/** 제출 후 — 답안 + 정답(모범답안) 영역. */
function AnsweredView({
  userAnswer,
  modelAnswer,
  sz,
}: {
  userAnswer: string;
  modelAnswer: string;
  sz: SizingE;
}) {
  return (
    <div className="flex w-full flex-col" style={{ gap: sz.ansGap }}>
      <div>
        <p className="font-bold" style={{ marginBottom: sz.labelMb, fontSize: sz.labelFs, color: C_CANVAS_FG }}>
          답안
        </p>
        <div
          className="w-full bg-white"
          style={{
            border: `${sz.boxBorder} solid rgb(209 213 219)`,
            borderRadius: sz.boxRadius,
            padding: sz.boxPad,
            fontSize: sz.boxFs,
            lineHeight: 1.6,
            minHeight: sz.boxMinH,
            whiteSpace: "pre-wrap",
            color: C_BLACK,
          }}
        >
          {userAnswer || "—"}
        </div>
      </div>

      <div>
        <p className="font-bold" style={{ marginBottom: sz.labelMb, fontSize: sz.labelFs, color: C_MASTER }}>
          모범답안
        </p>
        <div
          className="w-full break-keep"
          style={{
            backgroundColor: "rgb(243 244 246)",
            borderLeft: `${sz.modelBar} solid ${C_MASTER}`,
            borderRadius: sz.modelRadius,
            padding: sz.modelPad,
            fontSize: sz.boxFs,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            color: C_BLACK,
          }}
        >
          {modelAnswer}
        </div>
      </div>
    </div>
  );
}

/** quiz 가 바뀌면 textarea 를 초기화하고 싶을 때 사용 가능한 hook (caller 측). */
export function useEssayDraft(quizId: string | null) {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    setDraft("");
  }, [quizId]);
  return [draft, setDraft] as const;
}
