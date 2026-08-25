/**
 * @file LegalDocument.tsx
 * @description 법적 문서(약관·처리방침) 공통 렌더러 — props 기반 렌더링만
 * @module features/consent
 * @dependencies 없음
 */
export interface LegalTable {
  headers: string[]
  rows: string[][]
}

export interface LegalArticle {
  heading: string
  paragraphs?: string[]
  list?: string[]
  table?: LegalTable
  note?: string
}

export interface LegalDocumentProps {
  title: string
  effectiveLabel: string
  /** 법률검토 배너 문구 — 현재 화면에 노출하지 않음(문구는 보존) */
  draftWarning?: string
  intro?: string
  articles: LegalArticle[]
  footer?: string
}

export function LegalDocument({
  title,
  effectiveLabel,
  intro,
  articles,
  footer,
}: LegalDocumentProps) {
  return (
    <article className="text-gray-800 dark:text-gray-200">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">{title}</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{effectiveLabel}</p>

      {intro && (
        <p className="mt-6 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{intro}</p>
      )}

      <div className="mt-8 space-y-9 text-sm leading-relaxed">
        {articles.map((article) => (
          <section key={article.heading}>
            <h2 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-50">
              {article.heading}
            </h2>

            {article.paragraphs?.map((p, i) => (
              <p key={i} className="mb-2 text-gray-700 dark:text-gray-300">
                {p}
              </p>
            ))}

            {article.list && (
              <ol className="mb-2 list-decimal space-y-1 pl-5 text-gray-700 dark:text-gray-300">
                {article.list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            )}

            {article.table && (
              <div className="my-3 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                <table className="w-full min-w-[32rem] text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      {article.table.headers.map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap px-3 py-2 font-medium text-gray-900 dark:text-gray-100"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {article.table.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {article.note && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{article.note}</p>
            )}
          </section>
        ))}
      </div>

      {footer && (
        <p className="mt-10 border-t border-gray-200 pt-5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          {footer}
        </p>
      )}
    </article>
  )
}
