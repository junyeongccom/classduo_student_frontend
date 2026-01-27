'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { examPrepService } from '../services/examPrepService'
import type { ExamPrepNoteScope } from '../types'
import { useExamPrepNotesStore, type ExamPrepAnnotationEntry, type ExamPrepNoteEntry } from '../store/useExamPrepNotesStore'

const NOTES_STORAGE_PREFIX = 'exam_prep_notes'
const ANNOTATIONS_STORAGE_PREFIX = 'exam_prep_annotations'
const NOTE_MODE_PREFIX = 'exam_prep_note_mode'

type LocalNotesPayload = {
  single?: ExamPrepNoteEntry
  pages: Record<number, ExamPrepNoteEntry>
}

type LocalAnnotationsPayload = Record<number, ExamPrepAnnotationEntry>

const readLocalJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const writeLocalJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

const pickLatest = (local?: ExamPrepNoteEntry, remote?: ExamPrepNoteEntry) => {
  if (!local) return remote
  if (!remote) return local
  const localTime = local.updatedAt ? Date.parse(local.updatedAt) : 0
  const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0
  return localTime >= remoteTime ? local : remote
}

const pickLatestAnnotation = (local?: ExamPrepAnnotationEntry, remote?: ExamPrepAnnotationEntry) => {
  if (!local) return remote
  if (!remote) return local
  const localTime = local.updatedAt ? Date.parse(local.updatedAt) : 0
  const remoteTime = remote.updatedAt ? Date.parse(remote.updatedAt) : 0
  return localTime >= remoteTime ? local : remote
}

export function useExamPrepNotes(materialId: string | null) {
  const { user } = useAuthStore()
  const userId = user?.user_id ?? null
  const {
    noteModes,
    notesByMaterial,
    annotationsByMaterial,
    setNoteMode,
    setNotesForMaterial,
    setNoteEntry,
    setAnnotationsForMaterial,
    setAnnotationEntry,
    resetMaterial,
  } = useExamPrepNotesStore()

  const noteSyncTimers = useRef<Record<string, number>>({})
  const annotationSyncTimers = useRef<Record<string, number>>({})

  const noteMode = materialId ? noteModes[materialId] ?? 'single' : 'single'
  const notes = materialId ? notesByMaterial[materialId] ?? { pages: {} } : { pages: {} }
  const annotations = materialId ? annotationsByMaterial[materialId] ?? {} : {}

  const storageKeys = useMemo(() => {
    if (!materialId) return null
    const suffix = userId ?? "anonymous"
    return {
      notes: `${NOTES_STORAGE_PREFIX}:${materialId}:${suffix}`,
      annotations: `${ANNOTATIONS_STORAGE_PREFIX}:${materialId}:${suffix}`,
      mode: `${NOTE_MODE_PREFIX}:${materialId}:${suffix}`,
    }
  }, [materialId, userId])

  useEffect(() => {
    if (!materialId || !storageKeys) return

    const localNotes = readLocalJson<LocalNotesPayload>(storageKeys.notes, { pages: {} })
    const localAnnotations = readLocalJson<LocalAnnotationsPayload>(storageKeys.annotations, {})
    const localMode = readLocalJson<ExamPrepNoteScope>(storageKeys.mode, 'single')

    setNoteMode(materialId, localMode)
    setNotesForMaterial(materialId, localNotes)
    setAnnotationsForMaterial(materialId, localAnnotations)

    const fetchRemote = async () => {
      const [singleNotesResult, pageNotesResult, annotationsResult] = await Promise.all([
        examPrepService.getNotes(materialId, 'single'),
        examPrepService.getNotes(materialId, 'page'),
        examPrepService.getAnnotations(materialId),
      ])

      if (singleNotesResult.data || pageNotesResult.data) {
        const remoteNotes: LocalNotesPayload = { pages: {} }

        const single = singleNotesResult.data?.notes?.[0]
        if (single) {
          remoteNotes.single = {
            content: (single.content_json as Record<string, unknown>) ?? { blocks: [] },
            updatedAt: single.updated_at ?? null,
          }
        }

        const pageNotes = pageNotesResult.data?.notes ?? []
        pageNotes.forEach(note => {
          remoteNotes.pages[note.page_number] = {
            content: (note.content_json as Record<string, unknown>) ?? { blocks: [] },
            updatedAt: note.updated_at ?? null,
          }
        })

        const merged: LocalNotesPayload = {
          single: pickLatest(localNotes.single, remoteNotes.single),
          pages: {},
        }

        const pageKeys = new Set([
          ...Object.keys(localNotes.pages).map(Number),
          ...Object.keys(remoteNotes.pages).map(Number),
        ])

        pageKeys.forEach(pageNumber => {
          merged.pages[pageNumber] = pickLatest(localNotes.pages[pageNumber], remoteNotes.pages[pageNumber]) as ExamPrepNoteEntry
        })

        setNotesForMaterial(materialId, merged)
        writeLocalJson(storageKeys.notes, merged)
      }

      if (annotationsResult.data) {
        const remoteAnnotations: LocalAnnotationsPayload = {}
        annotationsResult.data.annotations.forEach(annotation => {
          remoteAnnotations[annotation.page_number] = {
            data: annotation.data_json ?? {},
            updatedAt: annotation.updated_at ?? null,
          }
        })

        const merged: LocalAnnotationsPayload = {}
        const pageKeys = new Set([
          ...Object.keys(localAnnotations).map(Number),
          ...Object.keys(remoteAnnotations).map(Number),
        ])

        pageKeys.forEach(pageNumber => {
          merged[pageNumber] = pickLatestAnnotation(localAnnotations[pageNumber], remoteAnnotations[pageNumber]) as ExamPrepAnnotationEntry
        })

        setAnnotationsForMaterial(materialId, merged)
        writeLocalJson(storageKeys.annotations, merged)
      }
    }

    fetchRemote()

    return () => {
      resetMaterial(materialId)
    }
  }, [materialId, resetMaterial, setAnnotationsForMaterial, setNoteMode, setNotesForMaterial, storageKeys])

  const updateNoteMode = (mode: ExamPrepNoteScope) => {
    if (!materialId || !storageKeys) return
    setNoteMode(materialId, mode)
    writeLocalJson(storageKeys.mode, mode)
  }

  const saveNote = (scope: ExamPrepNoteScope, pageNumber: number, content: Record<string, unknown>) => {
    if (!materialId || !storageKeys) return
    const updatedAt = new Date().toISOString()
    const entry: ExamPrepNoteEntry = { content, updatedAt }
    setNoteEntry(materialId, scope, pageNumber, entry)

    const currentNotes = notesByMaterial[materialId] ?? { pages: {} }
    const nextNotes =
      scope === 'single'
        ? { ...currentNotes, single: entry }
        : { ...currentNotes, pages: { ...currentNotes.pages, [pageNumber]: entry } }
    writeLocalJson(storageKeys.notes, nextNotes)

    const syncKey = `${materialId}:${scope}:${pageNumber}`
    if (noteSyncTimers.current[syncKey]) {
      window.clearTimeout(noteSyncTimers.current[syncKey])
    }
    noteSyncTimers.current[syncKey] = window.setTimeout(async () => {
      await examPrepService.saveNote(materialId, {
        note_scope: scope,
        page_number: pageNumber,
        content_json: content,
      })
    }, 800)
  }

  const saveAnnotation = (pageNumber: number, data: Record<string, unknown>) => {
    if (!materialId || !storageKeys) return
    const updatedAt = new Date().toISOString()
    const entry: ExamPrepAnnotationEntry = { data, updatedAt }
    setAnnotationEntry(materialId, pageNumber, entry)

    const current = annotationsByMaterial[materialId] ?? {}
    writeLocalJson(storageKeys.annotations, { ...current, [pageNumber]: entry })

    const syncKey = `${materialId}:${pageNumber}`
    if (annotationSyncTimers.current[syncKey]) {
      window.clearTimeout(annotationSyncTimers.current[syncKey])
    }
    annotationSyncTimers.current[syncKey] = window.setTimeout(async () => {
      await examPrepService.saveAnnotation(materialId, {
        page_number: pageNumber,
        data_json: data,
      })
    }, 600)
  }

  return {
    noteMode,
    notes,
    annotations,
    setNoteMode: updateNoteMode,
    saveNote,
    saveAnnotation,
  }
}

