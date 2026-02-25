# 채울 수 있는 필드

**중요: 이 단계를 순서대로 완료해야 합니다. 코드 작성으로 건너뛰지 마십시오.**

PDF 양식을 작성해야 하는 경우 먼저 PDF에 채울 수 있는 양식 필드가 있는지 확인하세요. 이 파일의 디렉터리에서 이 스크립트를 실행하세요.
`python scripts/check_fillable_fields <file.pdf>`, 결과에 따라 "채울 수 있는 필드" 또는 "채울 수 없는 필드"로 이동하여 해당
지침을 따르세요.

## 채울 수 있는 필드
PDF에 채울 수 있는 양식 필드가 있는 경우:

- 이 파일의 디렉터리 `python scripts/extract_form_field_info.py <input.pdf> <field_info.json>`에서 이 스크립트를
  실행합니다. 다음 형식의 필드 목록이 포함된 JSON 파일이 생성됩니다.
```
[
  {
    "field_id": (unique ID for the field),
    "page": (page number, 1-based),
    "rect": ([left, bottom, right, top] bounding box in PDF coordinates, y=0 is the bottom of the page),
    "type": ("text", "checkbox", "radio_group", or "choice"),
  },
  // Checkboxes have "checked_value" and "unchecked_value" properties:
  {
    "field_id": (unique ID for the field),
    "page": (page number, 1-based),
    "type": "checkbox",
    "checked_value": (Set the field to this value to check the checkbox),
    "unchecked_value": (Set the field to this value to uncheck the checkbox),
  },
  // Radio groups have a "radio_options" list with the possible choices.
  {
    "field_id": (unique ID for the field),
    "page": (page number, 1-based),
    "type": "radio_group",
    "radio_options": [
      {
        "value": (set the field to this value to select this radio option),
        "rect": (bounding box for the radio button for this option)
      },
      // Other radio options
    ]
  },
  // Multiple choice fields have a "choice_options" list with the possible choices:
  {
    "field_id": (unique ID for the field),
    "page": (page number, 1-based),
    "type": "choice",
    "choice_options": [
      {
        "value": (set the field to this value to select this option),
        "text": (display text of the option)
      },
      // Other choice options
    ],
  }
]
```

- 이 스크립트를 사용하여 PDF를 PNG로 변환합니다(페이지당 하나의 이미지)(이 파일 디렉터리에서 실행).
`python scripts/convert_pdf_to_images.py <file.pdf> <output_directory>`
그런 다음 이미지를 분석하여 각 양식 필드의 목적을 결정합니다(경계 상자 PDF 좌표를 이미지 좌표로 변환해야 함).

- 각 필드에 입력할 값을 사용하여 다음 형식으로 `field_values.json` 파일을 만듭니다.
```
[
  {
    "field_id": "last_name", // Must match the field_id from `extract_form_field_info.py`
    "description": "The user's last name",
    "page": 1, // Must match the "page" value in field_info.json
    "value": "Simpson"
  },
  {
    "field_id": "Checkbox12",
    "description": "Checkbox to be checked if the user is 18 or over",
    "page": 1,
    "value": "/On" // If this is a checkbox, use its "checked_value" value to check it. If it's a radio button group, use one of the "value" values in "radio_options".
  },
  // more fields
]
```

- 이 파일의 디렉터리에서 `fill_fillable_fields.py` 스크립트를 실행하여 채워진 PDF를 만듭니다.
`python scripts/fill_fillable_fields.py <input pdf> <field_values.json> <output pdf>`
이 스크립트는 귀하가 제공한 필드 ID와 값이 유효한지 확인합니다. 오류 메시지가 인쇄되면 해당 필드를 수정하고 다시 시도하십시오.

## 채울 수 없는 필드
PDF에 채울 수 있는 양식 필드가 없으면 텍스트 주석을 추가합니다. 먼저 PDF 구조에서 좌표를 추출해 보십시오(보다 정확함). 필요한 경우 시각적 추정으로 돌아갑니다.

## 1단계: 먼저 구조 추출 시도

정확한 PDF 좌표로 텍스트 레이블, 줄 및 확인란을 추출하려면 이 스크립트를 실행하십시오.
`python scripts/extract_form_structure.py <input.pdf> form_structure.json`

그러면 다음이 포함된 JSON 파일이 생성됩니다.

- **레이블**: 정확한 좌표가 있는 모든 텍스트 요소(PDF 포인트의 x0, 상단, x1, 하단)
- **lines**: 행 경계를 정의하는 수평선
- **체크박스**: 체크박스인 작은 정사각형 직사각형(중심 좌표 포함)
- **row_boundaries**: 수평선에서 계산된 행 상단/하단 위치

**결과 확인**: `form_structure.json`에 의미 있는 레이블(양식 필드에 해당하는 텍스트 요소)이 있는 경우 **접근 방식 A: 구조 기반 좌표**를
사용하세요. PDF가 스캔/이미지 기반이고 레이블이 거의 없거나 전혀 없는 경우 **접근 방식 B: 시각적 견적**을 사용하세요.

---

## 접근법 A: 구조 기반 좌표(선호)

`extract_form_structure.py`이 PDF에서 텍스트 레이블을 찾았을 때 사용하세요.

### A.1: 구조 분석

form_structure.json을 읽고 다음을 식별하십시오.

1. **라벨 그룹**: 단일 라벨을 형성하는 인접 텍스트 요소(예: "성" + "이름")
2. **행 구조**: `top` 값이 유사한 라벨이 같은 행에 있습니다.
3. **필드 열**: 입력 영역은 레이블이 끝난 후 시작됩니다(x0 = label.x1 + 간격).
4. **체크박스**: 구조에서 직접 체크박스 좌표를 사용합니다.

**좌표계**: y=0이 페이지 상단에 있고 y가 아래쪽으로 증가하는 PDF 좌표입니다.

### A.2: 누락된 요소 확인

구조 추출은 모든 양식 요소를 감지하지 못할 수도 있습니다. 일반적인 경우:

- **원형 체크박스**: 정사각형 직사각형만 체크박스로 감지됩니다.
- **복잡한 그래픽**: 장식 요소 또는 비표준 양식 컨트롤
- **바랜 색상이나 밝은 색상의 요소**: 추출할 수 없습니다.

form_structure.json에 없는 PDF 이미지의 양식 필드가 표시되면 해당 특정 필드에 대해 **시각적 분석**을 사용해야 합니다(아래 "하이브리드 접근 방식"
참조).

### A.3: PDF 좌표를 사용하여 fields.json 만들기

각 필드에 대해 추출된 구조에서 항목 좌표를 계산합니다.

**텍스트 필드:**

- 항목 x0 = 라벨 x1 + 5(라벨 뒤 작은 간격)
- 항목 x1 = 다음 레이블의 x0 또는 행 경계
- 항목 상단 = 라벨 상단과 동일
- 항목 하단 = 아래 행 경계선 또는 라벨 하단 + row_height

**체크박스:**

- form_structure.json에서 직접 확인란 직사각형 좌표를 사용합니다.
- Entry_bounding_box = [checkbox.x0, checkbox.top, checkbox.x1, checkbox.bottom]

`pdf_width` 및 `pdf_height`을 사용하여 fields.json을 만듭니다(PDF 좌표 신호 표시).
```json
{
  "pages": [
    {"page_number": 1, "pdf_width": 612, "pdf_height": 792}
  ],
  "form_fields": [
    {
      "page_number": 1,
      "description": "Last name entry field",
      "field_label": "Last Name",
      "label_bounding_box": [43, 63, 87, 73],
      "entry_bounding_box": [92, 63, 260, 79],
      "entry_text": {"text": "Smith", "font_size": 10}
    },
    {
      "page_number": 1,
      "description": "US Citizen Yes checkbox",
      "field_label": "Yes",
      "label_bounding_box": [260, 200, 280, 210],
      "entry_bounding_box": [285, 197, 292, 205],
      "entry_text": {"text": "X"}
    }
  ]
}
```

**중요**: `pdf_width`/`pdf_height`을 사용하고 form_structure.json에서 직접 조정하세요.

### A.4: 경계 상자 유효성 검사

채우기 전에 경계 상자에 오류가 있는지 확인하세요.
`python scripts/check_bounding_boxes.py fields.json`

글꼴 크기에 비해 너무 작은 경계 상자와 입력 상자가 교차하는지 확인합니다. 채우기 전에 보고된 오류를 수정하세요.

---

## 접근법 B: 시각적 추정(대체)

PDF가 스캔/이미지 기반이고 구조 추출에서 사용 가능한 텍스트 레이블이 발견되지 않은 경우(예: 모든 텍스트가 "(cid:X)" 패턴으로 표시됨) 이 기능을 사용하십시오.

### B.1: PDF를 이미지로 변환

`python scripts/convert_pdf_to_images.py <input.pdf> <images_dir/>`

### B.2: 초기 필드 식별

각 페이지 이미지를 검사하여 양식 섹션을 식별하고 필드 위치에 대한 **대략적인 추정**을 얻습니다.

- 양식 필드 레이블 및 대략적인 위치
- 입력 영역(텍스트 입력을 위한 줄, 상자 또는 공백)
- 체크박스와 대략적인 위치

각 필드에 대해 대략적인 픽셀 좌표를 기록해 두세요(아직 정확할 필요는 없음).

### B.3: 확대/축소 개선(정확도가 중요)

각 필드에 대해 추정 위치 주변의 영역을 잘라 좌표를 정확하게 세분화합니다.

**ImageMagick을 사용하여 확대된 자르기 만들기:**
```bash
magick <page_image> -crop <width>x<height>+<x>+<y> +repage <crop_output.png>
```

어디:

- `<x>, <y>` = 자르기 영역의 왼쪽 상단(대략적인 추정치에서 패딩을 뺀 값 사용)
- `<width>, <height>` = 자르기 영역 크기(필드 영역 + 각 측면의 패딩 ~50px)

**예:** 약 (100, 150)으로 추정되는 '이름' 필드를 세분화하려면 다음을 수행하세요.
```bash
magick images_dir/page_1.png -crop 300x80+50+120 +repage crops/name_field.png
```

(참고: `magick` 명령을 사용할 수 없는 경우 동일한 인수로 `convert`을 시도하십시오.)

**잘린 이미지를 검사**하여 정확한 좌표를 확인하세요.

1. 입력 영역이 시작되는 정확한 픽셀을 식별합니다(라벨 뒤).
2. 입력 영역이 끝나는 위치를 식별합니다(다음 필드 또는 가장자리 전)
3. 입력란/상자의 상단과 하단을 식별합니다.

**자르기 좌표를 다시 전체 이미지 좌표로 변환:**

- 전체_x = 자르기_x + 자르기_오프셋_x
- full_y = 자르기_y + 자르기_오프셋_y

예: 자르기가 (50, 120)에서 시작되고 입력 상자가 자르기 내에서 (52, 18)에서 시작하는 경우:

- Entry_x0 = 52 + 50 = 102
- Entry_top = 18 + 120 = 138

**각 밭에 대해 반복**, 가능하면 인근 밭을 단일 작물로 그룹화합니다.

### B.4: 세련된 좌표를 사용하여 fields.json 만들기

`image_width` 및 `image_height`을 사용하여 fields.json을 만듭니다(신호 이미지 좌표).
```json
{
  "pages": [
    {"page_number": 1, "image_width": 1700, "image_height": 2200}
  ],
  "form_fields": [
    {
      "page_number": 1,
      "description": "Last name entry field",
      "field_label": "Last Name",
      "label_bounding_box": [120, 175, 242, 198],
      "entry_bounding_box": [255, 175, 720, 218],
      "entry_text": {"text": "Smith", "font_size": 10}
    }
  ]
}
```

**중요**: `image_width`/`image_height` 및 확대/축소 분석에서 정제된 픽셀 좌표를 사용하세요.

### B.5: 경계 상자 유효성 검사

채우기 전에 경계 상자에 오류가 있는지 확인하세요.
`python scripts/check_bounding_boxes.py fields.json`

글꼴 크기에 비해 너무 작은 경계 상자와 입력 상자가 교차하는지 확인합니다. 채우기 전에 보고된 오류를 수정하세요.

---

## 하이브리드 접근 방식: 구조 + 시각적

대부분의 필드에서 구조 추출이 작동하지만 일부 요소(예: 원형 체크박스, 특이한 양식 컨트롤)가 누락된 경우 이 기능을 사용하세요.

1. form_structure.json에서 감지된 필드에 **접근법 A 사용**
2. 누락된 필드를 시각적으로 분석하기 위해 **PDF를 이미지로 변환**
3. 누락된 필드에 **확대/축소 개선**(접근 방식 B) 사용
4. **좌표 결합**: 구조 추출의 필드에는 `pdf_width`/`pdf_height`을 사용합니다. 시각적으로 추정된 필드의 경우 이미지 좌표를 PDF 좌표로
   변환해야 합니다.

- pdf_x = image_x * (pdf_width / image_width)
- pdf_y = image_y * (pdf_height / image_height)
5. fields.json에서 **단일 좌표계 사용** - `pdf_width`/`pdf_height`을 사용하여 모두 PDF 좌표로 변환합니다.

---

## 2단계: 작성 전 확인

**채우기 전에 항상 경계 상자의 유효성을 검사하세요.**
`python scripts/check_bounding_boxes.py fields.json`

이는 다음 사항을 확인합니다.

- 교차하는 경계 상자(텍스트가 겹칠 수 있음)
- 지정된 글꼴 크기에 비해 너무 작은 입력 상자

계속하기 전에 fields.json에서 보고된 오류를 수정하세요.

## 3단계: 양식 작성

채우기 스크립트는 좌표계를 자동 감지하고 변환을 처리합니다.
`python scripts/fill_pdf_form_with_annotations.py <input.pdf> fields.json <output.pdf>`

## 4단계: 출력 확인

채워진 PDF를 이미지로 변환하고 텍스트 배치를 확인합니다.
`python scripts/convert_pdf_to_images.py <output.pdf> <verify_images/>`

텍스트 위치가 잘못된 경우:

- **접근 방식 A**: `pdf_width`/`pdf_height`과 함께 form_structure.json의 PDF 좌표를 사용하고 있는지 확인하세요.
- **접근 방식 B**: 이미지 크기가 일치하고 좌표가 정확한 픽셀인지 확인합니다.
- **하이브리드**: 시각적으로 추정된 필드에 대한 좌표 변환이 올바른지 확인합니다.
