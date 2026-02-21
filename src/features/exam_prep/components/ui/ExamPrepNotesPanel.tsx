"use client"

import { useEffect, useMemo, useRef } from "react"
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react"
import type { PartialBlock } from "@blocknote/core"
import "@blocknote/react/style.css"
import { useTranslations } from "next-intl"
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

export function ExamPrepNotesPanel({
  mode,
  onModeChange,
  pageCount,
  selectedPage,
  onSelectPage,
  noteContent,
  onChange,
}: ExamPrepNotesPanelProps) {
  const t = useTranslations('examPrep.notes')

  const defaultContent = useMemo<PartialBlock[]>(() => [
    { type: "paragraph", content: t('placeholder') },
  ], [t])

  const editor = useCreateBlockNote({
    initialContent: noteContent ?? defaultContent,
  })
  const lastApplied = useRef<string>("")

  const pages = useMemo(() => {
    return Array.from({ length: pageCount }, (_, index) => index + 1)
  }, [pageCount])

  useEffect(() => {
    const serialized = JSON.stringify(noteContent ?? defaultContent)
    if (serialized === lastApplied.current) return
    lastApplied.current = serialized
    editor.replaceBlocks(editor.document, noteContent ?? defaultContent)
  }, [editor, noteContent, defaultContent])

  const insertTemplate = (block: PartialBlock) => {
    const cursor = editor.getTextCursorPosition()
    editor.insertBlocks([block], cursor.block, "after")
  }

  const templates: Array<{ id: string; label: string; block: PartialBlock }> = [
    { id: "h1", label: t('template.h1.label'), block: { type: "heading", props: { level: 1 }, content: t('template.h1.content') } },
    { id: "h2", label: t('template.h2.label'), block: { type: "heading", props: { level: 2 }, content: t('template.h2.content') } },
    { id: "bullets", label: t('template.bullet.label'), block: { type: "bulletListItem", content: t('template.bullet.content') } },
    { id: "check", label: t('template.check.label'), block: { type: "checkListItem", content: t('template.check.content') } },
    { id: "table", label: t('template.table.label'), block: { type: "paragraph", content: t('template.table.content') } },
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
          {t('singleNote')}
        </button>
        <button
          type="button"
          onClick={() => onModeChange("page")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium",
            mode === "page" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600"
          )}
        >
          {t('pageNote')}
        </button>
        {mode === "page" && (
          <select
            value={selectedPage}
            onChange={event => onSelectPage(Number(event.target.value))}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            {pages.map(page => (
              <option key={page} value={page}>
                {t('pageLabel', { page })}
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
