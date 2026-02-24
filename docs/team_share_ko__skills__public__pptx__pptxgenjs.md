# PptxGenJS 튜토리얼

## 설정 및 기본 구조

```javascript
const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';  // or 'LAYOUT_16x10', 'LAYOUT_4x3', 'LAYOUT_WIDE'
pres.author = 'Your Name';
pres.title = 'Presentation Title';

let slide = pres.addSlide();
slide.addText("Hello World!", { x: 0.5, y: 0.5, fontSize: 36, color: "363636" });

pres.writeFile({ fileName: "Presentation.pptx" });
```

## 레이아웃 크기

슬라이드 크기(좌표(인치)):
- `LAYOUT_16x9`: 10" × 5.625"(기본값)
- `LAYOUT_16x10`: 10" × 6.25"
- `LAYOUT_4x3`: 10" × 7.5"
- `LAYOUT_WIDE`: 13.3" × 7.5"

---

## 텍스트 및 서식

```javascript
// Basic text
slide.addText("Simple Text", {
  x: 1, y: 1, w: 8, h: 2, fontSize: 24, fontFace: "Arial",
  color: "363636", bold: true, align: "center", valign: "middle"
});

// Character spacing (use charSpacing, not letterSpacing which is silently ignored)
slide.addText("SPACED TEXT", { x: 1, y: 1, w: 8, h: 1, charSpacing: 6 });

// Rich text arrays
slide.addText([
  { text: "Bold ", options: { bold: true } },
  { text: "Italic ", options: { italic: true } }
], { x: 1, y: 3, w: 8, h: 1 });

// Multi-line text (requires breakLine: true)
slide.addText([
  { text: "Line 1", options: { breakLine: true } },
  { text: "Line 2", options: { breakLine: true } },
  { text: "Line 3" }  // Last item doesn't need breakLine
], { x: 0.5, y: 0.5, w: 8, h: 2 });

// Text box margin (internal padding)
slide.addText("Title", {
  x: 0.5, y: 0.3, w: 9, h: 0.6,
  margin: 0  // Use 0 when aligning text with other elements like shapes or icons
});
```

**도움말:** 텍스트 상자에는 기본적으로 내부 여백이 있습니다. 동일한 x 위치에 있는 도형, 선 또는 아이콘과 정확하게 정렬하기 위해 텍스트가 필요한 경우 `margin:
0`을 설정하세요.

---

## 목록 및 글머리 기호

```javascript
// ✅ CORRECT: Multiple bullets
slide.addText([
  { text: "First item", options: { bullet: true, breakLine: true } },
  { text: "Second item", options: { bullet: true, breakLine: true } },
  { text: "Third item", options: { bullet: true } }
], { x: 0.5, y: 0.5, w: 8, h: 3 });

// ❌ WRONG: Never use unicode bullets
slide.addText("• First item", { ... });  // Creates double bullets

// Sub-items and numbered lists
{ text: "Sub-item", options: { bullet: true, indentLevel: 1 } }
{ text: "First", options: { bullet: { type: "number" }, breakLine: true } }
```

---

## 모양

```javascript
slide.addShape(pres.shapes.RECTANGLE, {
  x: 0.5, y: 0.8, w: 1.5, h: 3.0,
  fill: { color: "FF0000" }, line: { color: "000000", width: 2 }
});

slide.addShape(pres.shapes.OVAL, { x: 4, y: 1, w: 2, h: 2, fill: { color: "0000FF" } });

slide.addShape(pres.shapes.LINE, {
  x: 1, y: 3, w: 5, h: 0, line: { color: "FF0000", width: 3, dashType: "dash" }
});

// With transparency
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "0088CC", transparency: 50 }
});

// Rounded rectangle (rectRadius only works with ROUNDED_RECTANGLE, not RECTANGLE)
// ⚠️ Don't pair with rectangular accent overlays — they won't cover rounded corners. Use RECTANGLE instead.
slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" }, rectRadius: 0.1
});

// With shadow
slide.addShape(pres.shapes.RECTANGLE, {
  x: 1, y: 1, w: 3, h: 2,
  fill: { color: "FFFFFF" },
  shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15 }
});
```

그림자 옵션:

| 부동산 | 유형 | 범위 | 메모 |
|----------|------|-------|-------|
| `type` | 문자열 | `"outer"`, `"inner"` | |
| `color` | 문자열 | 6자 16진수(예: `"000000"`) | `#` 접두사 없음, 8자 16진수 없음 - 일반적인 함정 | 참조
| `blur` | 번호 | 0-100포인트 | |
| `offset` | 번호 | 0-200포인트 | **음수가 아니어야 합니다** — 음수 값은 파일을 손상시킵니다 |
| `angle` | 번호 | 0~359도 | 그림자가 떨어지는 방향(135 = 오른쪽 아래, 270 = 위쪽) |
| `opacity` | 번호 | 0.0-1.0 | 투명성을 위해 이것을 사용하고 색상 문자열로 인코딩하지 마십시오 |

그림자를 위쪽으로 드리우려면(예: 바닥글 표시줄) 양수 오프셋과 함께 `angle: 270`을 사용하세요. 음수 오프셋을 사용 **하지 마세요**.

**참고**: 그라데이션 채우기는 기본적으로 지원되지 않습니다. 대신 그라데이션 이미지를 배경으로 사용하세요.

---

## 이미지

### 이미지 소스

```javascript
// From file path
slide.addImage({ path: "images/chart.png", x: 1, y: 1, w: 5, h: 3 });

// From URL
slide.addImage({ path: "https://example.com/image.jpg", x: 1, y: 1, w: 5, h: 3 });

// From base64 (faster, no file I/O)
slide.addImage({ data: "image/png;base64,iVBORw0KGgo...", x: 1, y: 1, w: 5, h: 3 });
```

### 이미지 옵션

```javascript
slide.addImage({
  path: "image.png",
  x: 1, y: 1, w: 5, h: 3,
  rotate: 45,              // 0-359 degrees
  rounding: true,          // Circular crop
  transparency: 50,        // 0-100
  flipH: true,             // Horizontal flip
  flipV: false,            // Vertical flip
  altText: "Description",  // Accessibility
  hyperlink: { url: "https://example.com" }
});
```

### 이미지 크기 조정 모드

```javascript
// Contain - fit inside, preserve ratio
{ sizing: { type: 'contain', w: 4, h: 3 } }

// Cover - fill area, preserve ratio (may crop)
{ sizing: { type: 'cover', w: 4, h: 3 } }

// Crop - cut specific portion
{ sizing: { type: 'crop', x: 0.5, y: 0.5, w: 2, h: 2 } }
```

### 크기 계산(가로세로 비율 유지)

```javascript
const origWidth = 1978, origHeight = 923, maxHeight = 3.0;
const calcWidth = maxHeight * (origWidth / origHeight);
const centerX = (10 - calcWidth) / 2;

slide.addImage({ path: "image.png", x: centerX, y: 1.2, w: calcWidth, h: maxHeight });
```

### 지원되는 형식

- **표준**: PNG, JPG, GIF(애니메이션 GIF는 Microsoft 365에서 작동)
- **SVG**: 최신 PowerPoint/Microsoft 365에서 작동

---

## 아이콘

반응 아이콘을 사용하여 SVG 아이콘을 생성한 다음 범용 호환성을 위해 PNG로 래스터화합니다.

### 설정

```javascript
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const { FaCheckCircle, FaChartLine } = require("react-icons/fa");

function renderIconSvg(IconComponent, color = "#000000", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color, size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}
```

### 슬라이드에 아이콘 추가

```javascript
const iconData = await iconToBase64Png(FaCheckCircle, "#4472C4", 256);

slide.addImage({
  data: iconData,
  x: 1, y: 1, w: 0.5, h: 0.5  // Size in inches
});
```

**참고**: 선명한 아이콘을 위해서는 크기 256 이상을 사용하세요. 크기 매개 변수는 슬라이드의 표시 크기(`w` 및 `h`(인치 단위로 설정))가 아닌 래스터화 해상도를
제어합니다.

### 아이콘 라이브러리

설치: `npm install -g react-icons react react-dom sharp`

반응 아이콘의 인기 있는 아이콘 세트:
- `react-icons/fa` - ​​글꼴이 훌륭합니다.
- `react-icons/md` - ​​머티리얼 디자인
- `react-icons/hi` - ​​히어로아이콘
- `react-icons/bi` - ​​부트스트랩 아이콘

---

## 슬라이드 배경

```javascript
// Solid color
slide.background = { color: "F1F1F1" };

// Color with transparency
slide.background = { color: "FF3399", transparency: 50 };

// Image from URL
slide.background = { path: "https://example.com/bg.jpg" };

// Image from base64
slide.background = { data: "image/png;base64,iVBORw0KGgo..." };
```

---

## 테이블

```javascript
slide.addTable([
  ["Header 1", "Header 2"],
  ["Cell 1", "Cell 2"]
], {
  x: 1, y: 1, w: 8, h: 2,
  border: { pt: 1, color: "999999" }, fill: { color: "F1F1F1" }
});

// Advanced with merged cells
let tableData = [
  [{ text: "Header", options: { fill: { color: "6699CC" }, color: "FFFFFF", bold: true } }, "Cell"],
  [{ text: "Merged", options: { colspan: 2 } }]
];
slide.addTable(tableData, { x: 1, y: 3.5, w: 8, colW: [4, 4] });
```

---

## 차트

```javascript
// Bar chart
slide.addChart(pres.charts.BAR, [{
  name: "Sales", labels: ["Q1", "Q2", "Q3", "Q4"], values: [4500, 5500, 6200, 7100]
}], {
  x: 0.5, y: 0.6, w: 6, h: 3, barDir: 'col',
  showTitle: true, title: 'Quarterly Sales'
});

// Line chart
slide.addChart(pres.charts.LINE, [{
  name: "Temp", labels: ["Jan", "Feb", "Mar"], values: [32, 35, 42]
}], { x: 0.5, y: 4, w: 6, h: 3, lineSize: 3, lineSmooth: true });

// Pie chart
slide.addChart(pres.charts.PIE, [{
  name: "Share", labels: ["A", "B", "Other"], values: [35, 45, 20]
}], { x: 7, y: 1, w: 5, h: 4, showPercent: true });
```

### 더 보기 좋은 차트

기본 차트는 오래된 것 같습니다. 현대적이고 깔끔한 외관을 위해 다음 옵션을 적용하세요.

```javascript
slide.addChart(pres.charts.BAR, chartData, {
  x: 0.5, y: 1, w: 9, h: 4, barDir: "col",

  // Custom colors (match your presentation palette)
  chartColors: ["0D9488", "14B8A6", "5EEAD4"],

  // Clean background
  chartArea: { fill: { color: "FFFFFF" }, roundedCorners: true },

  // Muted axis labels
  catAxisLabelColor: "64748B",
  valAxisLabelColor: "64748B",

  // Subtle grid (value axis only)
  valGridLine: { color: "E2E8F0", size: 0.5 },
  catGridLine: { style: "none" },

  // Data labels on bars
  showValue: true,
  dataLabelPosition: "outEnd",
  dataLabelColor: "1E293B",

  // Hide legend for single series
  showLegend: false,
});
```

**주요 스타일 옵션:**
- `chartColors: [...]` - ​​시리즈/세그먼트의 16진수 색상
- `chartArea: { fill, border, roundedCorners }` - ​​차트 배경
- `catGridLine/valGridLine: { color, style, size }` - ​​그리드 선(숨기려면 `style: "none"`)
- `lineSmooth: true` - ​​곡선(선 차트)
- `legendPos: "r"` - ​​범례 위치: "b", "t", "l", "r", "tr"

---

## 슬라이드 마스터

```javascript
pres.defineSlideMaster({
  title: 'TITLE_SLIDE', background: { color: '283A5E' },
  objects: [{
    placeholder: { options: { name: 'title', type: 'title', x: 1, y: 2, w: 8, h: 2 } }
  }]
});

let titleSlide = pres.addSlide({ masterName: "TITLE_SLIDE" });
titleSlide.addText("My Title", { placeholder: "title" });
```

---

## 일반적인 함정

⚠️ 이러한 문제로 인해 파일 손상, 시각적 버그 또는 출력 중단이 발생합니다. 그들을 피하세요.

1. **16진수 색상에 "#"을 사용하지 마세요** - 파일이 손상될 수 있습니다.
   ```javascript
   color: "FF0000"      // ✅ CORRECT
   color: "#FF0000"     // ❌ WRONG
   ```

2. **16진수 색상 문자열로 불투명도를 인코딩하지 마세요** - 8자 색상(예: `"00000020"`)으로 인해 파일이 손상됩니다. 대신 `opacity` 속성을
   사용하세요.
   ```javascript
   shadow: { type: "outer", blur: 6, offset: 2, color: "00000020" }          // ❌ CORRUPTS FILE
   shadow: { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.12 }  // ✅ CORRECT
   ```

3. **`bullet: true`** 사용 - 절대 "•"와 같은 유니코드 기호를 사용하지 마세요(이중 글머리 기호 생성)

4. **배열 항목 사이에 `breakLine: true`**을 사용하거나 텍스트가 함께 실행됩니다.

5. **글머리 기호가 있는 `lineSpacing`을 피하세요** - 과도한 간격이 발생합니다. 대신 `paraSpaceAfter`을 사용하세요.

6. **각 프리젠테이션에는 새로운 인스턴스가 필요합니다** - `pptxgen()` 개체를 재사용하지 마세요.

7. **호출 전체에서 옵션 객체를 재사용하지 마세요** - PptxGenJS는 객체를 내부에서 변경합니다(예: 그림자 값을 EMU로 변환). 여러 호출 간에 하나의
   개체를 공유하면 두 번째 모양이 손상됩니다.
   ```javascript
   const shadow = { type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 };
   slide.addShape(pres.shapes.RECTANGLE, { shadow, ... });  // ❌ second call gets already-converted values
   slide.addShape(pres.shapes.RECTANGLE, { shadow, ... });

   const makeShadow = () => ({ type: "outer", blur: 6, offset: 2, color: "000000", opacity: 0.15 });
   slide.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), ... });  // ✅ fresh object each time
   slide.addShape(pres.shapes.RECTANGLE, { shadow: makeShadow(), ... });
   ```

8. **악센트 테두리가 있는 `ROUNDED_RECTANGLE`을 사용하지 마세요** - 직사각형 오버레이 막대는 둥근 모서리를 덮지 않습니다. 대신
   `RECTANGLE`을 사용하세요.
   ```javascript
   // ❌ WRONG: Accent bar doesn't cover rounded corners
   slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 1, y: 1, w: 3, h: 1.5, fill: { color: "FFFFFF" } });
   slide.addShape(pres.shapes.RECTANGLE, { x: 1, y: 1, w: 0.08, h: 1.5, fill: { color: "0891B2" } });

   // ✅ CORRECT: Use RECTANGLE for clean alignment
   slide.addShape(pres.shapes.RECTANGLE, { x: 1, y: 1, w: 3, h: 1.5, fill: { color: "FFFFFF" } });
   slide.addShape(pres.shapes.RECTANGLE, { x: 1, y: 1, w: 0.08, h: 1.5, fill: { color: "0891B2" } });
   ```

---

## 빠른 참조

- **모양**: 직사각형, 타원형, 선, ROUNDED_RECTANGLE
- **차트**: 막대형, 라인형, 파이형, 도넛형, 스캐터형, 버블형, 레이더형
- **레이아웃**: LAYOUT_16x9(10"×5.625"), LAYOUT_16x10, LAYOUT_4x3, LAYOUT_WIDE
- **정렬**: "왼쪽", "가운데", "오른쪽"
- **차트 데이터 라벨**: "outEnd", "inEnd", "center"
