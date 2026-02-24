## 문서 정보

- **이름**: `pptx`
- **설명**: .pptx 파일이 어떤 방식으로든(입력, 출력 또는 둘 다) 관련될 때마다 이 기술을 사용하십시오. 여기에는 슬라이드 데크, 프레젠테이션 데크 또는 프레젠테이션 만들기,
.pptx 파일에서 텍스트 읽기, 구문 분석 또는 추출(추출된 콘텐츠가 이메일이나 요약과 같은 다른 곳에서 사용되는 경우에도), 기존 프레젠테이션 편집, 수정 또는
업데이트, 슬라이드 파일 결합 또는 분할, 템플릿, 레이아웃, 발표자 노트 또는 댓글 작업이 포함됩니다. 나중에 콘텐츠로 무엇을 할 계획인지에 관계없이 \"데크\"
\"슬라이드\" \"프레젠테이션\"을 언급하거나 .pptx 파일 이름을 참조하는 경우 이 기술을 사용하세요.
- **라이선스**: 독점. LICENSE.txt에 전체 약관이 있습니다.

# PPTX 스킬

## 빠른 참조

| 작업 | 가이드 |
|------|-------|
| 콘텐츠 읽기/분석 | `python -m markitdown presentation.pptx` |
| 템플릿에서 편집 또는 만들기 | [editing.md](editing.md) 읽기 |
| 처음부터 만들기 | [pptxgenjs.md](pptxgenjs.md) 읽기 |

---

## 콘텐츠 읽기

```bash
# Text extraction
python -m markitdown presentation.pptx

# Visual overview
python scripts/thumbnail.py presentation.pptx

# Raw XML
python scripts/office/unpack.py presentation.pptx unpacked/
```

---

## 작업 흐름 편집

**자세한 내용은 [editing.md](editing.md)을 읽어보세요.**

1. `thumbnail.py`으로 템플릿을 분석합니다.
2. 압축 풀기 → 슬라이드 조작 → 내용 편집 → 정리 → 압축

---

## 처음부터 만들기

**자세한 내용은 [pptxgenjs.md](pptxgenjs.md)을 읽어보세요.**

템플릿이나 참조 프리젠테이션을 사용할 수 없을 때 사용합니다.

---

## 디자인 아이디어

**지루한 슬라이드를 만들지 마세요.** 흰색 배경에 평범한 글머리 기호는 누구에게도 깊은 인상을 주지 않습니다. 각 슬라이드에 대해 이 목록의 아이디어를 고려하십시오.

### 시작하기 전에

- **대담하고 내용에 맞는 색상 팔레트를 선택하세요**: 팔레트는 이 주제에 맞게 디자인되어야 합니다. 색상을 완전히 다른 표현으로 바꾸는 것이 여전히 "작동"한다면, 구체적인 선택을 충분히 하지 않은 것입니다.
- **평등보다 우위**: 하나의 색상이 지배적이어야 하며(시각적 비중 60~70%), 1~2개의 보조 톤과 하나의 선명한 액센트가 있어야 합니다. 모든 색상에 동일한 가중치를 부여하지 마십시오.
- **어두운/밝은 대비**: 제목 + 결론 슬라이드의 배경은 어둡고 내용의 배경은 밝습니다("샌드위치" 구조). 또는 프리미엄 느낌을 위해 전체적으로 어둡게 만듭니다.
- **시각적 모티브에 전념**: 둥근 이미지 프레임, 컬러 원으로 둘러싸인 아이콘, 두꺼운 단면 테두리 등 하나의 독특한 요소를 선택하고 반복합니다. 모든 슬라이드에서 휴대하세요.

### 색상 팔레트

주제에 맞는 색상을 선택하세요. 기본 색상은 일반적인 파란색이 아닙니다. 다음 팔레트를 영감으로 사용하세요.

| 테마 | 기본 | 보조 | 악센트 |
|-------|---------|-----------|--------|
| **미드나잇 이그제큐티브** | `1E2761`(네이비) | `CADCFC`(아이스블루) | `FFFFFF`(백색) |
| **숲과 이끼** | `2C5F2D`(숲) | `97BC62`(이끼) | `F5F5F5`(크림) |
| **산호 에너지** | `F96167`(산호) | `F9E795`(골드) | `2F3C7E`(네이비) |
| **따뜻한 테라코타** | `B85042`(테라코타) | `E7E8D1`(모래) | `A7BEAE`(세이지) |
| **바다 그라데이션** | `065A82`(짙은 파란색) | `1C7293`(청록색) | `21295C`(자정) |
| **차콜 미니멀** | `36454F`(숯) | `F2F2F2`(오프화이트) | `212121`(검정색) |
| **청록 신뢰** | `028090`(청록색) | `00A896`(해포) | `02C39A`(민트) |
| **베리 앤 크림** | `6D2E46`(베리) | `A26769`(더스티 로즈) | `ECE2D0`(크림) |
| **세이지 캄** | `84B59F`(세이지) | `69A297`(유칼립투스) | `50808E`(슬레이트) |
| **체리 볼드** | `990011`(체리) | `FCF6F5`(오프화이트) | `2F3C7E`(네이비) |

### 각 슬라이드에 대해

**모든 슬라이드에는 시각적 요소**(이미지, 차트, 아이콘, 모양)가 필요합니다. 텍스트만 있는 슬라이드는 잊어버릴 수 있습니다.

**레이아웃 옵션:**
- 2열(왼쪽 텍스트, 오른쪽 그림)
- 아이콘 + 텍스트 행(색상 원 안의 아이콘, 굵은 헤더, 아래 설명)
- 2x2 또는 2x3 그리드(한쪽은 이미지, 다른 쪽은 콘텐츠 블록 그리드)
- 콘텐츠 오버레이가 포함된 하프 블리드 이미지(전체 왼쪽 또는 오른쪽)

**데이터 표시:**
- 큰 통계 설명(아래에 작은 라벨이 있는 60-72pt의 큰 숫자)
- 비교 열(전/후, 장단점, 병렬 옵션)
- 타임라인 또는 프로세스 흐름(번호가 매겨진 단계, 화살표)

**시각적 개선:**
- 섹션 헤더 옆에 작은 색상의 원으로 표시된 아이콘
- 주요 통계 또는 태그라인에 대한 기울임꼴 악센트 텍스트

### 타이포그래피

**흥미로운 글꼴 조합을 선택하세요** — 기본적으로 Arial을 사용하지 마세요. 개성이 있는 헤더 글꼴을 선택하고 깔끔한 바디 글꼴과 결합하세요.

| 헤더 글꼴 | 본문 글꼴 |
|-------------|-----------|
| 조지아 | 캘리퍼스 |
| 아리알 블랙 | 굴림 |
| 캘리퍼스 | 칼리브리 라이트 |
| 캠브리아 | 게이지 |
| 트레뷰셋 MS | 게이지 |
| 영향 | 굴림 |
| 팔라티노 | 가라몬드 |
| 콘솔 | 구경 |

| 요소 | 사이즈 |
|---------|------|
| 슬라이드 제목 | 36-44pt 굵은 글씨 |
| 섹션 헤더 | 20-24pt 굵은 글씨 |
| 본문 | 14-16포인트 |
| 캡션 | 10-12pt 음소거 |

### 간격

- 최소 여백 0.5"
- 콘텐츠 블록 간 0.3-0.5"
- 호흡 공간을 확보하십시오. 모든 공간을 채우지 마십시오.

### 피하십시오(일반적인 실수)

- **동일한 레이아웃을 반복하지 마세요** — 슬라이드 전체에서 열, 카드, 설명선을 다양하게 변경하세요.
- **본문 텍스트를 중앙에 두지 마세요** — 단락과 목록을 왼쪽 정렬합니다. 중앙에만 제목
- **크기 대비를 간과하지 마세요** — 제목은 14~16pt 본문에서 눈에 띄도록 36pt 이상이 필요합니다.
- **기본적으로 파란색을 사용하지 마세요** — 특정 주제를 반영하는 색상을 선택하세요.
- **간격을 무작위로 혼합하지 마십시오** — 0.3" 또는 0.5" 간격을 선택하고 일관되게 사용하십시오.
- **한 슬라이드의 스타일을 지정하고 나머지는 그대로 두지 마세요** — 완전히 적용하거나 전체적으로 단순하게 유지하세요.
- **텍스트 전용 슬라이드를 만들지 마세요** — 이미지, 아이콘, 차트 또는 시각적 요소를 추가합니다. 일반 제목과 글머리 기호는 피하세요.
- **텍스트 상자 패딩을 잊지 마세요** — 텍스트 가장자리에 맞춰 선이나 모양을 정렬할 때 텍스트 상자에 `margin: 0`을 설정하거나 패딩을 고려하여 모양을 오프셋하세요.
- **대비가 낮은 요소를 사용하지 마세요** — 아이콘과 텍스트는 배경과 강한 대비가 필요합니다. 밝은 배경에 밝은 텍스트, 어두운 배경에 어두운 텍스트를 피하세요.
- **제목 아래에 강조선을 사용하지 마세요** — 이는 AI 생성 슬라이드의 특징입니다. 대신 공백이나 배경색을 사용하세요.

---

## 품질보증(필수)

**문제가 있다고 가정합니다. 당신의 임무는 그들을 찾는 것입니다.**

첫 번째 렌더링은 거의 정확하지 않습니다. 확인 단계가 아닌 버그 찾기로 QA에 접근하세요. 첫 번째 검사에서 문제가 전혀 발견되지 않았다면 충분히 자세히 살펴보지 않은 것입니다.

### 콘텐츠 QA

```bash
python -m markitdown output.pptx
```

내용 누락, 오타, 잘못된 순서를 확인하세요.

**템플릿을 사용할 때 남은 자리 표시자 텍스트를 확인하세요.**

```bash
python -m markitdown output.pptx | grep -iE "xxxx|lorem|ipsum|this.*(page|slide).*layout"
```

grep이 결과를 반환하면 성공을 선언하기 전에 결과를 수정하세요.

### 시각적 QA

**⚠️ 하위 에이전트를 사용하세요** — 2~3개 슬라이드에도 가능합니다. 당신은 코드를 쳐다보고 거기에 있는 것이 아니라 기대하는 것을 보게 될 것입니다. 서브 에이전트는 신선한 눈을 가지고 있습니다.

슬라이드를 이미지로 변환한 후([Converting to Images](#converting-to-images) 참조) 다음 프롬프트를 사용하십시오.

```
Visually inspect these slides. Assume there are issues — find them.

Look for:
- Overlapping elements (text through shapes, lines through words, stacked elements)
- Text overflow or cut off at edges/box boundaries
- Decorative lines positioned for single-line text but title wrapped to two lines
- Source citations or footers colliding with content above
- Elements too close (< 0.3" gaps) or cards/sections nearly touching
- Uneven gaps (large empty area in one place, cramped in another)
- Insufficient margin from slide edges (< 0.5")
- Columns or similar elements not aligned consistently
- Low-contrast text (e.g., light gray text on cream-colored background)
- Low-contrast icons (e.g., dark icons on dark backgrounds without a contrasting circle)
- Text boxes too narrow causing excessive wrapping
- Leftover placeholder content

For each slide, list issues or areas of concern, even if minor.

Read and analyze these images:
1. /path/to/slide-01.jpg (Expected: [brief description])
2. /path/to/slide-02.jpg (Expected: [brief description])

Report ALL issues found, including minor ones.
```

### 검증 루프

1. 슬라이드 생성 → 이미지로 변환 → 검사
2. **발견된 문제 나열**(발견된 문제가 없으면 더욱 비판적으로 다시 살펴보세요)
3. 문제 해결
4. **영향을 받은 슬라이드를 다시 확인** - 하나의 수정으로 또 다른 문제가 발생하는 경우가 많습니다.
5. 전체 패스에서 새로운 문제가 발견되지 않을 때까지 반복합니다.

**최소 한 번의 수정 및 확인 주기를 완료할 때까지 성공을 선언하지 마세요.**

---

## 이미지로 변환하기

육안 검사를 위해 프레젠테이션을 개별 슬라이드 이미지로 변환:

```bash
python scripts/office/soffice.py --headless --convert-to pdf output.pptx
pdftoppm -jpeg -r 150 output.pdf slide
```

그러면 `slide-01.jpg`, `slide-02.jpg` 등이 생성됩니다.

수정 후 특정 슬라이드를 다시 렌더링하려면:

```bash
pdftoppm -jpeg -r 150 -f N -l N output.pdf slide-fixed
```

---

## 종속성

- `pip install "markitdown[pptx]"` - ​​텍스트 추출
- `pip install Pillow` - ​​썸네일 그리드
- `npm install -g pptxgenjs` - ​​처음부터 새로 만들기
- LibreOffice(`soffice`) - PDF 변환(`scripts/office/soffice.py`을 통해 샌드박스 환경에 대해 자동 구성)
- 포플러(`pdftoppm`) - PDF를 이미지로 변환
