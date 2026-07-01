/**
 * @file faculty.ts
 * @description 교수자/소속명 한→영 표기 헬퍼 (백엔드 데이터가 한글일 때 영어 데모용).
 * @module shared/i18n
 */

const FACULTY_EN: Record<string, string> = {
  '학부대학': 'University College',
}

/** locale 이 영어면 알려진 소속명을 영어로 치환. ('ko'/'ko-KR' 는 그대로) */
export function localizeFaculty(
  name: string | null | undefined,
  locale: string | null | undefined,
): string | null | undefined {
  if (!name) return name
  const isEn = !!locale && !locale.toLowerCase().startsWith('ko')
  return isEn ? (FACULTY_EN[name] ?? name) : name
}
