/**
 * @file ChatTranscriptPrintView.tsx
 * @description 대화 내역 인쇄 전용 문서 뷰 — 화면에는 숨고 @media print 에서만 렌더 (머리말/소크라 요약표/대화 본문)
 * @module features/ai-tutor/components/ui
 * @dependencies MarkdownMessage, domain/socraticStages
 */
'use client'

import { useTranslations } from 'next-intl'
import { MarkdownMessage } from './MarkdownMessage'
import type { SocraticCheckpointRow } from '../../domain/socraticStages'

/** 인쇄물 루트 id — @media print 에서 이 노드만 남기고 body 의 나머지 형제를 숨긴다. */
export const TRANSCRIPT_PRINT_ROOT_ID = 'chat-transcript-print'

export interface TranscriptPrintTurn {
  role: 'user' | 'assistant'
  content: string
  /** 소크라 문답: 디딤돌을 딛고 스스로 답에 닿은 발화 (화면 칩과 동일) */
  aha?: boolean
}

export interface TranscriptPrintSocratic {
  topicTitle: string
  totalScore: number
  currentStage: number
  stageTotal: number
  ahaCount: number
  rows: SocraticCheckpointRow[]
}

export interface TranscriptPrintData {
  /** document.title 로 잠시 갈아끼울 값 = 브라우저 PDF 저장 기본 파일명 */
  filename: string
  courseTitle: string | null
  lectureLabel: string | null
  modeLabel: string
  savedAtLabel: string
  turns: TranscriptPrintTurn[]
  socratic: TranscriptPrintSocratic | null
}

/**
 * 인쇄 전용 스타일.
 * - 화면(@media screen)에서는 루트를 완전히 숨겨 기존 레이아웃에 영향이 없다.
 * - 인쇄(@media print)에서는 body 직계 형제를 모두 숨겨 사이드바/입력창/버튼 등 UI 크롬을 걷어낸다.
 * - 색은 문서용으로 눕힌다(다크 모드에서 인쇄해도 흰 종이에 검은 글씨).
 */
const PRINT_CSS = `
@media screen {
  #${TRANSCRIPT_PRINT_ROOT_ID} { display: none !important; }
}
@media print {
  @page { size: A4; margin: 16mm 14mm; }
  html, body {
    height: auto !important;
    overflow: visible !important;
    background: #fff !important;
  }
  body > *:not(#${TRANSCRIPT_PRINT_ROOT_ID}) { display: none !important; }
  #${TRANSCRIPT_PRINT_ROOT_ID} {
    display: block !important;
    position: static !important;
    width: 100%;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111827;
    font-family: "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
    font-size: 10.5pt;
    line-height: 1.65;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-header {
    border-bottom: 1.5pt solid #111827;
    padding-bottom: 6pt;
    margin-bottom: 12pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-doc-title {
    font-size: 15pt;
    font-weight: 700;
    margin: 0 0 4pt;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-meta {
    margin: 0;
    font-size: 9pt;
    color: #4b5563;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-meta span + span::before {
    content: " · ";
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-section-title {
    font-size: 11pt;
    font-weight: 700;
    margin: 0 0 5pt;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-summary {
    margin-bottom: 14pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} table.ctp-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} table.ctp-table th,
  #${TRANSCRIPT_PRINT_ROOT_ID} table.ctp-table td {
    border: 0.5pt solid #9ca3af;
    padding: 3pt 5pt;
    text-align: left;
    vertical-align: top;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} table.ctp-table th {
    font-weight: 700;
    background: #f3f4f6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-num { text-align: right; }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-total {
    margin-top: 5pt;
    font-size: 10pt;
    font-weight: 700;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-turn {
    margin: 0 0 11pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-role {
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.02em;
    margin-bottom: 2pt;
    color: #374151;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-turn--user .ctp-body {
    border-left: 2pt solid #6366f1;
    padding-left: 7pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-turn--assistant .ctp-body {
    border-left: 2pt solid #d1d5db;
    padding-left: 7pt;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  /* 말풍선 UI 의 화면용 색/배경/그림자를 문서용으로 눕힌다 (다크 모드 인쇄 대응) */
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-md,
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-md * {
    color: #111827 !important;
    background: transparent !important;
    box-shadow: none !important;
    max-width: 100% !important;
  }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-md img { max-width: 100% !important; height: auto !important; }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-md table { border-collapse: collapse; }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-md th,
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-md td { border: 0.5pt solid #9ca3af; padding: 2pt 4pt; }
  #${TRANSCRIPT_PRINT_ROOT_ID} .ctp-empty { font-size: 10pt; color: #6b7280; }
}
`

interface Props {
  data: TranscriptPrintData
}

export default function ChatTranscriptPrintView({ data }: Props) {
  const t = useTranslations('aiTutorChat')
  const { socratic } = data
  const metaItems = [
    data.courseTitle,
    data.lectureLabel,
    socratic?.topicTitle ?? null,
    data.modeLabel,
    data.savedAtLabel,
  ].filter((v): v is string => !!v)

  return (
    <div id={TRANSCRIPT_PRINT_ROOT_ID} aria-hidden="true">
      <style>{PRINT_CSS}</style>

      {/* 머리말 — 일반 흐름 콘텐츠라 첫 장에만 나온다 */}
      <header className="ctp-header">
        <h1 className="ctp-doc-title">{t('transcript.docTitle')}</h1>
        <p className="ctp-meta">
          {metaItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </p>
      </header>

      {/* 소크라 문답일 때만 붙는 세션 요약 — 우측 패널이 화면에 이미 보여주는 값만 담는다 */}
      {socratic && socratic.rows.length > 0 && (
        <section className="ctp-summary">
          <h2 className="ctp-section-title">{t('transcript.summaryTitle')}</h2>
          <table className="ctp-table">
            <thead>
              <tr>
                <th>{t('transcript.colStep')}</th>
                <th>{t('transcript.colType')}</th>
                <th>{t('transcript.colPassed')}</th>
                <th>{t('transcript.colMethod')}</th>
                <th className="ctp-num">{t('transcript.colScore')}</th>
                <th>{t('transcript.colAha')}</th>
              </tr>
            </thead>
            <tbody>
              {socratic.rows.map((row) => (
                <tr key={row.index}>
                  <td className="ctp-num">{row.index + 1}</td>
                  <td>
                    {row.stageKey ? t(`socraticStage.${row.stageKey}`) : '-'}
                    {row.stageCount > 1 ? ` ${row.positionInStage}/${row.stageCount}` : ''}
                  </td>
                  <td>{row.passed ? t('transcript.passed') : t('transcript.notPassed')}</td>
                  <td>
                    {row.method
                      ? t(`socraticMethod.${row.method}`)
                      : row.passed ? t('transcript.methodUnknown') : '-'}
                  </td>
                  <td className="ctp-num">{row.passed ? row.score : '-'}</td>
                  <td>{row.aha ? t('transcript.ahaYes') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="ctp-total">
            {t('transcript.totalScore', { score: socratic.totalScore })}
            {' · '}
            {t('transcript.progress', { current: socratic.currentStage, total: socratic.stageTotal })}
            {socratic.ahaCount > 0 ? ` · ${t('socraticAhaBadge', { count: socratic.ahaCount })}` : ''}
          </p>
        </section>
      )}

      {/* 대화 본문 */}
      <section>
        <h2 className="ctp-section-title">{t('transcript.conversationTitle')}</h2>
        {data.turns.length === 0 ? (
          <p className="ctp-empty">{t('transcript.emptyConversation')}</p>
        ) : (
          data.turns.map((turn, index) => (
            <article
              key={index}
              className={`ctp-turn ${turn.role === 'user' ? 'ctp-turn--user' : 'ctp-turn--assistant'}`}
            >
              <div className="ctp-role">
                {turn.role === 'user' ? t('transcript.roleStudent') : t('transcript.roleTutor')}
                {turn.aha ? ` · ${t('socraticAhaChip')}` : ''}
              </div>
              <div className="ctp-body">
                <MarkdownMessage markdown={turn.content} className="ctp-md" />
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
