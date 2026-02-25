/**
 * 강의 회차 관련 유틸리티 함수
 */

/**
 * 주차/차시 계산 결과
 */
export interface WeekAndSession {
  weekNo: number;
  sessionNo: number;
}

/**
 * 강의 정보 (주차/차시 계산용)
 */
export interface LectureInfo {
  lecture_id: string;
  lecture_date: string;
  start_time: string | null;
}

/**
 * 주차/차시 계산
 *
 * @param lectureDate - 강의 날짜 (YYYY-MM-DD)
 * @param startTime - 강의 시작 시간 (HH:MM 또는 HH:MM:SS)
 * @param termStartDate - 학기 시작일 (YYYY-MM-DD)
 * @param allLectures - 해당 코스의 모든 강의 정보
 * @param currentLectureId - 현재 강의 ID (같은 날짜/시간 강의 구분용)
 * @returns 주차와 차시 정보
 */
export function calculateWeekAndSession(
  lectureDate: string,
  startTime: string | null,
  termStartDate: string,
  allLectures: LectureInfo[],
  currentLectureId: string
): WeekAndSession {
  const date = new Date(lectureDate);
  const startDate = new Date(termStartDate);

  // 주차 계산: (날짜 - 학기시작일) / 7 + 1
  const diffTime = date.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const weekNo = Math.floor(diffDays / 7) + 1;

  // 해당 주의 시작일과 종료일 계산
  const weekStartOffset = diffDays % 7;
  const weekStartDate = new Date(date);
  weekStartDate.setDate(weekStartDate.getDate() - weekStartOffset);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  // 같은 주에 속하는 강의들 필터링
  const lecturesInSameWeek = allLectures.filter((lecture) => {
    const lecDate = new Date(lecture.lecture_date);
    return lecDate >= weekStartDate && lecDate <= weekEndDate;
  });

  // 날짜 + 시간 순으로 정렬
  lecturesInSameWeek.sort((a, b) => {
    const dateCompare = a.lecture_date.localeCompare(b.lecture_date);
    if (dateCompare !== 0) return dateCompare;
    return (a.start_time || '00:00').localeCompare(b.start_time || '00:00');
  });

  // 현재 강의의 차시 번호 찾기 (1-based)
  const sessionNo = lecturesInSameWeek.findIndex(
    (lecture) => lecture.lecture_id === currentLectureId
  ) + 1;

  // 찾지 못한 경우 기본값 1 반환
  return { weekNo, sessionNo: sessionNo || 1 };
}

/**
 * 강의 목록에서 학기 시작일 추정
 * 가장 이른 강의 날짜를 기준으로 해당 주의 월요일을 학기 시작일로 추정
 *
 * @param lectures - 강의 목록
 * @returns 추정된 학기 시작일 (YYYY-MM-DD)
 */
export function estimateTermStartDate(lectures: LectureInfo[]): string {
  if (lectures.length === 0) {
    return new Date().toISOString().split('T')[0];
  }

  // 가장 이른 강의 날짜 찾기
  const earliestDate = lectures.reduce((min, lecture) => {
    return lecture.lecture_date < min ? lecture.lecture_date : min;
  }, lectures[0].lecture_date);

  // 해당 날짜의 월요일 찾기 (학기 시작일로 추정)
  const date = new Date(earliestDate);
  const dayOfWeek = date.getDay(); // 0=일, 1=월, ..., 6=토
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  date.setDate(date.getDate() - daysToMonday);

  return date.toISOString().split('T')[0];
}

/**
 * 주차/차시를 문자열로 포맷
 *
 * @param weekNo - 주차 번호
 * @param sessionNo - 차시 번호
 * @returns 포맷된 문자열 (예: "1주차 01차시")
 */
export function formatWeekAndSession(weekNo: number, sessionNo: number, locale: string = 'ko'): string {
  const sessionStr = sessionNo.toString().padStart(2, '0');
  if (locale === 'en') {
    return `Week ${weekNo}, Session ${sessionStr}`;
  }
  return `${weekNo}주차 ${sessionStr}차시`;
}

/**
 * 주차/차시를 짧은 문자열로 포맷
 *
 * @param weekNo - 주차 번호
 * @param sessionNo - 차시 번호
 * @returns 포맷된 문자열 (예: "1-1")
 */
export function formatWeekAndSessionShort(weekNo: number, sessionNo: number): string {
  return `${weekNo}-${sessionNo}`;
}
