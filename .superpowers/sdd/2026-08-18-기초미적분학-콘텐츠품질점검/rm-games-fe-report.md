# 학생웹 dev — 신규 미니게임 10종 + 단어 솔리테어 제거 (기존 게임탭·4종 게임 보존)

## 최종 지시 (정정본)
게임 탭 자체와 기존 운영 게임 4종(달리기/덱/카드매칭/정의조립)은 dev 에 유지한다.
신규 개발분(미니게임 10종 + 단어 솔리테어)만 제거한다.

> 참고: 최초 지시(게임 탭 전체 제거)로 한 차례 작업했으나, 아직 커밋·푸시하기 전에
> 오케스트레이터가 범위를 정정했다. `git reset --hard HEAD` + `git clean -fd`로
> 원상 복구 후 정정된 범위로 재작업했다. 잘못된 1차 작업은 어떤 형태로도
> origin에 남지 않았다.

## 브랜치 / 보존
- 레포: `2026-2_korea/classduo_student_frontend`, 브랜치 `develop-2026-2` (= origin/develop tip)
- `origin/feature/games`가 게임 전체(4종+10종+솔리테어) 커밋 시점을 그대로 보존 중 — 신규 10종을 여기서 계속 개발

## 제거한 것

**lecture-study 게임 탭 신규 미니게임 10종** (`src/features/lecture-study/components/ui/`):
`BalloonPopGame.tsx, MoleQuizGame.tsx, TermCatchGame.tsx, KnowledgeGateGame.tsx, ConceptMergeGame.tsx, PinPullGame.tsx, MisconceptionDefenseGame.tsx, KnowledgeTowerGame.tsx, ConceptSortGame.tsx, ConceptLinkGame.tsx` — 10개 파일 삭제

**단어 솔리테어** (`src/features/review/games/word-solitaire/`): 24개 파일 전체 삭제 (테스트 3개 포함)
- 다른 소비자 0건 확인 후 삭제 (`grep -rn "word-solitaire\|WordSolitaireGame" src` → 자기 자신만 매치)

## `ai-tutor/game/` 판정 — **유지** (제거하지 않음)

정체: **"달리기" 게임(기존 4종 중 1)의 Phaser 엔진**이었다. 신규 게임의 엔진이 아니다.

근거:
- `GameOverlay.tsx`(ai-tutor)가 동적 import로 `phaser` + `ai-tutor/game/config.ts`(→ BootScene/MainMenuScene/GameScene/GameOverScene, entities: Coin/HeartItem/Meteor/Player/GroundSegment)를 로드
- `GameSelectionModal.tsx`(사이드바 옛 진입점, 현재는 dead)의 `GAME_MODES` 상수에서 `running`↔"달리기"로 명명
- 10개 신규 게임 원본 파일(`git show HEAD:...`)을 전수 grep — `ai-tutor` import 0건. word-solitaire 24개 파일도 0건
- `GameTabContainer.tsx`가 `showRunningOverlay` 상태에서 `<GameOverlay .../>`를 렌더 — "달리기" PLAY 클릭 시 이 경로로 진입 (라이브로 재현·확인함)

→ **건드리지 않았다.**

## 공유 코드 유지 판정

| 대상 | 판정 | 근거 |
|---|---|---|
| `GameSelector.tsx` / `GAME_LIST` | **유지, 목록만 축소** | 15개 → 4개(running/deck/cardMatch/definitionBuilder)로 트림. `gameNames` record도 동일하게 4개로 |
| `GameDescriptionPopup.tsx` | **유지, per-game 블록만 제거** | `GAME_THEMES`(11개 삭제)·`getControls` switch(11 case 삭제)·10개 Preview 컴포넌트(MoleQuiz/BalloonPop/TermCatch/KnowledgeGate/ConceptMerge/PinPull/Defense/Tower/Sort/Link)·`GamePreview` switch(10 case 삭제) — running/deck/cardMatch/definitionBuilder 항목은 원형 유지 |
| `WordListModal.tsx` | **완전 유지, 변경 없음** | 달리기 게임의 랭크모드(`launchRankGame`)·일반모드(`handlePlayFromDescription`)가 모두 이 모달을 거쳐 단어를 확인·시작한다 — 4종 게임의 필수 공유 컴포넌트 |
| `GameOverlay.tsx` / `gameScoreService` (ai-tutor) | **완전 유지** | 달리기 게임 실행·점수 제출·닉네임 관리에 사용 |
| `review/` 전체 (ReviewMatchingGame·DefinitionBuilderGame·ReviewDeckView·GameRankingBoard·reviewService·useReviewDeck) | **완전 유지** | 카드매칭/정의조립/덱/랭킹보드 — 4종 게임 그 자체. `games/word-solitaire/`만 하위에서 제거 |
| `useMobilePortrait`(useMediaQuery.ts) | **유지** | `GameTabContainer`가 남은 4종 게임 모달의 모바일 가로모드 강제에 계속 사용 |
| `analytics.ts`(gameAnalytics·gameAbandonAnalytics·gameExtraAnalytics·runningGameAnalytics) | **완전 유지** | 4종 게임 이벤트 트래킹에 계속 사용 |
| `LectureStudyContainer.tsx` / `types.ts`(LectureStudyTab='game') / `useLectureStudyStore.ts`(gameWords) | **변경 없음** | 게임 탭 자체가 유지되므로 손댈 필요 없음 |
| `package.json`의 `phaser` 의존성 | **유지** | 달리기 게임 엔진이 사용 중 |
| `FeedbackCategory.GAME`(error-report) | **유지** | 게임 탭이 여전히 존재하므로 "게임" 피드백 카테고리도 유효 |

## 신규 게임 전용이라 함께 제거한 것

- `reviewService.submitWordSolitaireScore()` + `API_ENDPOINTS.GAME.SUBMIT_WORD_SOLITAIRE` / `RANKINGS_WORD_SOLITAIRE` — 솔리테어 삭제로 호출자 0건이 되어 제거 (SUBMIT_RUNNING·SUBMIT_DEFINITION_BUILDER·SUBMIT_MATCHING·RANKINGS_* 3종은 유지)
- `GameTabContainer.tsx`: 10개 게임 import, 11개 overlay `useState`(mole/balloon/termCatch/solitaire/gate/merge/pin/defense/tower/sort/link), `handleStartGame`의 10개 분기, `handlePlayFromDescription`의 wordSolitaire 특수분기, 11개 overlay 렌더 블록 제거. running/matching/definitionBuilder/deck 4개 overlay 및 흐름은 원형 유지
- i18n (`ko.json`/`en.json`, 각 25키 삭제): `lectureStudy.game.<10종+wordSolitaire>`(이름 라벨) · `lectureStudy.game.desc.<11종>`(설명 팝업 서브트리) · `lectureStudy.game.play`(82개 서브키 — 신규 10종 인게임 텍스트, 코드 어디서도 참조 안 됨을 grep으로 확인 후 일괄 삭제) · `lectureStudy.game.closeGame`(솔리테어 오버레이 전용 aria-label) · `review.ui.wordSolitaire`(솔리테어 컴포넌트 전용 서브트리, 41개 서브키)
  - `lectureStudy.game.desc.{goalLabel,controlsLabel,playButton,rankPlayButton,normalPlayButton,running,deck,cardMatch,definitionBuilder}`, `review.ui.{games,cardMatch.gameSizeTitle/Description}` 등은 유지(코드 사용 확인)

## 애매해서 유지한 것 (보고만 하고 건드리지 않음)

- **`src/shared/components/common/GameSelectionModal.tsx` + `Sidebar.tsx`의 관련 배선** — nav.ts에 `games` 메뉴 항목이 이미 없어 클릭 진입 경로 자체가 unreachable한 죽은 코드다. 이번 작업 이전부터 존재하던 별개 이슈이고, 이번 지시 범위(신규 게임 10종+솔리테어) 밖이라 손대지 않았다.
- **`useWordCategories.ts` / `LectureWordCategory*` 타입**(review) — 호출자 0건으로 이미 죽어있던 코드. word-solitaire가 쓰던 게 아니라 원래부터 미배선 상태였다(재현: 원본 word-solitaire 파일에서 이 훅 import 0건). 이번 삭제로 새로 죽은 게 아니라서 손대지 않았다.

## 검증

- `npx tsc --noEmit` → 에러 0건
- `npm test -- --run` → 54/54 통과 (word-solitaire 테스트 3개 삭제로 총량 감소, 나머지 전부 그린). `splitMathSegments` 수식 테스트 19개 생존 확인
- `grep -rn "BalloonPopGame\|MoleQuizGame\|TermCatchGame\|KnowledgeGateGame\|ConceptMergeGame\|PinPullGame\|MisconceptionDefenseGame\|KnowledgeTowerGame\|ConceptSortGame\|ConceptLinkGame\|WordSolitaire\|word-solitaire" src` → 잔존 참조 0건 (types.ts 주석 1건만 예외 — word-solitaire와 무관한 `LectureWordCategory` 타입 섹션 헤더)
- **라이브 확인 (Chrome MCP, `localhost:3000`)**: 기초미적분학(샘플) 11주차 "행렬의 연산과 성질" 회차
  - 요약/퀴즈/게임 3탭 모두 정상 렌더
  - 게임탭 GAME ARCADE에 정확히 **4개**만 노출: 달리기 게임 / 덱(SRS) / 카드매칭 / 정의 조립
  - "달리기 게임" PLAY → 설명 팝업(실제 게임 스크린샷·목표·조작법·랭크플레이/일반플레이) 정상 → 일반 플레이 클릭 → 단어 목록 모달("최소 3개의 단어가 필요합니다") 정상 진입
  - 퀴즈 탭 정상 동작 (42문항 로드 확인)
  - 콘솔 에러 0건

## Push

- `origin/develop-2026-2`(= `origin/develop`)으로 **아직 push 하지 않았다** (1차 잘못된 시도 이후 정정 지시를 받아, 이번 리포트 확정 직후 커밋·push 예정 — 이 문서 작성 시점 기준)
