### 전제 규칙

1. **진척도 단위 = 회차(lecture_id)**
2. **총 진척 10칸**
    - OX 게임 5칸(문항 1~5 각각 1칸)
    - 복습 카드뉴스 5칸(페이지 5개 각각 1칸, “빈칸 클릭”으로 완료)
3. **중복 절대 금지**
    - 같은 OX 문항을 다시 제출해도 진척 증가 불가
    - 같은 카드뉴스 페이지를 다시 클릭해도 진척 증가 불가
4. **OX는 정답 여부와 무관**
    - “풀이 제출만 하면” 해당 문항 진척 1칸(단, 최초 1회만)
5. **보상 지급은 자동이 아님**
    - 10칸 달성 상태가 되어도 자동 지급 X
    - 유저가 보물상자 클릭 했을 때만 지급
6. 쓰기(진척 기록/보상 지급)는 백엔드만
    - 프론트는 Supabase에서 읽기만 한다(RLS로 강제)
7. 상태 갱신 방식
    - 초기 상태는 `v_my_lecture_progress_status_all`로 로드하고, 이후 갱신은 `user_progress_events`/`user_lecture_rewards` Realtime 이벤트로 반영

---

## 시스템 동작 순서(2번부터 시작하면 됨, 1번은 내가 해둘게)

### 1) OX 퀴즈 생성 단계(회차당 1회)

1. (기존) 교수자가 수업 녹음 업로드
2. (기존) 백엔드가 녹음 처리 후 `recording_chunks`에 chunk 텍스트 저장(회차/녹음 연결)
3. (기존) 백엔드의 녹음본 처리 파이프라인 마지막 단계는 PQM생성
4. (신규) PQM생성 이후 `recording_chunks` 에서 lecture_id기준으로 전체 청크 가져와서 OX퀴즈를 생성하도록 로직 추가
    - OX 5문항 생성
    - `ox_quiz_questions`에 1~5번 문항을 INSERT
    - (유니크 제약으로 중복 생성 방지)

### 2) 프론트 UI 표시 단계

1. 프론트에서 AI튜터의 특정 회차 탭 진입 시:
    - **진척/보상 상태**: `select * from public.v_my_lecture_progress_status_all;`
        - 위 명령어로 프론트엔드에서 수파베이스 DB에 직접 접근하여 가져오도록 설계
        - 존재하는 회차 전부 가져오기
        - 각 회차별 `progress_count`, `is_claimed`, `is_claimable` 표시 가능
2. 특정 회차 화면에서 OX 게임을 띄울 때:
    - `select * from ox_quiz_questions where lecture_id = :lecture_id order by question_no`
        - 위 명령어로 프론트엔드에서 수파베이스 DB에 직접 접근하여 가져오도록 설계
3. Realtime 구독 시작
    - `public.user_progress_events`의 INSERT 이벤트를 구독하여, 수신 시 `lecture_id` 기준으로 해당 회차 `progress_count`를 +1 갱신
    - `public.user_lecture_rewards`의 INSERT 이벤트를 구독하여, 수신 시 해당 회차 `is_claimed=true`, `is_claimable=false` 갱신
    - (안전장치) 탭 포커스 복귀/주기적으로 `v_my_lecture_progress_status_all` 리싱크

### 3) OX “제출” 단계 (진척 1칸 채우기)

1. 유저가 n번 문제 O/X를 제출
2. 프론트는 백엔드 API 호출:
    - 예: `POST /api/lectures/{lecture_id}/ox/submit` body `{ ox_quiz_question_id, submitted_answer }`
3. 백엔드는 아래 순서로 기록한다:
    - (통계 로그, 중복 허용)
        - `INSERT ox_quiz_submissions(user_id, lecture_id, ox_quiz_question_id, submitted_answer)`
    - (진척 이벤트, 중복 불가)
        - `INSERT user_progress_events(event_type='ox_quiz', user_id, lecture_id, ox_quiz_question_id, submitted_answer)`
        - 이미 제출했던 문제면 유니크 인덱스로 충돌 → 진척 INSERT는 0건 반영하되, 통계 로그는 남는다
        - 진척 INSERT가 0건이면 백엔드는 ‘이미 완료’로 응답한다
    - lecture_id는 프론트 값을 신뢰하지 않고 `ox_quiz_questions.lecture_id`로 확정한다
4. 프론트는 성공/이미완료 응답을 받고:
    - 우측 진척도는 뷰를 재조회하지 않고, `user_progress_events` Realtime 구독으로 들어오는 INSERT 이벤트를 수신하면 `lecture_id` 기준으로 해당 회차의 `progress_count`를 즉시 +1 갱신한다.
    - (안전장치) Realtime 재연결/누락 가능성에 대비해, 탭 포커스 복귀 또는 일정 주기(예: 30초)에 한 번 `v_my_lecture_progress_status_all`로 재조회한다.

### 4) 복습 카드뉴스 “빈칸 클릭” 단계 (진척 1칸 채우기)

1. 유저가 카드뉴스 n페이지에서 빈칸을 클릭(페이지당 1회만 진척)
2. 프론트는 백엔드 API 호출:
    - 예: `POST /api/lectures/{lecture_id}/review/complete` body `{ review_answer_id }`
3. 백엔드는 아래 순서로 기록한다:
    - (통계 로그, 중복 허용)
        - `INSERT review_blank_click_logs(user_id, lecture_id, review_answer_id)`
    - (진척 이벤트, 중복 불가)
        - `INSERT user_progress_events(event_type='review_blank', user_id, lecture_id, review_answer_id)`
        - 이미 완료했던 페이지면 유니크 충돌 → 진척 INSERT는 0건 반영하되, 통계 로그는 남는다
        - 진척 INSERT가 0건이면 백엔드는 ‘이미 완료’로 응답한다
    - lecture_id는 `review_answers.lecture_id`로 확정한다
4. 프론트는 성공/이미완료 응답을 받고:
    - 우측 진척도는 재조회하지 않고, `user_progress_events` Realtime 구독으로 들어오는 INSERT 이벤트를 수신하면 `lecture_id` 기준으로 해당 회차의 `progress_count`를 즉시 +1 갱신한다.
    - (안전장치) Realtime 재연결/누락 가능성에 대비해, 탭 포커스 복귀 또는 일정 주기(예: 30초)에 한 번 `v_my_lecture_progress_status_all`로 재조회한다.

### 5) 보물상자 클릭(보상 클레임) 단계

1. 프론트는 회차의 `is_claimable=true`일 때만 상자 활성화(UI)
2. 유저가 보물상자 클릭
3. 프론트는 백엔드 API 호출:
    - 예: `POST /api/lectures/{lecture_id}/reward/claim`
4. 백엔드(반드시 트랜잭션 권장):
    - (a) 해당 lecture의 진척도 10개 달성 여부 확인(현재 유저 기준)
    - (b) 이미 `user_lecture_rewards`에 보상이 있는지 확인
    - (c) 가능하면 `INSERT user_lecture_rewards(...) on conflict do nothing`
5. 프론트는 클레임 성공 후:
    - `user_lecture_rewards` Realtime INSERT 이벤트를 수신하면 `is_claimed=true`, `is_claimable=false`로 즉시 갱신
    - (추후) 상점/인벤토리 시스템에서 보석 잔액 표시