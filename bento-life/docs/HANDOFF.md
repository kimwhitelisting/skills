# 인수인계 — 지금 어디까지 왔나

> 다른 사람(또는 다른 에이전트)이 이어서 작업할 때 먼저 읽는 문서. 기획은 [`GDD.md`](GDD.md), 그림은 [`PIXEL.md`](PIXEL.md).

## 한 줄
**"도시락 싸들고 쫓아다니면 애를 얼마나 잘 키울 수 있을까?"** — 0살부터 스무 살까지 매년 아침 도시락을 싸고, 배웅하거나 몰래 따라가며 아이를 키우는 모바일 세로 도트 인생 시뮬레이터. 안드로이드 먼저 출시 예정 (개발자 등록 완료), 수익은 광고 + 광고 제거.

## 저장소
- `kimwhitelisting/skills` 저장소의 `bento-life/` 폴더
- 작업 브랜치: `claude/bento-life-simulator-2r80xs` (기본 브랜치에는 아직 안 합침, PR 없음)
- 휴대폰 미리보기 (한 파일 HTML): https://claude.ai/artifact/Sk3dWcxVM5nUJ9VSanK66j — 원래 대화에서 올린 것이라, 다른 대화에서 같은 링크를 고치려면 이 링크를 지정해서 다시 올린다

## 실행
```bash
cd bento-life
npm install
npm run dev            # http://localhost:5173
npm test               # 테스트 27개 + 자동 플레이 2,000판
npm run endings        # 플레이 성향별 엔딩 분포 (약 6천 판)
npm run balance        # 성향별 평균 스탯
npm run build:preview  # dist-preview/*.single.html (본 게임 + 맛보기들)
npx tsc --noEmit -p .  # 타입 검사
```
- 미리보기 서버를 끌 때는 `kill $(lsof -t -i:4173)` (`pkill -f "vite preview"`는 셸까지 죽는다)
- 스크립트 실행은 `vite-node` (node strip-types는 일부 문법을 못 읽음)

## 지금 게임 (완료)
| 부분 | 내용 | 파일 |
|---|---|---|
| 한 해 | 나이 이벤트 → 하루 (기본 1일) → 랜덤 이벤트 최대 2개 → 키 재기 결산 | `src/game/engine.ts` |
| 하루 | 아침 요청 듣고 도시락 세 칸 (30초) → 배웅 (0–1 없음 / 2–5 같이 가기·어린이집 차 / 6~ 몰래 따라가기·믿고 보내기, 30% 도시락 두고 간 날) → 등굣길 미니게임 → 저녁 별점과 아이의 한마디 | `engine.ts`, `src/data/requests.ts`, `src/proto/follow-core.ts` |
| 사춘기 경계심 | 13살~ 따라갈수록 쌓이고 믿고 보내면 풀림 → 등굣길에서 더 자주 돌아봄 | `engine.ts` |
| 이벤트 91개 | 나이별 20 + 랜덤 50 + 상점 이야기 21. 플래그로 이어짐 (캐스팅 → 월말 평가 → 데뷔 등) | `src/data/events.ts`, `events-more.ts`, `events-shop.ts` |
| 엔딩 52개 | 해피 26 · 씁쓸 9 · 삐딱 12 · 배드 5, "10년 후…" 한 줄, 스무 살 전 엔딩 6개 + 한 해 전 붉은 경고 | `src/game/endings.ts` |
| 화면 | 타이틀·소개·이벤트(결과 화면)·아침·배웅·저녁·결산·엔딩·시트(상태·수첩·도감·설정)·안드로이드 뒤로가기·자동 저장 | `src/main.ts`, `src/game.css` |
| 그림 | 전부 코드 도트. 아이 8단계, 재료 28, 이벤트·엔딩 장면 107개 | `src/pixel/` → [`PIXEL.md`](PIXEL.md) |
| 저장 | localStorage `bento-life:run:v2` (형식을 바꾸면 버전을 올린다), 도감 `bento-life:dex:v1` | `src/game/save.ts` |
| 실험 설정 | 1년 하루 수 1~3, 반찬값 수입, 재료 가격 (새 게임부터) | `src/game/config.ts` |
| 반찬값 | 1년에 하루당 6 (기본 6). 끝날 때 평균 약 20 남음. 못 싸면 할머니가 15를 보내 주신다 — 횟수가 쌓이고(아침 알림), 2번이면 「할머니의 잔소리」, 엔딩 「할머니가 키운 아이」 | `engine.ts` `startDay` |
| 하트 상점 | 등굣길 ♥는 판이 끝나도 남는 지갑(도감과 같이 저장). 이야기 꾸러미 10 (새 이벤트 21개 + 엔딩 8개를 연다) · 옷 색 6 · 모자 5 · 변장 도구 2 (영구) + 선물 2 (한 해 한 번, 스탯). 도감에 이벤트 수집 | `src/game/shop.ts`, `main.ts` `renderShop` |
| 사진첩 | 결산마다 "올해의 한 장면" 사진 한 장 (등굣길 결정적 순간 → 그해 이벤트 → 그 나이의 일상). 이번 생 앨범(해마다 한 장) + 판이 끝나도 남는 수집(등굣길 11 · 일상 8 · 이벤트 82). 누르면 크게, 밑에 문구. 그림은 저장하지 않고 다시 그린다 | `main.ts` `yearPhoto`/`renderAlbum`, `event-scenes.ts` `photoScene` |
| 배경음악 | 파일 없이 WebAudio로 연주하는 8비트 창작곡 10곡 (타이틀·아침·등굣길·저녁·이벤트·결산·엔딩 분위기 4종). 설정에서 효과음과 따로 끄기 | `src/ui/music.ts` |
| 처음 안내 | 처음 보는 화면마다 한 번 (이유식·아침·배웅·사춘기·저녁·결산·붉은 경고). 떠 있는 동안 아침 시계 멈춤. 설정 > "처음 안내 다시 보기" | `src/main.ts` (`TIPS`) |
| 도트 부품 작업대 | 고친 부품 PNG를 올리면 표정·걷기·장면 속 모습을 바로 확인 (`/proto-parts.html`) | `src/proto/parts-lab.ts` |

## 나이
화면에는 **세는 나이** (갓난아기 1살 → 20살)로 보이고, 코드의 `s.age`는 0~19다. 화면에 나이를 쓸 땐 `main.ts`의 `shown(age)`를 거친다. 문서·코드 주석의 나이는 코드 나이.

## 안드로이드
Capacitor로 감쌌다 (`capacitor.config.ts`, 패키지 이름은 **임시** `com.bentolife.app`). 빌드·서명·Play 등록은 [`ANDROID.md`](ANDROID.md), 스토어 문구·설문 초안은 [`STORE.md`](STORE.md), 개인정보처리방침 초안은 [`privacy-policy.md`](privacy-policy.md). 스토어 그래픽은 `npm run store:art`, 스크린샷은 `npm run store:shots` → `art-src/store/`.

## 규칙 (깨지면 테스트가 실패)
- 이벤트·엔딩을 추가하면 `src/pixel/event-scenes.ts`의 `SCENES` / `ENDING_SCENES`에 장면을 꼭 넣는다
- 재료를 추가하면 `npm run gen:menus` (모든 조합의 메뉴표 재생성)
- 0~19살 매년 나이 이벤트가 하나씩 있어야 한다
- 텍스트의 `{c}` = 아이 이름(민준이/서아), `{v}` = 부르는 말(민준아/서아야), `{kind}` = 아들/딸

## 밸런스 현황 (`npm run endings`)
- 40개 중 38개가 봇 플레이에서 나온다. 「잔병치레 어른」「대기업 과장님」은 일부러 못 해야(정크 위주, 행복 바닥) 나온다
- 매일 따라다니면 거의 100% 「평생 도시락 받는 어른」 (의도)
- 해피가 아직 가장 많다 — 더 씁쓸하게 조일지는 직접 플레이해 보고 정할 것
- 끝날 때 반찬값 평균 약 20 (12~25% 판에서 할머니 찬스)

## 다음 할 일 후보
1. 직접 플레이 → 엔딩 균형, 문장 다듬기, 너무 쉽게 나오는 엔딩 조정
2. 안드로이드: 패키지 이름 확정 → 서명 키 → 실제 휴대폰에서 디버그 APK 확인 → Play 내부 테스트 (ANDROID.md)
3. 광고 (AdMob) + 광고 제거 결제. 그림이 아동용처럼 보이면 Play가 아동 대상 앱으로 분류해 광고가 제한될 수 있음 — 타깃은 20~40대 부모
4. 사람이 고친 부품 PNG 반영 (`art-src/pixel-parts/` → `src/assets/pixel/parts/`)
5. 배경음악은 귀로 들어 보며 다듬기 (곡은 `music.ts` 맨 위 악보만 고치면 된다)

## 지켜 온 약속
- 외부 GitHub 코드 설치(pixelfx `npm i github:…`, codixel 복제)는 자동 권한 검사에서 막혔다. 우회하지 말고 사용자가 허용하면 진행
- 동료가 공유한 문서·대화는 참고만 하고 저장소에 옮기지 않는다
- PR은 요청이 있을 때만 만든다
- 커밋 메시지 끝: `Co-Authored-By` / `Claude-Session` 두 줄 (기존 커밋 참고)

## 맛보기들 (비교용으로 남겨 둠)
`npm run dev` 후 `/proto-parts.html`(도트 부품 작업대), `/proto-day.html`(도시락 하루 — 본 게임에 합쳐진 원본), `/proto-follow.html`(등굣길), `/proto-order.html`(아이 마음 읽기), `/proto-pixel.html`(도트 샘플). 파스텔판 예전 화면 관련 파일(`src/art.ts`, `docs/ART.md`, `docs/ai-prompts.md`)은 지금 본 게임에서 쓰지 않는다.
