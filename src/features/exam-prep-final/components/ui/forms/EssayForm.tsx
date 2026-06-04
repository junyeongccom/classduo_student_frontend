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

import type { PrincipleQuiz, PrincipleQuizPayload, QuizFormResult } from "./types";

const C_BLACK = "var(--color-neutral-black-hex)";
const C_MASTER = "var(--color-mastery-master)";

export type EssayFormProps = {
  quiz: PrincipleQuiz;
  value: string;
  onChange: (text: string) => void;
  hasSubmitted: boolean;
  result?: QuizFormResult | null;
};

function getBodyText(payload: PrincipleQuizPayload, subType: string): string {
  if (subType === "calculation_apply") return payload.situation ?? "";
  if (subType === "problem_solving_analysis") return payload.scenario ?? "";
  if (subType === "error_diagnosis_evaluation") return payload.explanation ?? "";
  return "";
}

export function EssayForm({ quiz, value, onChange, hasSubmitted, result }: EssayFormProps) {
  const bodyText = getBodyText(quiz.payload, quiz.sub_type);
  const modelAnswer =
    ((result?.payload as PrincipleQuizPayload | null) ?? quiz.payload)?.model_answer ?? "";

  return (
    <div className="flex w-full flex-col" style={{ gap: "1.46cqw" }}>
      {/* 질문 텍스트 */}
      <h1 className="font-bold leading-snug break-keep" style={{ fontSize: "1.875cqw", color: C_BLACK }}>
        {quiz.question_text}
      </h1>

      {/* <보기> — 회색 bg + 보라 좌측 바 */}
      <div
        className="w-full break-keep"
        style={{
          backgroundColor: "rgb(243 244 246)",
          borderLeft: `0.21cqw solid ${C_MASTER}`,
          borderRadius: "0 0.6cqw 0.6cqw 0",
          padding: "1.25cqw 1.6cqw",
          fontSize: "1.15cqw",
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
          placeholder="답안을 작성하세요..."
          className="w-full resize-none bg-white outline-none focus:ring-2"
          style={{
            border: "0.08cqw solid rgb(209 213 219)",
            borderRadius: "0.6cqw",
            padding: "1.2cqw 1.4cqw",
            minHeight: "10.5cqw",
            fontSize: "1.04cqw",
            lineHeight: 1.6,
            color: C_BLACK,
          }}
        />
      ) : (
        <AnsweredView userAnswer={value} modelAnswer={modelAnswer} />
      )}
    </div>
  );
}

/** 제출 후 — 답안 + 정답(모범답안) 영역. */
function AnsweredView({ userAnswer, modelAnswer }: { userAnswer: string; modelAnswer: string }) {
  return (
    <div className="flex w-full flex-col" style={{ gap: "1cqw" }}>
      <div>
        <p className="mb-[0.5cqw] font-bold" style={{ fontSize: "1.04cqw", color: C_BLACK }}>
          답안
        </p>
        <div
          className="w-full bg-white"
          style={{
            border: "0.08cqw solid rgb(209 213 219)",
            borderRadius: "0.6cqw",
            padding: "1cqw 1.4cqw",
            fontSize: "1.04cqw",
            lineHeight: 1.6,
            minHeight: "5cqw",
            whiteSpace: "pre-wrap",
            color: C_BLACK,
          }}
        >
          {userAnswer || "—"}
        </div>
      </div>

      <div>
        <p className="mb-[0.5cqw] font-bold" style={{ fontSize: "1.04cqw", color: C_MASTER }}>
          모범답안
        </p>
        <div
          className="w-full break-keep"
          style={{
            backgroundColor: "rgb(243 244 246)",
            borderLeft: `0.21cqw solid ${C_MASTER}`,
            borderRadius: "0 0.6cqw 0.6cqw 0",
            padding: "1cqw 1.4cqw",
            fontSize: "1.04cqw",
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
