import { create } from 'zustand';
import type { OccurrenceContext } from '../types';

export interface ErrorReportPrefill {
  content?: string;
  occurrenceContext?: OccurrenceContext;
  occurrenceTime?: string; // ISO 8601 형식
  courseName?: string;
  lectureDate?: string;
  errorMessage?: string;
  systemErrorMessage?: string; // 시스템 에러 로그 (상세 로그)
}

interface ErrorReportStore {
  isOpen: boolean;
  prefill: ErrorReportPrefill | null;

  // 신고창 열기 (에러 정보와 함께)
  openWithPrefill: (prefill: ErrorReportPrefill) => void;

  // 신고창 열기 (빈 상태)
  open: () => void;

  // 신고창 닫기
  close: () => void;

  // prefill 초기화
  clearPrefill: () => void;
}

export const useErrorReportStore = create<ErrorReportStore>((set) => ({
  isOpen: false,
  prefill: null,

  openWithPrefill: (prefill) => {
    set({ isOpen: true, prefill });
  },

  open: () => {
    set({ isOpen: true, prefill: null });
  },

  close: () => {
    set({ isOpen: false });
  },

  clearPrefill: () => {
    set({ prefill: null });
  },
}));
