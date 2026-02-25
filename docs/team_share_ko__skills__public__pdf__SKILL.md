# pdf

## 문서 정보

- **이름**: `pdf`
- **설명**: 사용자가 PDF 파일로 무엇이든 하고 싶을 때마다 이 기술을 사용하세요. 여기에는 PDF에서 텍스트/표 읽기 또는 추출, 여러 PDF를 하나로 결합 또는
          병합, PDF 분할, 페이지 회전, 워터마크 추가, 새 PDF 생성, PDF 양식 채우기, PDF 암호화/암호 해독, 이미지 추출 및 스캔한 PDF에 대한
          OCR을 포함하여 검색 가능하게 만듭니다. 사용자가 .pdf 파일을 언급하거나 파일 생성을 요청하는 경우 이 기술을 사용하세요.

- **라이선스**: -


## 개요

이 가이드에서는 Python 라이브러리와 명령줄 도구를 사용한 필수 PDF 처리 작업을 다룹니다. 고급 기능, JavaScript 라이브러리 및 자세한 예는
REFERENCE.md를 참조하세요. PDF 양식을 작성해야 하는 경우 FORMS.md를 읽고 해당 지침을 따르세요.

## 빠른 시작

```python
from pypdf import PdfReader, PdfWriter

## Read a PDF
reader = PdfReader("document.pdf")
print(f"Pages: {len(reader.pages)}")

## Extract text
text = ""
for page in reader.pages:
    text += page.extract_text()
```

## Python 라이브러리

### pypdf - 기본 작업

#### PDF 병합
```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    reader = PdfReader(pdf_file)
    for page in reader.pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as output:
    writer.write(output)
```

#### PDF 분할
```python
reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as output:
        writer.write(output)
```

#### 메타데이터 추출
```python
reader = PdfReader("document.pdf")
meta = reader.metadata
print(f"Title: {meta.title}")
print(f"Author: {meta.author}")
print(f"Subject: {meta.subject}")
print(f"Creator: {meta.creator}")
```

#### 페이지 회전
```python
reader = PdfReader("input.pdf")
writer = PdfWriter()

page = reader.pages[0]
page.rotate(90)  # Rotate 90 degrees clockwise
writer.add_page(page)

with open("rotated.pdf", "wb") as output:
    writer.write(output)
```

### pdfplumumber - 텍스트 및 테이블 추출

#### 레이아웃으로 텍스트 추출
```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        text = page.extract_text()
        print(text)
```

#### 테이블 추출
```python
with pdfplumber.open("document.pdf") as pdf:
    for i, page in enumerate(pdf.pages):
        tables = page.extract_tables()
        for j, table in enumerate(tables):
            print(f"Table {j+1} on page {i+1}:")
            for row in table:
                print(row)
```

#### 고급 테이블 추출
```python
import pandas as pd

with pdfplumber.open("document.pdf") as pdf:
    all_tables = []
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if table:  # Check if table is not empty
                df = pd.DataFrame(table[1:], columns=table[0])
                all_tables.append(df)

## Combine all tables
if all_tables:
    combined_df = pd.concat(all_tables, ignore_index=True)
    combined_df.to_excel("extracted_tables.xlsx", index=False)
```

### Reportlab - PDF 만들기

#### 기본 PDF 생성
```python
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

c = canvas.Canvas("hello.pdf", pagesize=letter)
width, height = letter

## Add text
c.drawString(100, height - 100, "Hello World!")
c.drawString(100, height - 120, "This is a PDF created with reportlab")

## Add a line
c.line(100, height - 140, 400, height - 140)

## Save
c.save()
```

#### 여러 페이지로 PDF 만들기
```python
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("report.pdf", pagesize=letter)
styles = getSampleStyleSheet()
story = []

## Add content
title = Paragraph("Report Title", styles['Title'])
story.append(title)
story.append(Spacer(1, 12))

body = Paragraph("This is the body of the report. " * 20, styles['Normal'])
story.append(body)
story.append(PageBreak())

## Page 2
story.append(Paragraph("Page 2", styles['Heading1']))
story.append(Paragraph("Content for page 2", styles['Normal']))

## Build PDF
doc.build(story)
```

#### 아래 첨자와 위 첨자

**중요**: ReportLab PDF에서는 유니코드 아래 첨자/위 첨자 문자(₀₁₂₃₄₅₆₇₈₉, ⁰¹²³⁴⁵⁶⁷⁸⁹)를 사용하지 마십시오. 내장 글꼴에는 이러한 문자 모양이
포함되어 있지 않으므로 단색 검정 상자로 렌더링됩니다.

대신 Paragraph 개체에 ReportLab의 XML 마크업 태그를 사용하세요.
```python
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet

styles = getSampleStyleSheet()

## Subscripts: use <sub> tag
chemical = Paragraph("H<sub>2</sub>O", styles['Normal'])

## Superscripts: use <super> tag
squared = Paragraph("x<super>2</super> + y<super>2</super>", styles['Normal'])
```

캔버스로 그린 텍스트(단락 개체 아님)의 경우 유니코드 아래 첨자/위 첨자를 사용하는 대신 글꼴 크기와 위치를 수동으로 조정합니다.

## 명령줄 도구

### pdftotext (poppler-utils)
```bash
## Extract text
pdftotext input.pdf output.txt

## Extract text preserving layout
pdftotext -layout input.pdf output.txt

## Extract specific pages
pdftotext -f 1 -l 5 input.pdf output.txt  # Pages 1-5
```

### qpdf
```bash
## Merge PDFs
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

## Split pages
qpdf input.pdf --pages . 1-5 -- pages1-5.pdf
qpdf input.pdf --pages . 6-10 -- pages6-10.pdf

## Rotate pages
qpdf input.pdf output.pdf --rotate=+90:1  # Rotate page 1 by 90 degrees

## Remove password
qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf
```

### pdftk(사용 가능한 경우)
```bash
## Merge
pdftk file1.pdf file2.pdf cat output merged.pdf

## Split
pdftk input.pdf burst

## Rotate
pdftk input.pdf rotate 1east output rotated.pdf
```

## 일반적인 작업

### 스캔한 PDF에서 텍스트 추출
```python
## Requires: pip install pytesseract pdf2image
import pytesseract
from pdf2image import convert_from_path

## Convert PDF to images
images = convert_from_path('scanned.pdf')

## OCR each page
text = ""
for i, image in enumerate(images):
    text += f"Page {i+1}:\n"
    text += pytesseract.image_to_string(image)
    text += "\n\n"

print(text)
```

### 워터마크 추가
```python
from pypdf import PdfReader, PdfWriter

## Create watermark (or load existing)
watermark = PdfReader("watermark.pdf").pages[0]

## Apply to all pages
reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)

with open("watermarked.pdf", "wb") as output:
    writer.write(output)
```

### 이미지 추출
```bash
## Using pdfimages (poppler-utils)
pdfimages -j input.pdf output_prefix

## This extracts all images as output_prefix-000.jpg, output_prefix-001.jpg, etc.
```

### 비밀번호 보호
```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()

for page in reader.pages:
    writer.add_page(page)

## Add password
writer.encrypt("userpassword", "ownerpassword")

with open("encrypted.pdf", "wb") as output:
    writer.write(output)
```

## 빠른 참조

| 작업 | 최고의 도구 | 명령/코드 |
|------|-----------|--------------|
| PDF 병합 | pypdf | `writer.add_page(page)` |
| PDF 분할 | pypdf | 파일당 한 페이지 |
| 텍스트 추출 | pdf배관공 | `page.extract_text()` |
| 테이블 추출 | pdf배관공 | `page.extract_tables()` |
| PDF 작성 | 보고서 연구실 | 캔버스 또는 오리너구리 |
| 명령줄 병합 | qpdf | `qpdf --empty --pages ...` |
| OCR 스캔 PDF | 피테서랙트 | 먼저 이미지로 변환 |
| PDF 양식 채우기 | pdf-lib 또는 pypdf(FORMS.md 참조) | FORMS.md |

## 다음 단계

- 고급 pypdfium2 사용법은 REFERENCE.md를 참조하세요.
- JavaScript 라이브러리(pdf-lib)의 경우 REFERENCE.md를 참조하세요.
- PDF 양식을 작성해야 하는 경우 FORMS.md의 지침을 따르세요.
- 문제 해결 가이드는 REFERENCE.md를 참조하세요.
