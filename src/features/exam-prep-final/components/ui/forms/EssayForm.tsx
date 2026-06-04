/**
 * @file EssayForm.tsx
 * @description 심화(원리) 서술형 풀이 폼 — 3 sub_type 공통.
 *              상단: 질문 텍스트 (Bold)
 *              중단: 보기 (situation / scenario / explanation) — 좌·우 큰 중괄호로 감싼 박스
 *              하단: 답안 textarea OR 제출 후 [답안 | 정답] 영역
 *              자가평가 — mastery 무관, 채점 색상 없음.
 * @module features/exam-prep-final/components/ui/forms
 * @dependencies (none)
 */
"use client";

import { useEffect, useState } from "react";

import type { PrincipleQuiz, PrincipleQuizPayload, QuizFormResult } from "./types";

/**
 * 값 계약: value = 사용자가 작성한 답안 텍스트 (string, 제어 컴포넌트).
 *          onChange(text: string). 제출(hasSubmitted=true) 시 textarea → 답안/정답 영역으로 전환.
 *          result.payload.model_answer 로 모범답안 노출 (없으면 quiz.payload.model_answer).
 */
export type EssayFormProps = {
  quiz: PrincipleQuiz;
  /** 사용자 작성 답안 (제어 컴포넌트) */
  value: string;
  onChange: (text: string) => void;
  /** 제출됨 — true 이면 textarea disable + 답안/정답 영역으로 전환 */
  hasSubmitted: boolean;
  /** 제출 결과 — payload.model_answer 노출 위해 사용. (서버 응답 payload) */
  result?: QuizFormResult | null;
};

/** sub_type 별 보기 텍스트 키 추출 — calculation_apply: situation / problem_solving_analysis: scenario / error_diagnosis_evaluation: explanation */
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
    <div className="flex w-full flex-col" style={{ gap: "1.04vw" /* 20/1920 */ }}>
      {/* 질문 텍스트 — 36px Bold @ 1920 */}
      <h1
        className="font-bold leading-snug text-[var(--color-neutral-black-hex)] break-keep"
        style={{ fontSize: "clamp(18px, 1.875vw, 40px)" }}
      >
        {quiz.question_text}
      </h1>

      {/* 보기 (situation / scenario / explanation) — 좌·우 큰 중괄호 + 텍스트 */}
      <BracketedBody text={bodyText} />

      {/* 하단 — 제출 전/후 분기 */}
      {!hasSubmitted ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="답안을 작성하세요..."
          className="w-full resize-none rounded-md border-2 border-[var(--color-neutral-black-hex)] bg-white p-4 text-[var(--color-neutral-black-hex)] outline-none focus:ring-2 focus:ring-[var(--color-mastery-master)]"
          style={{
            minHeight: "clamp(120px, 8vw, 200px)",
            fontSize: "clamp(14px, 1.146vw, 24px)",
            lineHeight: 1.5,
          }}
        />
      ) : (
        <AnsweredView userAnswer={value} modelAnswer={modelAnswer} />
      )}
    </div>
  );
}

/**
 * 보기 텍스트 — 큰 중괄호 { }로 좌·우 감싼 박스. SVG 로 깔끔하게.
 */
function BracketedBody({ text }: { text: string }) {
  return (
    <div
      className="relative flex w-full items-stretch"
      style={{
        paddingTop: "clamp(8px, 0.625vw, 16px)",
        paddingBottom: "clamp(8px, 0.625vw, 16px)",
      }}
    >
      <Brace side="left" />
      <p
        className="font-bookk-myungjo mx-3 flex-1 break-keep text-[var(--color-neutral-black-hex)]"
        style={{
          fontSize: "clamp(13px, 1.25vw, 26px)" /* 24/1920 */,
          lineHeight: 1.6,
        }}
      >
        {text}
      </p>
      <Brace side="right" />
    </div>
  );
}

/** 좌·우 중괄호 — 부모 flex(items-stretch) 의 높이에 맞춰 자동 신축. */
function Brace({ side }: { side: "left" | "right" }) {
  const d =
    side === "left"
      ? "M18 2 C 10 2, 6 8, 6 18 L 6 42 C 6 50, 4 50, 2 50 C 4 50, 6 50, 6 58 L 6 82 C 6 92, 10 98, 18 98"
      : "M2 2 C 10 2, 14 8, 14 18 L 14 42 C 14 50, 16 50, 18 50 C 16 50, 14 50, 14 58 L 14 82 C 14 92, 10 98, 2 98";
  return (
    <svg
      viewBox="0 0 20 100"
      preserveAspectRatio="none"
      className="shrink-0 self-stretch"
      style={{
        width: "clamp(12px, 1vw, 22px)",
        height: "auto",
        color: "var(--color-neutral-black-hex)",
      }}
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** 제출 후 — 답안 + 정답 영역 노출 (자가평가). */
function AnsweredView({
  userAnswer,
  modelAnswer,
}: {
  userAnswer: string;
  modelAnswer: string;
}) {
  return (
    <div className="flex w-full flex-col" style={{ gap: "clamp(10px, 0.83vw, 22px)" }}>
      {/* 답안 (사용자) */}
      <div>
        <p
          className="mb-2 font-bold text-[var(--color-neutral-black-hex)]"
          style={{ fontSize: "clamp(14px, 1.04vw, 22px)" }}
        >
          답안
        </p>
        <div
          className="rounded-md border-2 border-[var(--color-neutral-black-hex)] bg-white p-4 text-[var(--color-neutral-black-hex)]"
          style={{
            fontSize: "clamp(14px, 1.146vw, 24px)",
            lineHeight: 1.5,
            minHeight: "clamp(60px, 4vw, 110px)",
            whiteSpace: "pre-wrap",
          }}
        >
          {userAnswer || "—"}
        </div>
      </div>

      {/* 정답 (모범답안) */}
      <div>
        <p
          className="mb-2 font-bold text-[var(--color-neutral-black-hex)]"
          style={{ fontSize: "clamp(14px, 1.04vw, 22px)" }}
        >
          정답
        </p>
        <p
          className="break-keep text-[var(--color-neutral-black-hex)]"
          style={{
            fontSize: "clamp(13px, 1.146vw, 24px)",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
          }}
        >
          {modelAnswer}
        </p>
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
