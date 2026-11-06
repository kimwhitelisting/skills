# 🍱 냠냠졸졸

> 도시락 싸들고 졸졸 따라다니면 아이를 얼마나 잘 키울 수 있을까?

모바일 세로 화면용 2D 도트 인생 시뮬레이터. 0살부터 19살까지 매년
**① 나이별 이벤트 → ② 하루 (아침 도시락 → 배웅 / 몰래 따라가기 → 등굣길 미니게임 → 저녁) → ③ 랜덤 이벤트 → ④ 키 재기 결산**
을 반복하고, 스무 살에 엔딩을 맞는다. 그림은 전부 코드로 찍은 도트 (`src/pixel/`).

설정 > 실험 설정에서 1년에 보내는 하루 수, 반찬값, 재료 가격을 바꿔 가며 해 볼 수 있다 (새 게임부터 적용).

**처음이면:** [`docs/HANDOFF.md`](docs/HANDOFF.md) (인수인계) · 기획 문서: [`docs/GDD.md`](docs/GDD.md) · 도트 그림: [`docs/PIXEL.md`](docs/PIXEL.md) · (예전) 아트 가이드: [`docs/ART.md`](docs/ART.md) · 그림 목록: [`docs/art-assets.csv`](docs/art-assets.csv) · AI 그림 지시문: [`docs/ai-prompts.md`](docs/ai-prompts.md) · 전체 메뉴표: [`docs/menus.csv`](docs/menus.csv)

## 실행

계정 저장 테스트 후보는 이메일 로그인·자동 저장·다른 기기 복원을 제공한다. `.env.example`의 공개 클라이언트 설정과 [계정 구현·검증 기록](docs/ACCOUNT-IMPLEMENTATION.md)을 따른다. 실제 브라우저에서 게스트 기록의 명시적 가져오기, 새로고침 보존, 서버 자동 저장, 기록 없는 별도 origin의 같은 계정 복원과 두 번째 탭 작성 차단을 확인했다. 실제 iPhone 설치·확인 메일·Native 보안 저장 동작은 별도 검증 대상이며, 기본 SMTP 제한으로 아직 공개 가입용 서비스가 아니다. 결제는 포함하지 않는다.

```bash
cd bento-life
npm install
npm run dev        # http://localhost:5173 — 휴대폰으로 같은 와이파이에서 접속 가능
npm test           # 단위 테스트 + 2,000판 자동 플레이 (멈춤/버그 검사)
npm run balance    # 플레이 성향별 평균 스탯·엔딩 분포 리포트
npm run build      # dist/ 에 배포용 빌드
npm run build:preview  # dist-preview/*.standalone.html (브라우저용), *.single.html (임베드용)
```

웹 서버에서 직접 제공하거나 휴대폰 브라우저로 열 때는 `dist-preview/preview.standalone.html`을 사용한다.
`*.single.html`은 Claude 아티팩트처럼 바깥 HTML 문서가 있는 곳에 삽입하는 조각이다.
브라우저용 파일은 원본 viewport·문서 모드를 보존한다. 본 게임의 그림·글꼴·CSS·JS는 파일에 포함되고, 일부 비교용 prototype의 기존 Google Fonts 연결은 유지한다.

## 구조

```
src/
  data/                 ← 기획 데이터 (여기만 고쳐도 게임이 바뀜)
    ingredients.ts        재료: 슬롯, 나이 제한, 가격, 스탯 효과, 태그, 인기도
    signatures.ts         특별 메뉴: 특정 조합의 이름/보너스/플래그 덮어쓰기
    events.ts             나이별 고정 이벤트 + 랜덤 이벤트, 선택지와 결과
    requests.ts           아침 요청 (체육·시험·소풍…): 등장 나이, 말투 2종, 채점
    menus.generated.json  모든 조합의 메뉴표 (자동 생성 — 직접 수정 금지)
  game/                 ← 규칙 (UI와 분리, 테스트 가능)
    engine.ts             한 해의 진행 순서(step 머신), 이벤트 큐, 하루 (도시락 → 배웅 → 등굣길 → 저녁)
    bento.ts              도시락 평가: 선호/편식, 영양 균형, 끼니별 보정, 반복 페널티
    apply.ts              스탯 적용 (수확체감, 재능 보너스)
    endings.ts            엔딩 조건 (위에서부터 먼저 맞는 것)
    menus.ts              메뉴 조합 생성 규칙
    state.ts / save.ts    새 게임 생성, 저장/불러오기
  main.ts, game.css     ← 본 게임 화면 (장면은 캔버스 도트, 글·버튼은 DOM, 프레임워크 없음)
  pixel/                ← 도트 엔진: 아이 8단계(층별 부품), 재료 28종, 장면, 효과
  proto/                ← 맛보기 (등굣길 미니게임 follow-core.ts 는 본 게임도 같이 쓴다)
  ui/                   ← 효과음·진동, 기기 설정
  game/config.ts        ← 실험 설정값 (하루 수, 수입, 가격)
  art.ts                ← (예전 파스텔판) 일러스트 연결 — 지금 본 게임은 쓰지 않음
scripts/generate-menus.ts  메뉴표 생성기
tests/                     테스트 + 자동 플레이 시뮬레이터
```

## 콘텐츠 추가하는 법

- **재료 추가**: `ingredients.ts`에 한 줄 추가 → `npm run gen:menus` → 메뉴표가 자동으로 늘어남
- **특별 메뉴 추가**: `signatures.ts`에 `combo: [주식, 메인, 반찬]` 추가 → `npm run gen:menus`
  (조합이 슬롯 순서와 안 맞거나, 나이 범위상 만들 수 없으면 생성기가 에러를 냄)
- **이벤트 추가**: `events.ts`에 객체 추가. 텍스트에서 `{c}`(민준이/서아), `{v}`(민준아/서아야), `{kind}`(아들/딸) 사용
- **그림 추가**: `docs/art-assets.csv`의 경로대로 `src/assets/art/`에 넣으면 자동 반영 (없으면 이모지). `npm run gen:art`로 목록·완료 현황·AI 지시문(`docs/ai-prompts.md`) 갱신
- **재료 그림 수정**: `scripts/draw-ingredients.ts`에서 해당 재료를 고치고 `npm run draw:ingredients`
- 수정 후 `npm test` — 메뉴표가 최신이 아니거나, 어떤 판이 진행 불가 상태에 빠지면 실패한다

## 스토어 출시 경로

웹 기술(TypeScript + Vite)로 만들고 **Capacitor**로 감싸 Android/iOS 앱으로 낸다.
이런 텍스트·카드 중심 게임은 게임 엔진보다 이 방식이 개발·수정 속도가 빠르다.

```bash
npm i @capacitor/core @capacitor/android @capacitor/ios && npm i -D @capacitor/cli
npx cap init "냠냠졸졸" com.paranstudio.dosirak --web-dir dist
npm run build && npx cap add android && npx cap sync
npx cap open android      # Android Studio에서 서명된 AAB 빌드 → Play Console 업로드
```

출시 전 체크리스트 (정책은 바뀌므로 제출 직전 공식 문서로 재확인):

- [ ] **Google Play**: 개발자 계정(1회 $25). 2023년 11월 이후 만든 개인 계정은 프로덕션 출시 전
      비공개 테스트(현재 12명 이상, 14일 연속)가 필요
- [ ] **App Store**: Apple Developer Program(연 $99), 빌드에 Mac + Xcode 필요(또는 클라우드 빌드)
- [ ] 등급 분류: 두 스토어 모두 자체 설문(IARC 등)으로 처리 — 국내 게임물 등급도 이걸로 대체됨
- [ ] 개인정보처리방침 URL (데이터 수집이 없어도 필요), Play 데이터 보안 양식
- [ ] 광고/결제 SDK를 넣으면: 광고 ID 고지, iOS ATT 팝업, 인앱결제 상품 등록
- [ ] 앱 아이콘, 스크린샷(폰 세로), 스토어 소개 문구, 저장 데이터를 `@capacitor/preferences`로 이전(`save.ts`만 수정)
