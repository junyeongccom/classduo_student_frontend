'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import katex from 'katex'

export type CitationTag = {
  type: 'recording' | 'material'
  /** 답변 표기 번호 — 녹음본은 1-based(chunk_index+1), 페이지는 실제 페이지 번호 */
  no: number
}

type MarkdownMessageProps = {
  markdown: string
  className?: string
  /**
   * 헤더 크기 모드.
   * - 'default': 일반 답변/문서용 (h2 = text-lg)
   * - 'compact': 인라인 영역용 (퀴즈 상세 설명 등). 헤더가 작고 위/아래 마진 작음.
   */
  headingSize?: 'default' | 'compact'
  /**
   * 출처 태그([녹음본 N]/[페이지 N], 영문 [Recording N]/[Page N]) 클릭 핸들러.
   * 지정하면 답변 본문의 출처 표기가 텍스트 대신 클릭 가능한 칩 버튼으로 렌더링된다.
   * 미지정 시 기존과 동일하게 일반 텍스트로 표시 (opt-in — 다른 사용처 영향 없음).
   */
  onCitationClick?: (citation: CitationTag, messageIndex: number) => void
  /** onCitationClick 에 넘겨줄 메시지 인덱스 (React.memo 유지를 위해 클로저 대신 prop) */
  citationMessageIndex?: number
  /**
   * 인라인 아코디언으로 펼쳐진 출처 칩 (모바일 전용).
   * 이 메시지 안에서 type/no 가 일치하는 칩 아래에 expandedCitationCard 를 렌더한다.
   * 미펼침 메시지는 null/undefined 로 유지 — React.memo 리렌더를 유발하지 않는다.
   */
  expandedCitation?: CitationTag | null
  /** expandedCitation 과 일치하는 칩 아래에 렌더할 카드 노드 (span 기반 — <p> 내부 렌더 가능해야 함) */
  expandedCitationCard?: React.ReactNode
}

/**
 * CJK(한글 등) 인접 강조(`**bold**`) 보정.
 *
 * CommonMark 의 right-flanking 규칙상, 닫는 `**` 가 구두점 바로 뒤(예: 닫는 괄호)에 오고
 * 그 뒤에 공백 없이 한글 조사(는/은/이/가 등)가 붙으면 — 예: `...(De novo variant)**는` —
 * 닫는 구분자로 인정되지 않아 `**` 가 굵게 표시되지 못하고 그대로 노출된다.
 * 구두점과 `*` 런 사이에 폭 0 공백(U+200B)을 끼워 "구두점 바로 뒤" 조건을 깨면 정상 파싱된다.
 * (U+200B 는 right-flanking 을 막던 구두점 조건만 무효화하므로 강조를 '추가로 허용'할 뿐
 *  기존에 정상 파싱되던 강조를 깨뜨리지 않는다.)
 *
 * 코드/수식(`` `inline` ``, 펜스 코드, `$inline$`, `$$block$$`)은 마스킹으로 보존한다.
 * 마스킹 sentinel 은 U+0000(NUL) — 답변 본문에 등장 불가능하므로 실제 숫자와 충돌하지 않는다.
 * lookbehind 미사용 — 구형 Safari 호환.
 */
function cjkFriendlyEmphasis(md: string): string {
  if (!md || md.indexOf('*') === -1) return md
  const masked: string[] = []
  const protectedText = md.replace(
    /```[\s\S]*?```|`[^`]*`|\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g,
    (m) => {
      masked.push(m)
      return `\u0000${masked.length - 1}\u0000`
    },
  )
  const fixed = protectedText.replace(
    /([\p{P}])(\*{1,3})(?=[^\s*])/gu,
    (full, punct: string, stars: string) =>
      punct === '*' ? full : `${punct}\u200B${stars}`,
  )
  return fixed.replace(/\u0000(\d+)\u0000/g, (_m, i) => masked[Number(i)])
}

/**
 * 답변 본문의 출처 표기를 마크다운 링크(`#cite-<type>-<no>`)로 변환.
 *
 * 백엔드 표기 규칙(citation_extraction_service.py 와 동일 전제):
 * - 단독: `[녹음본 5]`, `[페이지 16]`, `[Recording 6]`, `[Page 10]`
 * - 묶음: `[녹음본 1, 녹음본 7]`, `[녹음본 1, 페이지 16]`, `[녹음본 1·7]`(타입 생략 시 직전 타입 상속)
 * 괄호 안이 출처 토큰만으로 구성된 경우에만 변환하고, `](` 로 이어지는
 * 기존 마크다운 링크는 건드리지 않는다. 코드/수식은 마스킹으로 보존 (sentinel = U+0000).
 */
function linkifyCitations(md: string): string {
  if (!md || md.indexOf('[') === -1) return md
  const masked: string[] = []
  const protectedText = md.replace(
    /```[\s\S]*?```|`[^`]*`|\$\$[\s\S]*?\$\$|\$[^$\n]*\$/g,
    (m) => {
      masked.push(m)
      return `\u0000${masked.length - 1}\u0000`
    },
  )
  const bracketRe = /\[((?:녹음본|페이지|Recording|Page)\s*\d+(?:\s*[,·]\s*(?:(?:녹음본|페이지|Recording|Page)\s*)?\d+)*)\](?!\()/gi
  const replaced = protectedText.replace(bracketRe, (full, inner: string) => {
    let prevWord = '녹음본'
    const links: string[] = []
    for (const part of inner.split(/[,·]/)) {
      const m = part.trim().match(/^(녹음본|페이지|Recording|Page)?\s*(\d+)$/i)
      if (!m) return full
      const word = m[1] ?? prevWord
      const no = m[2]
      const type: 'recording' | 'material' = /녹음본|recording/i.test(word) ? 'recording' : 'material'
      prevWord = word
      links.push(`[${word} ${no}](#cite-${type}-${no})`)
    }
    return links.join('')
  })
  return replaced.replace(/\u0000(\d+)\u0000/g, (_m, i) => masked[Number(i)])
}

// React.memo: 부모(풀이화면)가 "경과 시간" 타이머로 매초 리렌더돼도 markdown/className 이
// 그대로면 이 컴포넌트는 리렌더하지 않는다. (리렌더 시 react-markdown 이 텍스트 노드를 재생성 →
// 드래그 중이던 텍스트 선택이 풀리며 "다른 범위로 튀는" 버그가 났음)
// onCitationClick/citationMessageIndex 를 넘길 때는 호출부에서 stable 참조(useCallback)를 유지할 것.
export const MarkdownMessage = React.memo(function MarkdownMessage({ markdown, className, headingSize = 'default', onCitationClick, citationMessageIndex, expandedCitation, expandedCitationCard }: MarkdownMessageProps) {
  const isCompact = headingSize === 'compact'
  const content = cjkFriendlyEmphasis(onCitationClick ? linkifyCitations(markdown ?? '') : (markdown ?? ''))
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        // NOTE: do not enable raw HTML rendering for safety
        components={{
          h1: ({ children }) => (
            <h1 className={isCompact
              ? "text-sm font-bold mb-1 mt-2 first:mt-0 text-gray-900 dark:text-gray-100"
              : "text-lg font-bold mb-2.5 mt-4 first:mt-0 text-gray-900 dark:text-gray-100"
            }>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className={isCompact
              ? "mb-1 mt-2 first:mt-0 text-sm font-semibold text-gray-900 dark:text-gray-100"
              : "mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100"
            }>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className={isCompact
              ? "mb-1 mt-2 first:mt-0 text-xs font-semibold text-gray-900 dark:text-gray-100"
              : "mb-2 text-base font-semibold text-gray-900 dark:text-gray-100"
            }>{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-snug text-sm">{children}</p>,
          a: ({ href, children }) => {
            // linkifyCitations 가 만든 출처 링크(#cite-<type>-<no>)는 클릭 가능한 칩 버튼으로 렌더링
            const citeMatch = href?.match(/^#cite-(recording|material)-(\d+)$/)
            if (citeMatch && onCitationClick) {
              const type = citeMatch[1] as 'recording' | 'material'
              const no = Number(citeMatch[2])
              // 모바일 인라인 아코디언: 펼쳐진 칩이면 강조 스타일 + 칩 바로 아래에 카드 렌더
              const isExpanded =
                !!expandedCitation && expandedCitation.type === type && expandedCitation.no === no
              return (
                <>
                  <button
                    type="button"
                    aria-expanded={isExpanded || undefined}
                    onClick={() => onCitationClick({ type, no }, citationMessageIndex ?? -1)}
                    className={`mx-0.5 inline-flex items-center rounded-full border px-1.5 py-px align-baseline text-[11px] font-medium leading-tight transition-colors ${
                      isExpanded
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-indigo-500 dark:hover:bg-indigo-950 dark:hover:text-indigo-300'
                    }`}
                  >
                    {children}
                  </button>
                  {isExpanded && expandedCitationCard}
                </>
              )
            }
            return <a href={href}>{children}</a>
          },
          strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc ml-5 mb-2 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-5 mb-2 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-snug text-sm">{children}</li>,
          code: ({ children, className }) => {
            // remark-math represents inline math as: <code class="language-math">...</code>
            if (className?.includes('language-math')) {
              const formula = String(children ?? '').replace(/\n$/, '')
              const mathml = katex.renderToString(formula, {
                throwOnError: false,
                strict: 'ignore',
                displayMode: false,
                output: 'htmlAndMathml',
              })

              return <span dangerouslySetInnerHTML={{ __html: mathml }} />
            }

            return <code className="text-xs text-gray-800 dark:text-gray-200 font-mono leading-snug">{children}</code>
          },
          pre: ({ children }) => {
            // remark-math represents block math as: <pre><code class="language-math">...</code></pre>
            const firstChild = React.Children.toArray(children)[0] as React.ReactElement | undefined
            const codeClassName = (firstChild as any)?.props?.className as string | undefined
            if (codeClassName?.includes('language-math')) {
              const raw = (firstChild as any)?.props?.children
              const formula = String(raw ?? '').replace(/\n$/, '')
              const mathml = katex.renderToString(formula, {
                throwOnError: false,
                strict: 'ignore',
                displayMode: true,
                output: 'htmlAndMathml',
              })

              return <div dangerouslySetInnerHTML={{ __html: mathml }} />
            }

            return <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 my-2 overflow-x-auto border border-gray-200 dark:border-gray-700">{children}</pre>
          },
          // Keep current UX: do not render horizontal rules (---)
          hr: () => null,
          // Tables (GFM)
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto -mx-1 sm:mx-0 scroll-x-wrapper">
              <table className="min-w-full sm:min-w-[560px] w-full border-collapse border border-gray-200 dark:border-gray-700 text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50 dark:bg-gray-800">{children}</thead>,
          tbody: ({ children }) => <tbody className="bg-white dark:bg-gray-900">{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-gray-200 dark:border-gray-700 px-3 py-2 align-top">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
