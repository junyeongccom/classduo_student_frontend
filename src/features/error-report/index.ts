// Error Report Feature Public API
export { ErrorReportModalContainer } from './components/containers/ErrorReportModalContainer';
export { useErrorReportStore } from './store/useErrorReportStore';
export type { ErrorReportPrefill } from './store/useErrorReportStore';
export type { ErrorReportPrefillData } from './components/ui/ErrorReportModal';
export type {
  CreateErrorReportRequest,
  CreateErrorReportResponse,
  OccurrenceContext,
  FeedbackCategory,
} from './types';
export { OCCURRENCE_CONTEXT_LABELS, FEEDBACK_CATEGORY_LABELS } from './types';
export { createErrorReport } from './services/errorReportService';

// Feedback Modal (새 UI)
export { FeedbackModalContainer } from './components/containers/FeedbackModalContainer';
export { useFeedbackStore } from './store/useFeedbackStore';
