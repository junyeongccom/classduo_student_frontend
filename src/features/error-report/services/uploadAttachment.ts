import { getSupabaseClient } from '@/shared/lib/supabase';

const BUCKET_NAME = 'error-report-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * 오류 신고 첨부파일 업로드
 * @param file 업로드할 파일
 * @param userId 사용자 ID (파일 경로 구분용)
 * @returns 업로드 결과 (성공 시 public URL 포함)
 */
export async function uploadErrorReportAttachment(
  file: File,
  userId: string
): Promise<UploadResult> {
  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: '파일 크기는 10MB 이하여야 합니다.',
    };
  }

  // 허용된 파일 타입 검증
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: '지원하지 않는 파일 형식입니다. (이미지, PDF, 문서 파일만 가능)',
    };
  }

  try {
    const supabase = getSupabaseClient();

    // 고유한 파일명 생성
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedName}`;

    // 파일 업로드
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      if (process.env.NODE_ENV === 'development') console.error('File upload error:', uploadError);
      return {
        success: false,
        error: '파일 업로드에 실패했습니다. 다시 시도해주세요.',
      };
    }

    // Public URL 가져오기
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
    };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('Upload error:', error);
    return {
      success: false,
      error: '파일 업로드 중 오류가 발생했습니다.',
    };
  }
}
