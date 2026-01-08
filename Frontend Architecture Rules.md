# Frontend Architecture Rules (App Router + Feature Domain)

## 목적
- `src/app/`은 라우팅을 도메인(라우트) 단위로 폴더 분리하되,  
  기능 구현(상태, 비즈니스 로직, API 호출)은 절대 포함하지 않는다.
- 라우트 폴더는 “URL 구조를 표현”하기 위한 것이며,  
  실제 기능 구현은 모두 `src/features/(domain이름)/`에 둔다.
- `src/app/`의 역할은 오직 라우트 정의 + 페이지 조립(Composition)이다.
- 실제 기능 구현은 `src/features/(domain이름)/`에 도메인 단위로 격리한다.
- 공통 재사용 요소는 `src/shared/`에 모아 중복을 최소화한다.
- mock은 `mocks/`로 분리하고, `services/`는 REAL만 유지한다.
- 도메인 외부에서 도메인 내부로 직접 접근하지 못하게 public export를 제한한다.

---

## 최종 디렉터리 구조

frontend/
├─ public/                              # 정적 자산(이미지, 폰트 등)
└─ src/
   ├─ app/                              # 라우트 엔트리(조립 전용)
   │  ├─ layout.tsx
   │  ├─ page.tsx
   │  ├─ (public)/
   │  │   └─ page.tsx
   │  └─ (protected)/
   │      └─ (route-segment)/
   │         └─ page.tsx                # 조립만(기능 구현 X)
   │
   ├─ features/                         # 도메인 모듈(기능 구현 중심)
   │  └─ (domain이름)/
   │     ├─ components/
   │     │  ├─ ui/                      # 순수 UI(프레젠테이션)
   │     │  └─ containers/              # 조립/연결(UI + store + hooks/usecases)
   │     ├─ hooks/                      # 커스텀 훅(useXxx) - 얇게 유지
   │     ├─ domain/                     # 순수 로직(React/Store/Network 의존 X)
   │     ├─ services/                   # REAL 통신/클라이언트(모의 X)
   │     ├─ mocks/                      # mock 데이터/모의 서비스(개발/테스트)
   │     ├─ store/                      # zustand store
   │     ├─ types.ts                    # 도메인 타입(공개 타입)
   │     └─ index.ts                    # 도메인 public export(외부 접근 창구)
   │
   └─ shared/                           # 전역 재사용(도메인 독립)
      ├─ components/
      │  ├─ ui/                         # 디자인 시스템 레벨 UI
      │  └─ common/                     # 공통 컴포넌트
      ├─ hooks/                         # 공통 커스텀 훅
      ├─ lib/                           # 유틸(순수 함수 우선)
      ├─ constants/
      └─ styles/

---

## 핵심 원칙(절대 규칙)
1. `src/app/`은 조립만 한다.
2. 기능 구현은 `src/features/(domain이름)/` 안에서 끝낸다.
3. `services/`는 REAL만 둔다. mock은 무조건 `mocks/`로 분리한다.
4. 도메인의 외부 공개 API는 `features/(domain이름)/index.ts`로 제한한다.
5. 도메인 간 직접 import를 금지한다. (필요하면 shared로 승격 또는 app에서 단순 합성)

---

### 상태 관리 원칙 (useState vs zustand)
- `useState`는 UI 순간 상태에만 사용한다.  
  예: 모달 open/close, 탭 선택, 드롭다운 토글, 입력 중 값(아직 확정 전)
- 도메인 의미가 있는 상태는 전부 `features/(domain이름)/store/`의 zustand로 관리한다.  
  예: 선택된 엔티티, 필터/정렬 조건, 조회 결과 캐시성 데이터, 페이지 이동 후 유지돼야 하는 값
- UI 컴포넌트(`components/ui`)에서는 `useState`를 제외한 상태/스토어 접근을 하지 않는다.

---

## 폴더별 책임/규칙

### 1) src/app/ (Routing/Composition only)
#### 책임
- 라우트 구조와 레이아웃 구성
- 라우트 params/searchParams를 받아 features 컨테이너에 전달
- 페이지 메타/SEO(필요 시)

#### 허용(Do)
- `features/(domain이름)`에서 export된 Container/Page 단위를 렌더링
- 라우트 파라미터를 정규화해 props로 전달
- 라우트 단위 layout 구성

#### 금지(Don’t) — 절대 하면 안 되는 것
- ❌ app에서 `fetch/axios` 등 API 호출 금지
- ❌ app에서 `useXxxStore()` 등 zustand store 직접 사용 금지
- ❌ app에서 비즈니스 로직/정책/데이터 변환 작성 금지
- ❌ app에서 `features/(domain이름)/components/ui/` 직접 import 금지  
  - app은 컨테이너/페이지 단위만 import
- ❌ app에서 도메인 내부 파일을 직접 import 금지  
  - 항상 `features/(domain이름)/index.ts`만 통해서 접근

---

### 2) features/(domain이름)/components/ui (Pure UI)
#### 책임
- props 기반 렌더링
- 스타일/마크업/UI 상호작용(데이터 소스는 props)

#### Do
- 모든 데이터/콜백은 props로 받기
- 로직은 최소화(표현 중심)

#### Don’t
- ❌ services 호출 금지
- ❌ store 접근 금지
- ❌ 복잡한 정책/데이터 변환 금지(필요하면 `domain/`)

---

### 3) features/(domain이름)/components/containers (Container/Composition)
#### 책임
- UI 컴포넌트에 데이터/콜백 연결
- store/hook 호출
- 로딩/에러/빈 상태 처리
- 화면 단 조립

#### Do
- store와 services 호출은 보통 hooks로 정리한 뒤 컨테이너는 연결만
- 화면 단 분기는 여기서 담당

#### Don’t
- ❌ 컨테이너 내부에서 axios/fetch 직접 구현 금지(services로)
- ❌ 복잡한 정책 로직 직접 작성 금지(domain으로)

---

### 4) features/(domain이름)/hooks (Custom Hooks: useXxx)
> hooks는 “React 전체”가 아니라 `useSomething()` 형태의 커스텀 훅 레이어를 의미한다.  
> Zustand도 UI 연결 시 `useStore()` 형태로 쓰는 경우가 많다.

#### 책임
- UI(컨테이너)에서 필요한 데이터 흐름을 정리
- services 호출 + store 업데이트 orchestration
- side effects(초기 로드, 리프레시 트리거 등)

#### Do
- 훅은 얇게 유지하고, 계산/규칙은 `domain/` 순수 함수로 분리
- 훅 하나 = 하나의 목적

#### Don’t
- ❌ 훅 내부에 대형 로직 누적 금지
- ❌ 훅이 services의 세부 구현을 흡수하도록 만들지 말 것(역할 분리)

---

### 5) features/(domain이름)/domain (Pure Logic)
#### 책임
- 정책/검증/데이터 변환/계산/유스케이스
- React/Next/Zustand/Network 의존 없이 순수 함수로 유지

#### Do
- 입력/출력 타입 명확히
- 테스트 가능한 형태(부작용 최소화)

#### Don’t
- ❌ 네트워크 호출 금지
- ❌ store 접근 금지
- ❌ UI/React 훅 의존 금지

---

### 6) features/(domain이름)/services (REAL only)
#### 책임
- 실제 API 통신/클라이언트
- 요청/응답 계약 책임(타입/에러 매핑 등)

#### Do
- REAL만 둔다
- 함수 시그니처/응답 타입을 명확히 한다

#### Don’t
- ❌ mock 포함 금지
- ❌ UI/React 의존 금지

---

### 7) features/(domain이름)/mocks (Dev/Test only)
#### 책임
- mock 데이터 생성기
- mock service(services와 동일 시그니처) 구현

#### Do
- services와 동일한 시그니처 유지(교체 용이)

#### Don’t
- ❌ 프로덕션에서 “조용한 fallback”으로 자동 사용 금지
- ❌ 실데이터 장애를 mock으로 숨기지 말 것

---

### 8) features/(domain이름)/store (Zustand)
#### 책임
- 도메인 상태 관리(선택값, 필터, UI 상태 등)
- 액션/세터 정의

#### Do
- 상태는 도메인 내부로 격리
- 액션 네이밍 통일(`setX`, `reset`, `selectX`)

#### Don’t
- ❌ store 내부에서 네트워크 호출 금지
- ❌ 전역 만능 store로 키우기 금지

---

## Mock 선택 스위칭 규칙(진입점 1곳에서만)
### 원칙
- UI/컨테이너/app에서 real/mock 분기 금지
- `features/(domain이름)/services/index.ts` 같은 단일 진입점에서만 선택
- 환경변수 기반 선택(예: `NEXT_PUBLIC_USE_MOCK=1`)
- 프로덕션에서 mock 선택은 즉시 실패하도록 강제(권장)

---

## 도메인 간 의존 규칙
- ❌ `features/A`가 `features/B` 내부 파일을 직접 import 금지
- 공통이 필요하면:
  1) `shared/`로 승격
  2) 혹은 app에서 단순 합성(조립만)
  3) 혹은 상위 공통 도메인(core) 신설(필요할 때)

---

## 파일 네이밍 규칙 (강제 권장)

### 1) 컴포넌트 네이밍
- 컴포넌트 파일명은 PascalCase
  - `UserCard.tsx`, `HeatwaveChart.tsx`
- UI 컴포넌트는 의미 중심 명명
  - `ProvinceMap.tsx` (O)
  - `Map2.tsx` (X)

#### 컨테이너 컴포넌트
- `XxxContainer.tsx` 또는 `XxxViewContainer.tsx`로 명확히 구분
  - 예: `ClimateDashboardContainer.tsx`
- 컨테이너는 `components/containers/`에만 위치

#### UI 컴포넌트
- `components/ui/`에만 위치
- 상태/통신 없는 표현 컴포넌트
  - 예: `ScenarioSelector.tsx`, `RiskSummaryCard.tsx`

---

### 2) 커스텀 훅 네이밍
- 훅은 반드시 `use`로 시작하고 camelCase
  - `useClimateRisk.ts`, `useScenarioSelection.ts`
- 파일명과 export 함수명 일치
  - `useScenarioSelection.ts` → `export const useScenarioSelection = ...`

#### 훅 구성 원칙
- 훅은 얇게, 로직은 `domain/`으로
- "한 훅 = 한 책임" 유지

---

### 3) domain(순수 로직) 네이밍
- 순수 함수 파일은 camelCase 또는 kebab-case 중 하나로 통일  
  - 권장: `camelCase`
- 동사로 시작(행위/변환 중심)
  - `buildScenario.ts`, `normalizeRiskData.ts`, `calculateScore.ts`
- export 함수도 파일명과 일치 권장
  - `normalizeRiskData.ts` → `export const normalizeRiskData = ...`

---

### 4) services(REAL) 네이밍
- 외부 호출 함수는 동사로 시작
  - `fetchXxx.ts`, `getXxx.ts`, `createXxx.ts`, `updateXxx.ts`, `deleteXxx.ts`
- 서비스 묶음 파일은 `xxxService.ts` 형태 허용(단, 과대해지면 분리)
  - `climateService.ts` (O: 작은 도메인)
  - `everythingService.ts` (X)

#### 진입점 파일(스위칭)
- 도메인 서비스 진입점은 고정: `services/index.ts`
- 여기서만 real/mock 구현체를 선택하도록 설계한다.

---

### 5) mocks 네이밍
- mock 데이터 생성기:
  - `makeXxxMock.ts` (권장) 또는 `createXxxMock.ts`
  - 예: `makeScenarioMock.ts`
- mock 서비스:
  - `xxxMockService.ts` 또는 real과 동일한 파일명 구조 유지
  - 예: real이 `fetchClimateRisk.ts`면 mock도 `fetchClimateRisk.ts`로 맞추고 폴더로 구분

---

### 6) store(Zustand) 네이밍
- store 파일명: `useXxxStore.ts`
  - 예: `useScenarioStore.ts`, `useClimateRiskStore.ts`
- store 생성 함수(export)도 파일명과 일치
  - `export const useScenarioStore = create(...)`

#### 액션 네이밍
- setter: `setXxx`
- 토글: `toggleXxx`
- 선택: `selectXxx`
- 초기화: `reset` 또는 `resetXxx`

---

### 7) 타입/상수 네이밍
- `types.ts`는 도메인 외부로 공개되는 타입만 둔다.
- 내부 전용 타입이 많아지면 `types/` 폴더로 확장 가능(리팩토링 시점)
- 상수:
  - 파일: `constants.ts` 또는 `xxxConstants.ts`
  - 값: `UPPER_SNAKE_CASE`

---

### 8) index.ts(export) 규칙 (중요)
- 외부에서 접근 가능한 것은 `index.ts`에만 export한다.
- UI 내부 컴포넌트는 기본적으로 export하지 않는다.
- export 권장 대상:
  - `components/containers/`
  - 필요 최소한의 hooks
  - store(필요 시)
  - types

---

## PR 리뷰 체크리스트(요약)
- app에서 API 호출/스토어 접근/비즈니스 로직이 있는가? → 있으면 반려
- mock이 services에 섞였는가? → 있으면 반려
- ui 컴포넌트가 store/services를 호출하는가? → 있으면 반려
- 도메인 외부에서 도메인 내부 파일을 직접 import하는가? → 있으면 반려
- 네이밍 규칙(PascalCase/useXxxStore 등)이 깨졌는가? → 수정
