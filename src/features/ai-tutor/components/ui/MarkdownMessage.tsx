'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import katex from 'katex'

type MarkdownMessageProps = {
  markdown: string
  className?: string
  /**
   * 헤더 크기 모드.
   * - 'default': 일반 답변/문서용 (h2 = text-lg)
   * - 'compact': 인라인 영역용 (퀴즈 상세 설명 등). 헤더가 작고 위/아래 마진 작음.
   */
  headingSize?: 'default' | 'compact'
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

// React.memo: 부모(풀이화면)가 "경과 시간" 타이머로 매초 리렌더돼도 markdown/className 이
// 그대로면 이 컴포넌트는 리렌더하지 않는다. (리렌더 시 react-markdown 이 텍스트 노드를 재생성 →
// 드래그 중이던 텍스트 선택이 풀리며 "다른 범위로 튀는" 버그가 났음)
export const MarkdownMessage = React.memo(function MarkdownMessage({ markdown, className, headingSize = 'default' }: MarkdownMessageProps) {
  const isCompact = headingSize === 'compact'
  const content = cjkFriendlyEmphasis(markdown ?? '')
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
                output: 'mathml',
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
                output: 'mathml',
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
