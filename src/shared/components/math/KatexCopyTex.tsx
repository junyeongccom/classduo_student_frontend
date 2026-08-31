/**
 * @file KatexCopyTex.tsx
 * @description KaTeX 렌더 수식 복사 시 레이아웃 조각 대신 LaTeX 원문이 복사되게 하는 전역 장착 컴포넌트
 * @module shared/components/math
 * @dependencies katex/dist/contrib/copy-tex
 *
 * 렌더된 수식을 드래그 복사하면 위첨자·기호가 줄바꿈 조각으로 클립보드에 들어가
 * 서술형 답안에 붙여넣을 때 정렬이 깨진다(실측: "(2x+3)" 다음 줄에 "2").
 * copy-tex 는 document copy 이벤트에서 .katex 선택 영역을 LaTeX 원문($...$)으로 바꿔준다.
 * 서술형 채점은 LaTeX·평문 표기 모두 관용 처리하므로 붙여넣은 원문 그대로 채점 가능하다.
 */
'use client'

import { useEffect } from 'react'

export function KatexCopyTex() {
  useEffect(() => {
    // document 에 copy 리스너를 붙이는 사이드이펙트 모듈이라 클라이언트에서 1회만 로드
    // @ts-expect-error — copy-tex 는 사이드이펙트 전용 모듈이라 타입 선언이 없다
    import('katex/dist/contrib/copy-tex')
  }, [])
  return null
}
