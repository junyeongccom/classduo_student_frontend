/**
 * @file RecordingChunksModal.tsx
 * @description 강의 녹음본 청크 목록 모달 — input_snapshot_id 기반 녹음본 조회 + 청크별 표시/다운로드
 * @module features/lecture-study/components/ui
 * @dependencies lectureService, lucide-react
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { X, Mic, Play, Clock, Download, Loader2 } from 'lucide-react'
import {
  lectureService,
  type SnapshotRecordingItem,
  type SnapshotChunkSummary,
} from '../../services/lectureService'

interface RecordingChunksModalProps {
  open: boolean
  onClose: () => void
  lectureId: string
  lectureLabel: string
}

interface FlatChunk extends SnapshotChunkSummary {
  recording: SnapshotRecordingItem
}

/** 초 → MM:SS */
function formatTime(seconds: number | null): string {
  if (seconds == null) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 텍스트를 .txt 파일로 브라우저 다운로드 */
function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** 청크 하나를 텍스트 파일로 변환 */
function buildChunkText(chunk: FlatChunk, label: string): string {
  const lines: string[] = []
  const title = chunk.title ?? label
  lines.push(title)
  lines.push('='.repeat(title.length))
  lines.push('')
  lines.push(`구간: ${formatTime(chunk.start_time)} - ${formatTime(chunk.end_time)}`)
  lines.push('')
  if (chunk.content) {
    lines.push(chunk.content)
  }
  return lines.join('\n')
}

export function RecordingChunksModal({
  open,
  onClose,
  lectureId,
  lectureLabel,
}: RecordingChunksModalProps) {
  const locale = useLocale()
  const [recordings, setRecordings] = useState<SnapshotRecordingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const result = await lectureService.getSnapshotSelections(lectureId)
    if (result.data) {
      setRecordings(
        result.data.recordings.filter(
          r => r.status === 'COMPLETED' || r.status === 'DONE' || r.step === 'INDEXED',
        ),
      )
    }
    setIsLoading(false)
  }, [lectureId])

  useEffect(() => {
    if (open) fetchData()
  }, [open, fetchData])

  if (!open) return null

  const allChunks: FlatChunk[] = recordings.flatMap(rec =>
    (rec.chunk_summaries ?? []).map(chunk => ({ ...chunk, recording: rec })),
  )

  const getChunkLabel = (chunk: FlatChunk) =>
    chunk.title ??
    (locale === 'ko'
      ? `${lectureLabel} - 파트 ${chunk.chunk_index + 1}`
      : `${lectureLabel} - Part ${chunk.chunk_index + 1}`)

  const handleDownloadOne = (chunk: FlatChunk) => {
    const label = getChunkLabel(chunk)
    const text = buildChunkText(chunk, label)
    const safeFilename = label.replace(/[/\\?%*:|"<>]/g, '_')
    downloadTextFile(`${safeFilename}.txt`, text)
  }

  const handleDownloadAll = () => {
    allChunks.forEach(chunk => handleDownloadOne(chunk))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#6366F1]/10 p-2">
              <Mic className="h-6 w-6 text-[#6366F1]" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              {locale === 'ko' ? '강의 녹음본' : 'Lecture Recordings'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : allChunks.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              {locale === 'ko' ? '녹음본이 없습니다' : 'No recordings available'}
            </div>
          ) : (
            allChunks.map(chunk => (
              <div
                key={`${chunk.recording.recording_id}-${chunk.chunk_index}`}
                className="group flex items-center justify-between rounded-lg p-4 transition-all hover:bg-gray-50"
              >
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors group-hover:bg-[#6366F1]/20 group-hover:text-[#6366F1]">
                    <Play className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-tight text-gray-900">
                      {getChunkLabel(chunk)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        {formatTime(chunk.start_time)} - {formatTime(chunk.end_time)}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadOne(chunk)}
                  className="ml-3 flex shrink-0 items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition-all hover:border-[#6366F1] hover:text-[#6366F1]"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">
                    {locale === 'ko' ? '다운로드' : 'Download'}
                  </span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {allChunks.length > 0 && (
          <footer className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/50 p-6">
            <button
              onClick={handleDownloadAll}
              className="rounded-lg bg-[#6366F1] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#6366F1]/20 transition-all hover:bg-[#6366F1]/90"
            >
              {locale === 'ko' ? '모두 다운로드' : 'Download All'}
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}
