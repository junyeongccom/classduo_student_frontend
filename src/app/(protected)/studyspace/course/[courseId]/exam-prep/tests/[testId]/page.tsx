/**
 * @file page.tsx (exam-prep core test solve)
 * @description 회차별 핵심 테스트 풀이 라우트 — courseId + testId
 * @module app/studyspace/course/[courseId]/exam-prep/tests/[testId]
 * @dependencies CoreTestSolveContainer
 */
import { CoreTestSolveContainer } from '@/features/exam-prep-final/components/containers/CoreTestSolveContainer'

interface PageProps {
  params: Promise<{ courseId: string; testId: string }>
}

export default async function Page({ params }: PageProps) {
  const { courseId, testId } = await params
  return <CoreTestSolveContainer courseId={courseId} testId={testId} />
}
