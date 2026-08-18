/**
 * @file MathText.tsx
 * @description 평문 속 LaTeX 수식($...$, $$...$$)을 KaTeX(HTML+MathML)로 렌더링
 * @module shared/components/math
 * @dependencies katex, shared/lib/math/splitMathSegments
 */

'use client'

import { useMemo } from 'react'
import katex from 'katex'
import { splitMathSegments } from '@/shared/lib/math/splitMathSegments'

interface MathTextProps {
  text: string
  className?: string
}

export function MathText({ text, className }: MathTextProps) {
  const segments = useMemo(() => splitMathSegments(text), [text])

  if (segments.length === 0) return null

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.value}</span>
        }
        const html = katex.renderToString(segment.value, {
          throwOnError: false,
          strict: 'ignore',
          displayMode: segment.type === 'block',
          output: 'htmlAndMathml',
        })
        return segment.type === 'block' ? (
          <span key={index} className="my-1 block overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
        )
      })}
    </span>
  )
}
