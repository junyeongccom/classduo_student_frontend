import { redirect } from 'next/navigation'

export default function StudyspaceIndex() {
  // '/studyspace' 는 layout.tsx 만 있고 page.tsx 가 없어 404 였다.
  // 학생이 주소를 잘라 입력하거나 링크가 그룹 경로로 걸릴 때 도달한다.
  redirect('/studyspace/home')
}
