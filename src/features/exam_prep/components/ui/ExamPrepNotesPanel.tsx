"use client"

import { useEffect, useMemo, useRef } from "react"
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react"
import type { PartialBlock } from "@blocknote/core"
import "@blocknote/react/style.css"
import type { ExamPrepNoteScope } from "../../types"
import { cn } from "@/shared/lib/utils"

type ExamPrepNotesPanelProps = {
  mode: ExamPrepNoteScope
  onModeChange: (mode: ExamPrepNoteScope) => void
  pageCount: number
  selectedPage: number
  onSelectPage: (page: number) => void
  noteContent: PartialBlock[] | null
  onChange: (content: PartialBlock[]) => void
}

const DEFAULT_CONTENT: PartialBlock[] = [
  {
    type: "paragraph",
    content: "노트를 입력하세요.",
  },
]

export function ExamPrepNotesPanel({
  mode,
  onModeChange,
  pageCount,
  selectedPage,
  onSelectPage,
  noteContent,
  onChange,
}: ExamPrepNotesPanelProps) {
  const editor = useCreateBlockNote({
    initialContent: noteContent ?? DEFAULT_CONTENT,
  })
  const lastApplied = useRef<string>("")

  const pages = useMemo(() => {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }, [pageCount])

  useEffect(() => {
    const serialized = JSON.stringify(noteContent ?? DEFAULT_CONTENT)
    if (serialized === lastApplied.current) return
    lastApplied.current = serialized
    editor.replaceBlocks(editor.document, noteContent ?? DEFAULT_CONTENT)
  }, [editor, noteContent])

  const insertTemplate = (block: PartialBlock) => {
    const cursor = editor.getTextCursorPosition()
    editor.insertBlocks([block], cursor.block, "after")
  }

  const templates: Array<{ id: string; label: string; block: PartialBlock }> = [
    { id: "h1", label: "제목1", block: { type: "heading", props: { level: 1 }, content: "제목" } },
    { id: "h2", label: "제목2", block: { type: "heading", props: { level: 2 }, content: "소제목" } },
    { id: "bullets", label: "글머리", block: { type: "bulletListItem", content: "항목" } },
    { id: "check", label: "체크리스트", block: { type: "checkListItem", content: "할 일" } },
    // NOTE: BlockNote table block schema is not a simple string[][], so keep the template as a safe placeholder.
    { id: "table", label: "표", block: { type: "paragraph", content: "표(테이블) 템플릿은 준비 중입니다." } },
  ]

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onModeChange("single")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium",
            mode === "single" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600"
          )}
        >
          단일 노트
        </button>
        <button
          type="button"
          onClick={() => onModeChange("page")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium",
            mode === "page" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600"
          )}
        >
          페이지별 노트
        </button>
        {mode === "page" && (
          <select
            value={selectedPage}
            onChange={event => onSelectPage(Number(event.target.value))}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            {pages.map(page => (
              <option key={page} value={page}>
                {page} 페이지
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {templates.map(template => (
          <button
            key={template.id}
            type="button"
            onClick={() => insertTemplate(template.block)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300"
          >
            {template.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto rounded-2xl border border-gray-200 bg-white p-3">
        <BlockNoteViewRaw
          editor={editor}
          onChange={() => onChange(editor.document)}
          className="min-h-[400px]"
          sideMenu={false}
          slashMenu={false}
          formattingToolbar={false}
          linkToolbar={false}
          filePanel={false}
          tableHandles={false}
          emojiPicker={false}
        />
      </div>
    </div>
  )
}

