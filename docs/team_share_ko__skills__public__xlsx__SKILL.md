# xlsx

## 문서 정보

- **이름**: `xlsx`
- **설명**: 스프레드시트 파일이 기본 입력 또는 출력일 때마다 이 기술을 사용하십시오. 이는 사용자가 기존 .xlsx, .xlsm, .csv 또는 .tsv 파일 열기,
          읽기, 편집 또는 수정(예: 열 추가, 수식 계산, 서식 지정, 차트 작성, 지저분한 데이터 정리), 처음부터 또는 다른 데이터 소스에서 새 스프레드시트 생성
          또는 표 형식 파일 형식 간 변환을 원하는 모든 작업을 의미합니다. 특히 사용자가 스프레드시트 파일을 다음과 같이 참조할 때 트리거됩니다. 이름이나 경로를
          아무렇지도 않게(예: "내 다운로드의 xlsx") 처리하거나 여기에서 생성하기를 원합니다. 또한 지저분한 표 형식 데이터 파일(잘못된 행, 잘못 배치된 헤더,
          정크 데이터)을 정리하거나 적절한 스프레드시트로 재구성하기 위해 트리거됩니다. 기본 결과물이 Word 문서, HTML 보고서, 독립 실행형 Python
          스크립트, 데이터베이스 파이프라인인 경우에는 트리거하지 마세요. Google 시트 API 통합, 표 형식 데이터가 포함된 경우에도 마찬가지입니다.
- **라이선스**: 소유권. LICENSE.txt에 전체 약관이 있습니다.


## 모든 Excel 파일

### 전문가용 글꼴
- 사용자가 달리 지시하지 않는 한 모든 결과물에 일관되고 전문적인 글꼴(예: Arial, Times New Roman)을 사용합니다.

### 수식 오류 없음
- 모든 Excel 모델은 수식 오류(#REF!, #DIV/0!, #VALUE!, #N/A, #NAME?)가 0인 상태로 제공되어야 합니다.

### 기존 템플릿 유지(템플릿 업데이트 시)
- 파일을 수정할 때 기존 형식, 스타일 및 규칙을 연구하고 정확하게 일치시킵니다.
- 확립된 패턴이 있는 파일에 표준화된 형식을 적용하지 마십시오.
- 기존 템플릿 규칙은 항상 이러한 지침보다 우선합니다.

## 재무 모델

### 색상 코딩 표준
사용자 또는 기존 템플릿이 달리 명시하지 않는 한

#### 업계 표준 색상 규칙
- **파란색 텍스트(RGB: 0,0,255)**: 하드코딩된 입력 및 시나리오에 대해 사용자가 변경하는 숫자
- **검은색 텍스트(RGB: 0,0,0)**: 모든 수식 및 계산
- **녹색 텍스트(RGB: 0,128,0)**: 동일한 통합 문서 내의 다른 워크시트에서 가져온 링크
- **빨간색 텍스트(RGB: 255,0,0)**: 다른 파일에 대한 외부 링크
- **노란색 배경(RGB: 255,255,0)**: 주의가 필요한 주요 가정 또는 업데이트가 필요한 셀

### 숫자 서식 표준

#### 필수 형식 규칙
- **연도**: 텍스트 문자열 형식(예: "2,024"가 아닌 "2024")
- **통화**: $#,##0 형식을 사용합니다. 항상 헤더에 단위를 지정하세요("수익($mm)")
- **0**: 숫자 형식을 사용하여 백분율을 포함하여 모든 0을 "-"로 만듭니다(예: "$#,##0;($#,##0);-")
- **백분율**: 기본값은 0.0% 형식(소수점 첫째 자리)입니다.
- **배수**: 평가 배수(EV/EBITDA, P/E)를 0.0x로 형식화합니다.
- **음수**: 마이너스 -123이 아닌 괄호(123)를 사용하세요.

### 공식 구성 규칙

#### 가정 배치
- 모든 가정(성장률, 마진, 배수 등)을 별도의 가정 셀에 배치합니다.
- 수식에 하드코딩된 값 대신 셀 참조를 사용하세요.
- 예: =B5*1.05 대신 =B5*(1+$B$6) 사용

#### 수식 오류 방지
- 모든 셀 참조가 올바른지 확인
- 범위 내에서 하나씩 벗어난 오류를 확인하세요.
- 모든 예측 기간에 걸쳐 일관된 공식 보장
- 극단적인 경우(0 값, 음수)로 테스트
- 의도하지 않은 순환 참조가 없는지 확인하세요.

#### 하드코드에 대한 문서 요구 사항
- 설명 또는 옆의 셀(테이블의 끝인 경우). 형식: "출처: [시스템/문서], [날짜], [특정 참조], [해당되는 경우 URL]"
- 예:
- "출처: Company 10-K, FY2024, 45페이지, 매출 노트, [SEC EDGAR URL]"
- "출처: Company 10-Q, Q2 2025, Exhibit 99.1, [SEC EDGAR URL]"
- "출처: Bloomberg Terminal, 2025년 8월 15일, AAPL US Equity"
- "출처: FactSet, 2025년 8월 20일, 합의 추정 화면"

## XLSX 생성, 편집 및 분석

## 개요

사용자가 .xlsx 파일의 내용을 생성, 편집 또는 분석하도록 요청할 수 있습니다. 다양한 작업에 사용할 수 있는 다양한 도구와 워크플로가 있습니다.

## 중요 요구사항

**LibreOffice 수식 재계산에 필요**: `scripts/recalc.py` 스크립트를 사용하여 수식 값을 다시 계산하기 위해 LibreOffice이 설치되었다고
가정할 수 있습니다. 스크립트는 Unix 소켓이 제한되는 샌드박스 환경을 포함하여 처음 실행 시 자동으로 LibreOffice을
구성합니다(`scripts/office/soffice.py`에 의해 처리됨).

## 데이터 읽기 및 분석

### 팬더를 이용한 데이터 분석
데이터 분석, 시각화 및 기본 작업에는 강력한 데이터 조작 기능을 제공하는 **pandas**를 사용하세요.

```python
import pandas as pd

## Read Excel
df = pd.read_excel('file.xlsx')  # Default: first sheet
all_sheets = pd.read_excel('file.xlsx', sheet_name=None)  # All sheets as dict

## Analyze
df.head()      # Preview data
df.info()      # Column info
df.describe()  # Statistics

## Write Excel
df.to_excel('output.xlsx', index=False)
```

## Excel 파일 워크플로

## 중요: 하드코딩된 값이 아닌 공식을 사용하세요.

**Python의 값을 계산하고 하드코딩하는 대신 항상 Excel 수식을 사용하세요.** 이렇게 하면 스프레드시트가 동적이며 업데이트 가능한 상태로 유지됩니다.

### ❌ 오류 - 계산된 값을 하드코딩함
```python
## Bad: Calculating in Python and hardcoding result
total = df['Sales'].sum()
sheet['B10'] = total  # Hardcodes 5000

## Bad: Computing growth rate in Python
growth = (df.iloc[-1]['Revenue'] - df.iloc[0]['Revenue']) / df.iloc[0]['Revenue']
sheet['C5'] = growth  # Hardcodes 0.15

## Bad: Python calculation for average
avg = sum(values) / len(values)
sheet['D20'] = avg  # Hardcodes 42.5
```

### ✅ 정확함 - Excel 수식 사용하기
```python
## Good: Let Excel calculate the sum
sheet['B10'] = '=SUM(B2:B9)'

## Good: Growth rate as Excel formula
sheet['C5'] = '=(C4-C2)/C2'

## Good: Average using Excel function
sheet['D20'] = '=AVERAGE(D2:D19)'
```

이는 합계, 백분율, 비율, 차이 등 모든 계산에 적용됩니다. 스프레드시트는 소스 데이터가 변경되면 다시 계산할 수 있어야 합니다.

## 일반적인 작업 흐름
1. **도구 선택**: 데이터용 pandas, 수식/서식 지정용 openpyxl
2. **만들기/로드**: 새 통합 문서를 만들거나 기존 파일을 로드합니다.
3. **수정**: 데이터, 수식, 서식을 추가/편집합니다.
4. **저장**: 파일에 쓰기
5. **수식 다시 계산(수식을 사용하는 경우 필수)**: scripts/recalc.py 스크립트를 사용하세요.
   ```bash
   python scripts/recalc.py output.xlsx
   ```
6. **오류 확인 및 수정**:
- 스크립트는 오류 세부정보와 함께 JSON을 반환합니다.
- `status`이 `errors_found`인 경우 `error_summary`에서 특정 오류 유형 및 위치를 확인하세요.
- 식별된 오류를 수정하고 다시 계산합니다.
- 수정해야 할 일반적인 오류:
- `#REF!`: 잘못된 셀 참조
- `#DIV/0!`: 0으로 나누기
- `#VALUE!`: 수식에 잘못된 데이터 유형이 있습니다.
- `#NAME?`: 인식할 수 없는 수식 이름

### 새 Excel 파일 만들기

```python
## Using openpyxl for formulas and formatting
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

wb = Workbook()
sheet = wb.active

## Add data
sheet['A1'] = 'Hello'
sheet['B1'] = 'World'
sheet.append(['Row', 'of', 'data'])

## Add formula
sheet['B2'] = '=SUM(A1:A10)'

## Formatting
sheet['A1'].font = Font(bold=True, color='FF0000')
sheet['A1'].fill = PatternFill('solid', start_color='FFFF00')
sheet['A1'].alignment = Alignment(horizontal='center')

## Column width
sheet.column_dimensions['A'].width = 20

wb.save('output.xlsx')
```

### 기존 Excel 파일 편집

```python
## Using openpyxl to preserve formulas and formatting
from openpyxl import load_workbook

## Load existing file
wb = load_workbook('existing.xlsx')
sheet = wb.active  # or wb['SheetName'] for specific sheet

## Working with multiple sheets
for sheet_name in wb.sheetnames:
    sheet = wb[sheet_name]
    print(f"Sheet: {sheet_name}")

## Modify cells
sheet['A1'] = 'New Value'
sheet.insert_rows(2)  # Insert row at position 2
sheet.delete_cols(3)  # Delete column 3

## Add new sheet
new_sheet = wb.create_sheet('NewSheet')
new_sheet['A1'] = 'Data'

wb.save('modified.xlsx')
```

## 수식 다시 계산하기

openpyxl로 생성되거나 수정된 ​​Excel 파일에는 수식이 문자열로 포함되어 있지만 계산된 값은 포함되어 있지 않습니다. 제공된 `scripts/recalc.py`
스크립트를 사용하여 수식을 다시 계산합니다.

```bash
python scripts/recalc.py <excel_file> [timeout_seconds]
```

예:
```bash
python scripts/recalc.py output.xlsx 30
```

스크립트:
- 첫 실행 시 자동으로 LibreOffice 매크로 설정
- 모든 시트의 모든 수식을 다시 계산합니다.
- 모든 셀에서 Excel 오류(#REF!, #DIV/0! 등)를 검색합니다.
- 자세한 오류 위치 및 횟수와 함께 JSON을 반환합니다.
- Linux와 macOS 모두에서 작동

## 공식 확인 체크리스트

수식이 올바르게 작동하는지 확인하는 빠른 검사:

### 필수 확인
- [ ] **2-3개의 샘플 참조 테스트**: 전체 모델을 구축하기 전에 올바른 값을 가져오는지 확인합니다.
- [ ] **열 매핑**: Excel 열 일치 확인(예: 열 64 = BK가 아닌 BL)
- [ ] **행 오프셋**: Excel 행은 1부터 인덱싱됩니다(DataFrame 행 5 = Excel 행 6).

### 일반적인 함정
- [ ] **NaN 처리**: `pd.notna()`을 사용하여 null 값을 확인합니다.
- [ ] **맨 오른쪽 열**: FY 데이터는 종종 50개 이상의 열에 있음
- [ ] **여러 일치**: 첫 번째 항목뿐만 아니라 모든 항목을 검색합니다.
- [ ] **0으로 나누기**: 수식에 `/`을 사용하기 전에 분모를 확인하세요(#DIV/0!)
- [ ] **잘못된 참조**: 모든 셀 참조가 의도한 셀을 가리키는지 확인합니다(#REF!)
- [ ] **시트 간 참조**: 시트 연결에 올바른 형식(Sheet1!A1)을 사용합니다.

### 공식 테스트 전략
- [ ] **작게 시작**: 광범위하게 적용하기 전에 2-3개의 셀에서 수식을 테스트합니다.
- [ ] **종속성 확인**: 수식에서 참조된 모든 셀이 존재하는지 확인합니다.
- [ ] **테스트 엣지 케이스**: 0, 음수 및 매우 큰 값을 포함합니다.

### scripts/recalc.py 출력 해석하기
스크립트는 오류 세부정보와 함께 JSON을 반환합니다.
```json
{
  "status": "success",           // or "errors_found"
  "total_errors": 0,              // Total error count
  "total_formulas": 42,           // Number of formulas in file
  "error_summary": {              // Only present if errors found
    "#REF!": {
      "count": 2,
      "locations": ["Sheet1!B5", "Sheet1!C10"]
    }
  }
}
```

## 모범 사례

### 라이브러리 선택
- **pandas**: 데이터 분석, 대량 작업 및 간단한 데이터 내보내기에 가장 적합
- **openpyxl**: 복잡한 서식, 수식 및 Excel 관련 기능에 가장 적합합니다.

### openpyxl로 작업하기
- 셀 인덱스는 1부터 시작합니다(행=1, 열=1은 셀 A1을 참조함).
- `data_only=True`을 사용하여 계산된 값을 읽습니다. `load_workbook('file.xlsx', data_only=True)`
- **경고**: `data_only=True`으로 열고 저장하면 수식이 값으로 바뀌고 영구적으로 손실됩니다.
- 대용량 파일의 경우: 읽기에는 `read_only=True`을 사용하고 쓰기에는 `write_only=True`을 사용합니다.
- 수식은 유지되지만 평가되지는 않습니다. 값을 업데이트하려면 scripts/recalc.py를 사용하세요.

### 판다와 함께 작업하기
- 추론 문제를 방지하려면 데이터 유형을 지정하세요. `pd.read_excel('file.xlsx', dtype={'id': str})`
- 대용량 파일의 경우 특정 열을 읽습니다. `pd.read_excel('file.xlsx', usecols=['A', 'C', 'E'])`
- 날짜를 적절하게 처리하세요: `pd.read_excel('file.xlsx', parse_dates=['date_column'])`

## 코드 스타일 지침
**중요**: Excel 작업에 대한 Python 코드를 생성하는 경우:
- 불필요한 주석 없이 최소한의 간결한 Python 코드를 작성하세요.
- 장황한 변수 이름과 중복 작업을 피하세요.
- 불필요한 인쇄문을 피하세요.

**Excel 파일 자체의 경우**:
- 복잡한 수식이나 중요한 가정이 포함된 셀에 설명 추가
- 하드코딩된 값에 대한 문서 데이터 소스
- 주요 계산 및 모델 섹션에 대한 메모를 포함합니다.
