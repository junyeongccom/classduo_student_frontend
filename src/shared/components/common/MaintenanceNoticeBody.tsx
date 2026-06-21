/**
 * @file MaintenanceNoticeBody.tsx
 * @description 서비스 장애 사과 공지 본문 (인증화면 별도 카드 + 로그인 후 모달 공용)
 * @module shared/components/common
 */

export function MaintenanceNoticeBody() {
  return (
    <div className="space-y-3 text-left">
      <h3 className="text-sm font-bold leading-snug text-gray-900 dark:text-gray-100">
        [Aplus] 생명과학의 세계 서비스 접속 장애 발생에 대해 진심으로 사과드립니다
      </h3>
      <div className="space-y-2.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
        <p>안녕하세요, Aplus 운영팀입니다.</p>
        <p>
          먼저, 시험을 하루 앞둔 가장 중요한 시점에 서비스 이용에 큰 불편을 끼쳐드린 점 진심으로
          사과드립니다. 6월 21일 9시경부터 이용자 수가 급격히 증가하면서, 일부 학습 기능에서
          일시적인 오류가 발생하였습니다. 많은 분들이 시험을 준비하며 가장 집중해야 할 시기에
          학습을 방해해드린 점, 운영팀 모두 무거운 책임을 느끼고 있습니다.
        </p>
        <p>
          문제를 인지한 직후 긴급 복구 작업을 진행하였으며, 현재 서비스는 정상적으로 이용 가능한
          상태입니다.
        </p>
        <p>동일한 문제가 재발하지 않도록 서버 환경을 보강하고 있습니다.</p>
        <p>
          장애 시간 동안 일부 학습 기록이 정상적으로 저장되지 않았을 수 있습니다. 이 부분 다시
          한번 양해 부탁드립니다.
        </p>
        <p>
          학생분들께서 안심하고 학습에 집중하실 수 있도록 서비스 안정성에 더욱 만전을
          기하겠습니다.
        </p>
        <p>
          내일 시험, 그동안 준비하신 만큼 좋은 결과 있으시길 진심으로 응원하겠습니다. 다시 한번
          깊이 사과드립니다.
        </p>
        <p className="font-medium text-gray-700 dark:text-gray-200">Aplus 운영팀 드림</p>
      </div>
    </div>
  )
}
