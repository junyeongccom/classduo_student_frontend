'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import katex from 'katex'

type MarkdownMessageProps = {
  markdown: string
  className?: string
}

export function MarkdownMessage({ markdown, className }: MarkdownMessageProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        // NOTE: do not enable raw HTML rendering for safety
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mb-2.5 mt-4 first:mt-0 text-gray-900">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 text-lg font-semibold text-gray-900">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 text-base font-semibold text-gray-900">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-snug text-sm">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
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

            return <code className="text-xs text-gray-800 font-mono leading-snug">{children}</code>
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

            return <pre className="bg-gray-100 rounded-lg p-3 my-2 overflow-x-auto border border-gray-200">{children}</pre>
          },
          // Keep current UX: do not render horizontal rules (---)
          hr: () => null,
          // Tables (GFM)
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="min-w-[560px] w-full border-collapse border border-gray-200 text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
          tbody: ({ children }) => <tbody className="bg-white">{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-gray-200 last:border-b-0">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-900 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-gray-200 px-3 py-2 align-top">{children}</td>,
        }}
      >
        {markdown ?? ''}
      </ReactMarkdown>
    </div>
  )
}


