!!! info "문서 정보"
    **이름**: `docx`

    **설명**:
    사용자가 Word 문서(.docx 파일)를 생성, 읽기, 편집 또는 조작하려고 할 때마다 이 기술을 사용하십시오. 트리거에는 'Word doc', 'word
    문서', '.docx'에 대한 언급 또는 목차, 제목, 페이지 번호 또는 레터헤드와 같은 형식의 전문 문서 생성 요청이 포함됩니다. 또한 .docx 파일에서
    콘텐츠를 추출 또는 재구성할 때, 문서에 이미지를 삽입하거나 바꿀 때, Word 파일에서 찾기 및 바꾸기를 수행할 때, 추적된 작업을 수행할 때 사용합니다.
    변경 또는 의견을 작성하거나 콘텐츠를 세련된 Word 문서로 변환합니다. 사용자가 '보고서', '메모', '편지', '템플릿' 또는 Word 또는 .docx
    파일과 유사한 결과물을 요청하는 경우 PDF, 스프레드시트, Google Docs 또는 문서 생성과 관련 없는 일반 코딩 작업에는 이 기술을 사용하지 마세요.

    **라이선스**: 독점. LICENSE.txt에 전체 약관이 있습니다.

# DOCX 생성, 편집 및 분석

## 개요

.docx 파일은 XML 파일이 포함된 ZIP 아카이브입니다.

## 빠른 참조

| 작업 | 접근 |
|------|----------|
| 콘텐츠 읽기/분석 | `pandoc` 또는 원시 XML용 압축 풀기 |
| 새 문서 만들기 | `docx-js` 사용 - 아래의 새 문서 만들기 |
| 기존 문서 편집 | 압축 풀기 → XML 편집 → 재압축 - 아래의 기존 문서 편집 참조 |

### .doc를 .docx로 변환

편집하기 전에 기존 `.doc` 파일을 변환해야 합니다.

```bash
python scripts/office/soffice.py --headless --convert-to docx document.doc
```

### 콘텐츠 읽기

```bash
# Text extraction with tracked changes
pandoc --track-changes=all document.docx -o output.md

# Raw XML access
python scripts/office/unpack.py document.docx unpacked/
```

### 이미지로 변환하기

```bash
python scripts/office/soffice.py --headless --convert-to pdf document.docx
pdftoppm -jpeg -r 150 document.pdf page
```

### 추적된 변경 사항 수락

추적된 모든 변경 사항이 허용된 깨끗한 문서를 생성하려면(LibreOffice 필요):

```bash
python scripts/accept_changes.py input.docx output.docx
```

---

## 새 문서 만들기

JavaScript로 .docx 파일을 생성한 다음 유효성을 검사합니다. 설치: `npm install -g docx`

### 설정
```javascript
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
        Header, Footer, AlignmentType, PageOrientation, LevelFormat, ExternalHyperlink,
        InternalHyperlink, Bookmark, FootnoteReferenceRun, PositionalTab,
        PositionalTabAlignment, PositionalTabRelativeTo, PositionalTabLeader,
        TabStopType, TabStopPosition, Column, SectionType,
        TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
        VerticalAlign, PageNumber, PageBreak } = require('docx');

const doc = new Document({ sections: [{ children: [/* content */] }] });
Packer.toBuffer(doc).then(buffer => fs.writeFileSync("doc.docx", buffer));
```

### 유효성 검사
파일을 생성한 후 유효성을 검사합니다. 유효성 검사에 실패하면 압축을 풀고 XML을 수정한 후 다시 압축하세요.
```bash
python scripts/office/validate.py doc.docx
```

### 페이지 크기

```javascript
// CRITICAL: docx-js defaults to A4, not US Letter
// Always set page size explicitly for consistent results
sections: [{
  properties: {
    page: {
      size: {
        width: 12240,   // 8.5 inches in DXA
        height: 15840   // 11 inches in DXA
      },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } // 1 inch margins
    }
  },
  children: [/* content */]
}]
```

**일반적인 페이지 크기(DXA 단위, 1440 DXA = 1인치):**

| 종이 | 폭 | 신장 | 콘텐츠 너비(1" 여백) |
|-------|-------|--------|---------------------------|
| 미국 편지 | 12,240 | 15,840 | 9,360 |
| A4(기본값) | 11,906 | 16,838 | 9,026 |

**가로 방향:** docx-js는 내부적으로 너비/높이를 교환하므로 세로 크기를 전달하고 교환을 처리하도록 합니다.
```javascript
size: {
  width: 12240,   // Pass SHORT edge as width
  height: 15840,  // Pass LONG edge as height
  orientation: PageOrientation.LANDSCAPE  // docx-js swaps them in the XML
},
// Content width = 15840 - left margin - right margin (uses the long edge)
```

### 스타일(내장 제목 재정의)

Arial을 기본 글꼴로 사용합니다(범용적으로 지원됨). 가독성을 위해 제목을 검은색으로 유지하세요.

```javascript
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } }, // 12pt default
    paragraphStyles: [
      // IMPORTANT: Use exact IDs to override built-in styles
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 240 }, outlineLevel: 0 } }, // outlineLevel required for TOC
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 180 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Title")] }),
    ]
  }]
});
```

### 목록(유니코드 글머리 기호를 절대 사용하지 마세요)

```javascript
// ❌ WRONG - never manually insert bullet characters
new Paragraph({ children: [new TextRun("• Item")] })  // BAD
new Paragraph({ children: [new TextRun("\u2022 Item")] })  // BAD

// ✅ CORRECT - use numbering config with LevelFormat.BULLET
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    children: [
      new Paragraph({ numbering: { reference: "bullets", level: 0 },
        children: [new TextRun("Bullet item")] }),
      new Paragraph({ numbering: { reference: "numbers", level: 0 },
        children: [new TextRun("Numbered item")] }),
    ]
  }]
});

// ⚠️ Each reference creates INDEPENDENT numbering
// Same reference = continues (1,2,3 then 4,5,6)
// Different reference = restarts (1,2,3 then 1,2,3)
```

### 테이블

**중요: 테이블에는 이중 너비가 필요합니다** - 테이블에 `columnWidths`을 설정하고 각 셀에 `width`을 모두 설정합니다. 둘 다 없으면 일부 플랫폼에서 테이블이 잘못 렌더링됩니다.

```javascript
// CRITICAL: Always set table width for consistent rendering
// CRITICAL: Use ShadingType.CLEAR (not SOLID) to prevent black backgrounds
const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

new Table({
  width: { size: 9360, type: WidthType.DXA }, // Always use DXA (percentages break in Google Docs)
  columnWidths: [4680, 4680], // Must sum to table width (DXA: 1440 = 1 inch)
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 4680, type: WidthType.DXA }, // Also set on each cell
          shading: { fill: "D5E8F0", type: ShadingType.CLEAR }, // CLEAR not SOLID
          margins: { top: 80, bottom: 80, left: 120, right: 120 }, // Cell padding (internal, not added to width)
          children: [new Paragraph({ children: [new TextRun("Cell")] })]
        })
      ]
    })
  ]
})
```

**테이블 너비 계산:**

항상 `WidthType.DXA`을 사용하세요. Google Docs에서는 `WidthType.PERCENTAGE`이 중단됩니다.

```javascript
// Table width = sum of columnWidths = content width
// US Letter with 1" margins: 12240 - 2880 = 9360 DXA
width: { size: 9360, type: WidthType.DXA },
columnWidths: [7000, 2360]  // Must sum to table width
```

**너비 규칙:**
- **항상 `WidthType.DXA`** 사용 — 절대 `WidthType.PERCENTAGE` 사용 안 함(Google Docs와 호환되지 않음)
- 테이블 너비는 `columnWidths`의 합과 같아야 합니다.
- `width` 셀은 해당 `columnWidth`과 일치해야 합니다.
- `margins` 셀은 내부 패딩입니다. 셀 너비를 늘리지 않고 콘텐츠 영역을 줄입니다.
- 전체 너비 표의 경우: 콘텐츠 너비(페이지 너비에서 왼쪽 및 오른쪽 여백을 뺀 값)를 사용합니다.

### 이미지

```javascript
// CRITICAL: type parameter is REQUIRED
new Paragraph({
  children: [new ImageRun({
    type: "png", // Required: png, jpg, jpeg, gif, bmp, svg
    data: fs.readFileSync("image.png"),
    transformation: { width: 200, height: 150 },
    altText: { title: "Title", description: "Desc", name: "Name" } // All three required
  })]
})
```

### 페이지 나누기

```javascript
// CRITICAL: PageBreak must be inside a Paragraph
new Paragraph({ children: [new PageBreak()] })

// Or use pageBreakBefore
new Paragraph({ pageBreakBefore: true, children: [new TextRun("New page")] })
```

### 하이퍼링크

```javascript
// External link
new Paragraph({
  children: [new ExternalHyperlink({
    children: [new TextRun({ text: "Click here", style: "Hyperlink" })],
    link: "https://example.com",
  })]
})

// Internal link (bookmark + reference)
// 1. Create bookmark at destination
new Paragraph({ heading: HeadingLevel.HEADING_1, children: [
  new Bookmark({ id: "chapter1", children: [new TextRun("Chapter 1")] }),
]})
// 2. Link to it
new Paragraph({ children: [new InternalHyperlink({
  children: [new TextRun({ text: "See Chapter 1", style: "Hyperlink" })],
  anchor: "chapter1",
})]})
```

### 각주

```javascript
const doc = new Document({
  footnotes: {
    1: { children: [new Paragraph("Source: Annual Report 2024")] },
    2: { children: [new Paragraph("See appendix for methodology")] },
  },
  sections: [{
    children: [new Paragraph({
      children: [
        new TextRun("Revenue grew 15%"),
        new FootnoteReferenceRun(1),
        new TextRun(" using adjusted metrics"),
        new FootnoteReferenceRun(2),
      ],
    })]
  }]
});
```

### 탭 정지

```javascript
// Right-align text on same line (e.g., date opposite a title)
new Paragraph({
  children: [
    new TextRun("Company Name"),
    new TextRun("\tJanuary 2025"),
  ],
  tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
})

// Dot leader (e.g., TOC-style)
new Paragraph({
  children: [
    new TextRun("Introduction"),
    new TextRun({ children: [
      new PositionalTab({
        alignment: PositionalTabAlignment.RIGHT,
        relativeTo: PositionalTabRelativeTo.MARGIN,
        leader: PositionalTabLeader.DOT,
      }),
      "3",
    ]}),
  ],
})
```

### 다중 열 레이아웃

```javascript
// Equal-width columns
sections: [{
  properties: {
    column: {
      count: 2,          // number of columns
      space: 720,        // gap between columns in DXA (720 = 0.5 inch)
      equalWidth: true,
      separate: true,    // vertical line between columns
    },
  },
  children: [/* content flows naturally across columns */]
}]

// Custom-width columns (equalWidth must be false)
sections: [{
  properties: {
    column: {
      equalWidth: false,
      children: [
        new Column({ width: 5400, space: 720 }),
        new Column({ width: 3240 }),
      ],
    },
  },
  children: [/* content */]
}]
```

`type: SectionType.NEXT_COLUMN`을 사용하여 새 섹션으로 열 나누기를 강제로 수행합니다.

### 목차

```javascript
// CRITICAL: Headings must use HeadingLevel ONLY - no custom styles
new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" })
```

### 머리글/바닥글

```javascript
sections: [{
  properties: {
    page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } // 1440 = 1 inch
  },
  headers: {
    default: new Header({ children: [new Paragraph({ children: [new TextRun("Header")] })] })
  },
  footers: {
    default: new Footer({ children: [new Paragraph({
      children: [new TextRun("Page "), new TextRun({ children: [PageNumber.CURRENT] })]
    })] })
  },
  children: [/* content */]
}]
```

### docx-js에 대한 중요한 규칙

- **페이지 크기를 명시적으로 설정** - docx-js의 기본값은 A4입니다. 미국 문서에는 US Letter(12240 x 15840 DXA)를 사용합니다.
- **가로: 세로 크기 전달** - docx-js는 내부적으로 너비/높이를 바꿉니다. 짧은 가장자리를 `width`으로, 긴 가장자리를 `height`로 전달하고 `orientation: PageOrientation.LANDSCAPE`을 설정합니다.
- **`\n`을 사용하지 마세요** - 별도의 단락 요소를 사용하세요.
- **유니코드 글머리 기호를 사용하지 마세요** - 번호 매기기 구성에 `LevelFormat.BULLET`을 사용하세요.
- **PageBreak는 단락에 있어야 합니다** - 독립 실행형은 잘못된 XML을 생성합니다.
- **ImageRun에는 `type`**이 필요합니다. - 항상 png/jpg/etc를 지정하세요.
- **항상 DXA를 사용하여 `width` 테이블을 설정합니다** - `WidthType.PERCENTAGE`을 사용하지 마세요(Google Docs에서 중단됨).
- **테이블에는 이중 너비가 필요합니다** - `columnWidths` 배열 및 셀 `width`, 둘 다 일치해야 합니다.
- **테이블 너비 = 열 너비의 합계** - DXA의 경우 정확하게 합산되었는지 확인하세요.
- **항상 셀 여백을 추가하세요** - 읽을 수 있는 패딩에는 `margins: { top: 80, bottom: 80, left: 120, right: 120 }`을 사용하세요.
- **`ShadingType.CLEAR`** 사용 - 테이블 음영에는 절대로 SOLID를 사용하지 마세요.
- **테이블을 구분선/규칙으로 사용하지 마세요** - 셀은 최소 높이를 가지며 빈 상자(머리글/바닥글 포함)로 렌더링됩니다. 대신 단락에 `border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2E75B6", space: 1 } }`을 사용하세요. 2열 바닥글의 경우 테이블이 아닌 탭 정지(탭 정지 섹션 참조)를 사용하세요.
- **TOC에는 HeadingLevel만 필요합니다** - 제목 단락에는 사용자 정의 스타일이 없습니다.
- **기본 제공 스타일 재정의** - 정확한 ID 사용: "제목1", "제목2" 등
- **`outlineLevel`** 포함 - TOC에 필수(H1의 경우 0, H2의 경우 1 등)

---

## 기존 문서 편집

**3단계를 모두 순서대로 따르세요.**

### 1단계: 포장 풀기
```bash
python scripts/office/unpack.py document.docx unpacked/
```
XML을 추출하고, 예쁘게 인쇄하고, 인접한 실행을 병합하고, 둥근 따옴표를 XML 엔터티(`&#x201C;` 등)로 변환하여 편집 후에도 유지됩니다. 병합 실행을 건너뛰려면 `--merge-runs false`을 사용하세요.

### 2단계: XML 편집

`unpacked/word/`의 파일을 편집합니다. 패턴은 아래 XML 참조를 참조하세요.

사용자가 명시적으로 다른 이름 사용을 요청하지 않는 한 추적된 변경 사항 및 댓글에 "Claude"를 작성자로 사용하세요**.

**문자열 교체를 위해 편집 도구를 직접 사용하세요. Python 스크립트를 작성하지 마십시오.** 스크립트는 불필요한 복잡성을 초래합니다. 편집 도구는 대체되는 내용을 정확하게 보여줍니다.

**중요: 새 콘텐츠에 스마트 따옴표를 사용하세요.** 아포스트로피나 ​​따옴표가 포함된 텍스트를 추가할 때 XML 엔터티를 사용하여 스마트 따옴표를 생성하세요.
```xml
<!-- Use these entities for professional typography -->
<w:t>Here&#x2019;s a quote: &#x201C;Hello&#x201D;</w:t>
```
| 엔터티 | 캐릭터 |
|--------|-----------|
| `&#x2018;` | ' (왼쪽 싱글) |
| `&#x2019;` | ’(오른쪽 싱글/아포스트로피) |
| `&#x201C;` | “(왼쪽 이중) |
| `&#x201D;` | ”(오른쪽 이중) |

**주석 추가:** `comment.py`을 사용하여 여러 XML 파일의 상용구를 처리합니다(텍스트는 사전 이스케이프 처리된 XML이어야 함).
```bash
python scripts/comment.py unpacked/ 0 "Comment text with &amp; and &#x2019;"
python scripts/comment.py unpacked/ 1 "Reply text" --parent 0  # reply to comment 0
python scripts/comment.py unpacked/ 0 "Text" --author "Custom Author"  # custom author name
```
그런 다음 document.xml에 마커를 추가합니다(XML 참조의 주석 참조).

### 3단계: 짐 꾸리기
```bash
python scripts/office/pack.py unpacked/ output.docx --original document.docx
```
자동 복구로 유효성을 검사하고, XML을 압축하고, DOCX를 생성합니다. 건너뛰려면 `--validate false`을 사용하세요.

**자동 복구로 해결되는 문제:**
- `durableId` >= 0x7FFFFFFF (유효한 ID를 재생성함)
- 공백이 있는 `<w:t>`에 `xml:space="preserve"`이 누락되었습니다.

**자동 복구로 문제가 해결되지 않음:**
- 잘못된 XML, 잘못된 요소 중첩, 관계 누락, 스키마 위반

### 일반적인 함정

- **전체 `<w:r>` 요소 교체**: 추적된 변경 사항을 추가할 때 전체 `<w:r>...</w:r>` 블록을 형제인 `<w:del>...<w:ins>...`으로 교체합니다. 실행 내에 추적된 변경 태그를 삽입하지 마세요.
- **`<w:rPr>` 형식 유지**: 원본 실행의 `<w:rPr>` 블록을 추적된 변경 실행에 복사하여 굵게, 글꼴 크기 등을 유지합니다.

---

## XML 참조

### 스키마 준수

- **`<w:pPr>`**의 요소 순서: `<w:pStyle>`, `<w:numPr>`, `<w:spacing>`, `<w:ind>`, `<w:jc>`, `<w:rPr>` 마지막
- **공백**: 선행/후행 공백을 사용하여 `xml:space="preserve"`을 `<w:t>`에 추가합니다.
- **RSID**: 8자리 16진수여야 합니다(예: `00AB1234`).

### 추적된 변경 사항

**삽입:**
```xml
<w:ins w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:t>inserted text</w:t></w:r>
</w:ins>
```

**삭제:**
```xml
<w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
```

**`<w:del>` 내부**: `<w:t>` 대신 `<w:delText>`을 사용하고, `<w:instrText>` 대신 `<w:delInstrText>`을 사용합니다.

**최소한의 수정** - 변경사항만 표시:
```xml
<!-- Change "30 days" to "60 days" -->
<w:r><w:t>The term is </w:t></w:r>
<w:del w:id="1" w:author="Claude" w:date="...">
  <w:r><w:delText>30</w:delText></w:r>
</w:del>
<w:ins w:id="2" w:author="Claude" w:date="...">
  <w:r><w:t>60</w:t></w:r>
</w:ins>
<w:r><w:t> days.</w:t></w:r>
```

**전체 단락/목록 항목 삭제** - 단락에서 모든 콘텐츠를 제거할 때 단락 표시도 삭제됨으로 표시하여 다음 단락과 병합됩니다. `<w:pPr><w:rPr>` 안에 `<w:del/>`을 추가합니다.
```xml
<w:p>
  <w:pPr>
    <w:numPr>...</w:numPr>  <!-- list numbering if present -->
    <w:rPr>
      <w:del w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z"/>
    </w:rPr>
  </w:pPr>
  <w:del w:id="2" w:author="Claude" w:date="2025-01-01T00:00:00Z">
    <w:r><w:delText>Entire paragraph content being deleted...</w:delText></w:r>
  </w:del>
</w:p>
```
`<w:pPr><w:rPr>`에 `<w:del/>`이 없으면 변경 내용을 수락하면 빈 단락/목록 항목이 남습니다.

**다른 저자의 삽입 거부** - 삽입 내에서 삭제 중첩:
```xml
<w:ins w:author="Jane" w:id="5">
  <w:del w:author="Claude" w:id="10">
    <w:r><w:delText>their inserted text</w:delText></w:r>
  </w:del>
</w:ins>
```

**다른 작성자의 삭제 복원** - 다음에 삽입 추가(삭제 수정 안 함):
```xml
<w:del w:author="Jane" w:id="5">
  <w:r><w:delText>deleted text</w:delText></w:r>
</w:del>
<w:ins w:author="Claude" w:id="10">
  <w:r><w:t>deleted text</w:t></w:r>
</w:ins>
```

### 댓글

`comment.py`을 실행한 후(2단계 참조) document.xml에 마커를 추가합니다. 응답하려면 `--parent` 플래그와 상위 항목 내부의 중첩 마커를 사용하세요.

**중요: `<w:commentRangeStart>` 및 `<w:commentRangeEnd>`은 `<w:r>`의 형제이며 결코 `<w:r>` 내부에 있지 않습니다.**

```xml
<!-- Comment markers are direct children of w:p, never inside w:r -->
<w:commentRangeStart w:id="0"/>
<w:del w:id="1" w:author="Claude" w:date="2025-01-01T00:00:00Z">
  <w:r><w:delText>deleted</w:delText></w:r>
</w:del>
<w:r><w:t> more text</w:t></w:r>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>

<!-- Comment 0 with reply 1 nested inside -->
<w:commentRangeStart w:id="0"/>
  <w:commentRangeStart w:id="1"/>
  <w:r><w:t>text</w:t></w:r>
  <w:commentRangeEnd w:id="1"/>
<w:commentRangeEnd w:id="0"/>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="0"/></w:r>
<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="1"/></w:r>
```

### 이미지

1. `word/media/`에 이미지 파일을 추가합니다.
2. `word/_rels/document.xml.rels`에 관계를 추가합니다.
```xml
<Relationship Id="rId5" Type=".../image" Target="media/image1.png"/>
```
3. `[Content_Types].xml`에 콘텐츠 유형을 추가합니다.
```xml
<Default Extension="png" ContentType="image/png"/>
```
4. document.xml의 참조:
```xml
<w:drawing>
  <wp:inline>
    <wp:extent cx="914400" cy="914400"/>  <!-- EMUs: 914400 = 1 inch -->
    <a:graphic>
      <a:graphicData uri=".../picture">
        <pic:pic>
          <pic:blipFill><a:blip r:embed="rId5"/></pic:blipFill>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing>
```

---

## 종속성

- **pandoc**: 텍스트 추출
- **docx**: `npm install -g docx`(새 문서)
- **LibreOffice**: PDF 변환(`scripts/office/soffice.py`을 통해 샌드박스 환경에 대해 자동 구성)
- **포플러**: 이미지용 `pdftoppm`
