/**
 * @file buildTranscriptFilename.ts
 * @description 대화 기록 인쇄(PDF 저장) 파일명 생성 — 모드_주제_날짜_시각, 반복 저장 시 파일 구분
 * @module features/ai-tutor/domain
 * @dependencies 없음 (순수 함수)
 */

// 파일명에 쓸 수 없는 문자 (Windows 기준이 가장 엄격) + 제어문자
const FORBIDDEN_CHARS = /[\\/:*?"<>|]/g
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g
// 주제명이 길면 저장 대화상자에서 잘려 회차 구분이 어려워진다 — 앞부분만 남긴다.
const SEGMENT_MAX_LENGTH = 40

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 파일명 한 조각을 안전하게 정리한다.
 * 공백은 제거한다 — 브라우저 저장 대화상자에서 공백이 섞이면 회차별 파일을 눈으로 훑기 어렵다.
 */
export function sanitizeFilenameSegment(raw: string): string {
  return (raw ?? '')
    .replace(CONTROL_CHARS, '')
    .replace(FORBIDDEN_CHARS, '')
    .replace(/\s+/g, '')
    .replace(/^[.]+/, '')
    .slice(0, SEGMENT_MAX_LENGTH)
}

/** YYYYMMDD_HHmm (로컬 시각). Invalid Date 는 현재 시각으로 폴백. */
export function formatTranscriptTimestamp(at: Date): string {
  const safe = at instanceof Date && Number.isFinite(at.getTime()) ? at : new Date()
  return [
    `${safe.getFullYear()}${pad2(safe.getMonth() + 1)}${pad2(safe.getDate())}`,
    `${pad2(safe.getHours())}${pad2(safe.getMinutes())}`,
  ].join('_')
}

interface TranscriptFilenameInput {
  /** 모드 라벨 (i18n) — 예: "소크라 문답" */
  modeLabel: string
  /** 주제/회차명 — 소크라는 문답 주제, 그 외에는 회차 또는 강의명 */
  subject: string | null | undefined
  /** 주제를 특정할 수 없을 때 쓸 라벨 (i18n) */
  fallbackSubject: string
  at: Date
}

/**
 * 브라우저가 PDF 저장 시 기본 파일명으로 쓰는 document.title 값을 만든다.
 * 예: `소크라문답_유전자와대립유전자의차이_20260803_1430`
 */
export function buildTranscriptFilename({
  modeLabel, subject, fallbackSubject, at,
}: TranscriptFilenameInput): string {
  const subjectSegment = sanitizeFilenameSegment(subject ?? '') || sanitizeFilenameSegment(fallbackSubject)
  return [
    sanitizeFilenameSegment(modeLabel),
    subjectSegment,
    formatTranscriptTimestamp(at),
  ].filter(Boolean).join('_')
}
