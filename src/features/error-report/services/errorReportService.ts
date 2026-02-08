import { apiRequest } from '@/shared/lib/api';
import {
  CreateErrorReportRequest,
  CreateErrorReportResponse
} from '../types';

const ERROR_REPORT_ENDPOINT = '/error-reports';

// 오류 신고 생성 API
export async function createErrorReport(
  data: CreateErrorReportRequest
): Promise<CreateErrorReportResponse> {
  const response = await apiRequest<CreateErrorReportResponse>(
    ERROR_REPORT_ENDPOINT,
    {
      method: 'POST',
      body: data,
      auth: true,
    }
  );

  if (response.error) {
    throw new Error(response.error.message || '오류 신고 제출에 실패했습니다.');
  }

  return response.data!;
}
