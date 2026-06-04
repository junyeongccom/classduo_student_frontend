/**
 * @file types.ts
 * @description quiz-form 렌더러 공용 prop 타입. B2C(solveService)에서 가져온 폼들의
 *              런타임 의존(store/service/hook)을 끊고, 폼이 실제로 소비하는 필드만 추려 로컬 정의.
 * @module features/exam-prep-final/components/ui/forms
 */

/*
 * ─────────────────────────────────────────────────────────────────────────
 * CSS custom properties referenced by these forms (integrator must define):
 *   --color-mastery-master          채점 정답 강조 (파랑 계열). 직접 var() 사용.
 *   --color-semantic-delete         채점 오답 강조 (빨강 계열). rgb(var(--...)) 형태 — "R G B" 채널값으로 정의 필요.
 *   --color-neutral-black-hex       기본 텍스트/보더 (검정). 직접 var() 사용.
 *   --color-neutral-gray-100        칩/빈칸 배경, hover. rgb(var(--...)) 형태.
 *   --color-neutral-gray-200        채점 후 dim 배경. rgb(var(--...)) 형태.
 *   --color-neutral-gray-300        채점 후 dim 보더. rgb(var(--...)) 형태.
 *   --color-neutral-gray-500        채점 후 dim 텍스트, 보조 라벨. rgb(var(--...)) 형태.
 *   --color-text-inverse            오답(빨강) 배경 위 텍스트. 직접 var() 사용.
 *
 * Tailwind utility classes also referenced (must resolve in target Tailwind config):
 *   bg-button-primary-bg            MCQ 선지 기본 배경.
 *   font-bookk                      MCQ letter (A/B/C/X) 폰트 패밀리.
 *   font-bookk-myungjo              EssayForm 보기 본문 폰트 패밀리.
 * ─────────────────────────────────────────────────────────────────────────
 */

/**
 * 채점 결과 — 폼들이 post-grade 하이라이트를 그릴 때 읽는 최소 형태.
 * (B2C `SubmitAnswerResponse` 에서 폼이 실제 소비하는 필드만 발췌.)
 *  - is_correct: 정/오답 여부
 *  - correct_answer: 정답 — 형식별로 number | number[] | [number, number][]
 *      · Mcq4Single / FillBlank5Single → number
 *      · Mcq6Multi / FillBlank7Multi    → number[]
 *      · Match                          → [number, number][]
 *  - payload: 서버가 돌려준 payload. EssayForm 은 여기서 model_answer 를 읽음.
 */
export type QuizFormResult = {
  is_correct: boolean;
  correct_answer: number | number[] | [number, number][] | null;
  payload?: PrincipleQuizPayload | null;
};

/** 심화(원리) 서술형 3 sub_type. */
export type PrincipleSubType =
  | "calculation_apply"
  | "problem_solving_analysis"
  | "error_diagnosis_evaluation";

/** sub_type 별 payload 키 — situation/scenario/explanation 중 하나 + keyword + model_answer. */
export type PrincipleQuizPayload = {
  /** calculation_apply 만 사용 */
  situation?: string;
  /** problem_solving_analysis 만 사용 */
  scenario?: string;
  /** error_diagnosis_evaluation 만 사용 */
  explanation?: string;
  keyword?: string;
  model_answer: string;
};

/** 서술형 quiz row — EssayForm 입력. */
export type PrincipleQuiz = {
  id: string;
  sub_type: PrincipleSubType;
  question_text: string;
  payload: PrincipleQuizPayload;
};
