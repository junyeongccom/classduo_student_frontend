import { create } from 'zustand'
import type { ExamPrepNoteScope } from '../types'

export type ExamPrepNoteEntry = {
  content: Record<string, unknown>
  updatedAt?: string | null
}

export type ExamPrepAnnotationEntry = {
  data: Record<string, unknown>
  updatedAt?: string | null
}

type NotesState = {
  noteModes: Record<string, ExamPrepNoteScope>
  notesByMaterial: Record<
    string,
    {
      single?: ExamPrepNoteEntry
      pages: Record<number, ExamPrepNoteEntry>
    }
  >
  annotationsByMaterial: Record<string, Record<number, ExamPrepAnnotationEntry>>
}

type NotesActions = {
  setNoteMode: (materialId: string, mode: ExamPrepNoteScope) => void
  setNotesForMaterial: (
    materialId: string,
    notes: { single?: ExamPrepNoteEntry; pages: Record<number, ExamPrepNoteEntry> }
  ) => void
  setNoteEntry: (materialId: string, scope: ExamPrepNoteScope, pageNumber: number, entry: ExamPrepNoteEntry) => void
  setAnnotationsForMaterial: (materialId: string, annotations: Record<number, ExamPrepAnnotationEntry>) => void
  setAnnotationEntry: (materialId: string, pageNumber: number, entry: ExamPrepAnnotationEntry) => void
  resetMaterial: (materialId: string) => void
}

export const useExamPrepNotesStore = create<NotesState & NotesActions>(set => ({
  noteModes: {},
  notesByMaterial: {},
  annotationsByMaterial: {},
  setNoteMode: (materialId, mode) =>
    set(state => ({
      noteModes: { ...state.noteModes, [materialId]: mode },
    })),
  setNotesForMaterial: (materialId, notes) =>
    set(state => ({
      notesByMaterial: { ...state.notesByMaterial, [materialId]: notes },
    })),
  setNoteEntry: (materialId, scope, pageNumber, entry) =>
    set(state => {
      const current = state.notesByMaterial[materialId] ?? { pages: {} }
      const updated =
        scope === 'single'
          ? { ...current, single: entry }
          : { ...current, pages: { ...current.pages, [pageNumber]: entry } }
      return { notesByMaterial: { ...state.notesByMaterial, [materialId]: updated } }
    }),
  setAnnotationsForMaterial: (materialId, annotations) =>
    set(state => ({
      annotationsByMaterial: { ...state.annotationsByMaterial, [materialId]: annotations },
    })),
  setAnnotationEntry: (materialId, pageNumber, entry) =>
    set(state => {
      const current = state.annotationsByMaterial[materialId] ?? {}
      return {
        annotationsByMaterial: {
          ...state.annotationsByMaterial,
          [materialId]: { ...current, [pageNumber]: entry },
        },
      }
    }),
  resetMaterial: materialId =>
    set(state => {
      const { [materialId]: _notes, ...restNotes } = state.notesByMaterial
      const { [materialId]: _annotations, ...restAnnotations } = state.annotationsByMaterial
      const { [materialId]: _mode, ...restModes } = state.noteModes
      return {
        notesByMaterial: restNotes,
        annotationsByMaterial: restAnnotations,
        noteModes: restModes,
      }
    }),
}))

