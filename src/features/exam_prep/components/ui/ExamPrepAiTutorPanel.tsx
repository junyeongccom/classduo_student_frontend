"use client"

import { ExamPrepLoadingState } from './ExamPrepLoadingState'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ReferenceItem {
  type: string
  source_id: string
  content: string
  metadata?: Record<string, unknown>
  citations?: Array<{ start: number; end: number; text: string }>
}

interface ExamPrepAiTutorPanelProps {
  messages: ChatMessage[]
  references: ReferenceItem[]
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSend: () => void
  onReset: () => void
  emptyText: string
  loadingMessage: string
}

export function ExamPrepAiTutorPanel({
  messages,
  references,
  input,
  isLoading,
  onInputChange,
  onSend,
  onReset,
  emptyText,
  loadingMessage,
}: ExamPrepAiTutorPanelProps) {
  if (isLoading && messages.length === 0) {
    return <ExamPrepLoadingState message={loadingMessage} />
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden px-6 py-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">AI 조교</h3>
        <button
          onClick={onReset}
          className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:border-gray-300 hover:text-gray-700"
        >
          새 채팅
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-gray-200 bg-white px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">{emptyText}</div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                message.role === 'user'
                  ? 'ml-auto bg-gray-200 text-gray-900'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {message.content}
            </div>
          ))
        )}
        {isLoading ? (
          <div className="text-xs text-gray-400">{loadingMessage}</div>
        ) : null}
      </div>

      {references.length > 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-500">
          <p className="mb-2 text-sm font-semibold text-gray-700">출처</p>
          <div className="space-y-2">
            {references.map((ref, index) => (
              <div key={`${ref.source_id}-${index}`} className="space-y-1">
                <p className="text-gray-700">{ref.content}</p>
                {ref.metadata?.page ? (
                  <p className="text-[11px] text-gray-400">페이지 {ref.metadata.page as number}</p>
                ) : null}
                {ref.citations?.length ? (
                  <div className="rounded-lg bg-gray-50 px-2 py-1 text-[11px] text-gray-400">
                    {ref.citations.map(citation => citation.text).join(' · ')}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={event => onInputChange(event.target.value)}
          placeholder="AI 조교에게 질문해보세요"
          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
        />
        <button
          onClick={onSend}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          전송
        </button>
      </div>
    </div>
  )
}

