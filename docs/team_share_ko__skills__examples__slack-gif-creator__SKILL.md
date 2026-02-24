## 문서 정보

- **이름**: `slack-gif-creator`
- **설명**: Slack에 최적화된 애니메이션 GIF를 생성하기 위한 지식 및 유틸리티입니다. 제약 조건, 유효성 검사 도구 및 애니메이션 개념을 제공합니다. 사용자가 "Slack에서
Y를 수행하는 X의 GIF를 만들어 주세요."와 같이 Slack용 애니메이션 GIF를 요청할 때 사용하세요.
- **라이선스**: LICENSE.txt의 전체 조항

# 슬랙 GIF 생성기

Slack에 최적화된 애니메이션 GIF를 생성하기 위한 유틸리티와 지식을 제공하는 툴킷입니다.

## 슬랙 요구 사항

**치수:**
- 이모티콘 GIF: 128x128(권장)
- 메시지 GIF: 480x480

**매개변수:**
- FPS: 10-30(낮을수록 파일 크기가 작아짐)
- 색상: 48-128(적을수록 파일 크기가 더 작음)
- 지속 시간: 이모티콘 GIF의 경우 3초 미만으로 유지하세요.

## 핵심 작업 흐름

```python
from core.gif_builder import GIFBuilder
from PIL import Image, ImageDraw

# 1. Create builder
builder = GIFBuilder(width=128, height=128, fps=10)

# 2. Generate frames
for i in range(12):
    frame = Image.new('RGB', (128, 128), (240, 248, 255))
    draw = ImageDraw.Draw(frame)

    # Draw your animation using PIL primitives
    # (circles, polygons, lines, etc.)

    builder.add_frame(frame)

# 3. Save with optimization
builder.save('output.gif', num_colors=48, optimize_for_emoji=True)
```

## 그래픽 그리기

### 사용자가 업로드한 이미지 작업
사용자가 이미지를 업로드하는 경우 다음을 원하는지 고려하세요.
- **직접 사용**(예: "이것을 애니메이션화", "이것을 프레임으로 분할")
- **영감으로 활용하세요** (예: "이런 걸 만들어 보세요")

PIL을 사용하여 이미지를 로드하고 작업합니다.
```python
from PIL import Image

uploaded = Image.open('file.png')
# Use directly, or just as reference for colors/style
```

### 처음부터 그리기
처음부터 그래픽을 그릴 때 PIL ImageDraw 기본 요소를 사용하십시오.

```python
from PIL import ImageDraw

draw = ImageDraw.Draw(frame)

# Circles/ovals
draw.ellipse([x1, y1, x2, y2], fill=(r, g, b), outline=(r, g, b), width=3)

# Stars, triangles, any polygon
points = [(x1, y1), (x2, y2), (x3, y3), ...]
draw.polygon(points, fill=(r, g, b), outline=(r, g, b), width=3)

# Lines
draw.line([(x1, y1), (x2, y2)], fill=(r, g, b), width=5)

# Rectangles
draw.rectangle([x1, y1, x2, y2], fill=(r, g, b), outline=(r, g, b), width=3)
```

**사용하지 마세요:** Emoji 글꼴(플랫폼 전체에서 신뢰할 수 없음) 또는 이 기술에 사전 패키지된 그래픽이 있다고 가정합니다.

### 그래픽을 보기 좋게 만들기

그래픽은 기본적이지 않고 세련되고 창의적으로 보여야 합니다. 방법은 다음과 같습니다.

**더 두꺼운 선을 사용하세요** - 윤곽선과 선의 경우 항상 `width=2` 이상으로 설정하세요. 가는 선(너비=1)은 고르지 못하고 아마추어처럼 보입니다.

**시각적 깊이 추가**:
- 배경에 그라데이션 사용(`create_gradient_background`)
- 복잡성을 위해 여러 모양을 레이어링합니다(예: 내부에 더 작은 별이 있는 별).

**모양을 더욱 흥미롭게 만들기**:
- 단순한 원만 그리지 말고 하이라이트, 링 또는 패턴을 추가하세요.
- 별은 빛을 낼 수 있습니다(뒤에 더 크고 반투명한 버전을 그립니다).
- 여러 모양 결합(별 + 반짝임, 원 + 고리)

**색상에 주의하세요**:
- 생동감 있고 보색적인 색상을 사용하세요.
- 대비 추가(밝은 모양에 어두운 윤곽선, 어두운 모양에 밝은 윤곽선)
- 전체적인 구성을 고려하라

**복잡한 모양**(하트, 눈송이 등):
- 다각형과 타원의 조합을 사용하세요
- 대칭을 위해 신중하게 점을 계산하세요.
- 세부 사항 추가(하트에는 하이라이트 곡선이 있을 수 있고, 눈송이에는 복잡한 가지가 있을 수 있음)

창의적이고 자세하게 설명하세요! 좋은 Slack GIF는 자리 표시자 그래픽이 아니라 세련되어 보여야 합니다.

## 사용 가능한 유틸리티

### GIFBuilder(`core.gif_builder`)
Slack에 맞게 프레임을 조립하고 최적화합니다.
```python
builder = GIFBuilder(width=128, height=128, fps=10)
builder.add_frame(frame)  # Add PIL Image
builder.add_frames(frames)  # Add list of frames
builder.save('out.gif', num_colors=48, optimize_for_emoji=True, remove_duplicates=True)
```

### 검증인(`core.validators`)
GIF가 Slack 요구 사항을 충족하는지 확인하세요.
```python
from core.validators import validate_gif, is_slack_ready

# Detailed validation
passes, info = validate_gif('my.gif', is_emoji=True, verbose=True)

# Quick check
if is_slack_ready('my.gif'):
    print("Ready!")
```

### 완화 기능(`core.easing`)
선형 대신 부드러운 모션:
```python
from core.easing import interpolate

# Progress from 0.0 to 1.0
t = i / (num_frames - 1)

# Apply easing
y = interpolate(start=0, end=400, t=t, easing='ease_out')

# Available: linear, ease_in, ease_out, ease_in_out,
#           bounce_out, elastic_out, back_out
```

### 프레임 도우미(`core.frame_composer`)
일반적인 요구에 맞는 편의 기능:
```python
from core.frame_composer import (
    create_blank_frame,         # Solid color background
    create_gradient_background,  # Vertical gradient
    draw_circle,                # Helper for circles
    draw_text,                  # Simple text rendering
    draw_star                   # 5-pointed star
)
```

## 애니메이션 개념

### 흔들기/진동
진동으로 개체 위치 오프셋:
- 프레임 인덱스와 함께 `math.sin()` 또는 `math.cos()` 사용
- 자연스러운 느낌을 위해 작은 무작위 변형을 추가합니다.
- x 및/또는 y 위치에 적용

### 맥박/심박
리드미컬하게 개체 크기 조정:
- 부드러운 펄스를 위해서는 `math.sin(t * frequency * 2 * math.pi)`을 사용하세요.
- 심장 박동: 두 번의 빠른 펄스 후 일시 중지(사인파 조정)
- 기본 크기를 0.8에서 1.2 사이로 조정

### 바운스
물체가 떨어지고 튀는 경우:
- 착륙 시에는 `interpolate()`과 `easing='bounce_out'`을 함께 사용하세요.
- 낙하(가속)에는 `easing='ease_in'`을 사용합니다.
- 매 프레임마다 y 속도를 증가시켜 중력을 적용합니다.

### 회전/회전
중심을 중심으로 개체 회전:
- 필 : `image.rotate(angle, resample=Image.BICUBIC)`
- 워블의 경우: 선형 대신 각도에 사인파를 사용합니다.

### 페이드 인/아웃
점차적으로 나타나거나 사라짐:
- RGBA 이미지 생성, 알파 채널 조정
- 또는 `Image.blend(image1, image2, alpha)`을 사용하세요.
- 페이드 인: 0에서 1까지의 알파
- 페이드 아웃: 1에서 0까지의 알파

### 슬라이드
화면 밖의 위치에서 다음 위치로 개체를 이동합니다.
- 시작 위치: 프레임 경계 외부
- 종료 위치 : 목표 위치
- 부드러운 정지를 위해서는 `interpolate()`과 `easing='ease_out'`을 함께 사용하세요.
- 오버슛의 경우: `easing='back_out'` 사용

### 줌
확대/축소 효과의 크기 및 위치:
- 확대: 0.1에서 2.0까지 크기 조절, 자르기 중심
- 축소: 2.0에서 1.0으로 확장
- 드라마에 모션블러 추가 가능 (PIL 필터)

### 폭발/입자 폭발
바깥쪽으로 방사되는 입자 만들기:
- 임의의 각도와 속도로 입자를 생성합니다.
- 각 입자 업데이트: `x += vx`, `y += vy`
- 중력 추가: `vy += gravity_constant`
- 시간이 지남에 따라 입자가 희미해집니다(알파 감소).

## 최적화 전략

파일 크기를 더 작게 만들라는 요청을 받은 경우에만 다음 방법 중 몇 가지를 구현하십시오.

1. **프레임 수 감소** - FPS를 낮추거나(20 대신 10) 지속 시간을 단축합니다.
2. **더 적은 색상** - 128 대신 `num_colors=48`
3. **더 작은 크기** - 480x480 대신 128x128
4. **중복 항목 제거** - 저장()에 `remove_duplicates=True`
5. **이모지 모드** - `optimize_for_emoji=True` 자동 최적화

```python
# Maximum optimization for emoji
builder.save(
    'emoji.gif',
    num_colors=48,
    optimize_for_emoji=True,
    remove_duplicates=True
)
```

## 철학

이 기술은 다음을 제공합니다.
- **지식**: Slack의 요구사항 및 애니메이션 개념
- **유틸리티**: GIFBuilder, 유효성 검사기, 완화 기능
- **유연성**: PIL 프리미티브를 사용하여 애니메이션 로직 생성

다음을 제공하지 않습니다:
- 견고한 애니메이션 템플릿 또는 사전 제작된 기능
- 이모티콘 글꼴 렌더링(플랫폼 전반에 걸쳐 신뢰할 수 없음)
- 스킬에 내장된 사전 패키지 그래픽 라이브러리

**사용자 업로드에 대한 참고 사항**: 이 기술에는 사전 제작된 그래픽이 포함되어 있지 않지만, 사용자가 이미지를 업로드하는 경우 PIL을 사용하여 해당 이미지를 로드하고 작업합니다. 요청에 따라 직접 사용하려는지 또는 영감으로 사용하려는지 해석합니다.

창의력을 발휘하세요! 개념(바운싱 + 회전, 펄스 + 슬라이딩 등)을 결합하고 PIL의 전체 기능을 사용하세요.

## 종속성

```bash
pip install pillow imageio numpy
```
