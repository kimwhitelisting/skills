# AI 그림 지시문 모음

> `npm run gen:art`로 자동 생성되는 문서예요. 직접 고치지 말고 `scripts/art-prompts.ts`를 고친 뒤 다시 생성하세요.
> 각 상자 안의 영어 지시문을 통째로 복사해서 이미지 AI에 붙여 넣으면 돼요.

## 진행 순서
1. **스타일 테스트:** 아래 "8살 · 첫 소풍" 1장을 먼저 만들어요. 마음에 드는 결과가 나오면 그 그림을 **스타일 기준 그림**으로 저장해요.
2. **캐릭터 기준 그림:** "캐릭터 기준 시트"를 남녀 각각 만들어요. 같은 아이가 자라는 모습으로 보이는 게 가장 중요해요.
3. **나머지:** 이후 모든 그림에 스타일 기준 그림과 캐릭터 기준 그림을 **참조 이미지로 같이 넣어요.** 대부분의 이미지 AI에 "스타일 참조" 또는 "캐릭터 참조" 기능이 있어요.
4. **저장:** WebP로 바꿔서(예: squoosh.app) 표시된 경로에 넣으면 게임에 자동으로 반영돼요. 초상화는 동그란 틀에 들어가니 크림색 배경 그대로 둬도 괜찮아요. 직접 넣기 어려우면 Claude에게 채팅으로 그림을 보내 변환과 배치를 맡겨도 돼요.
5. **확인:** 결과물이 아트 가이드([ART.md](ART.md))와 맞는지 봐요. 특히 부모 얼굴이 나오지 않는지, 아기 앱처럼 지나치게 귀엽지 않은지요.
6. 상업적 이용이 가능한 요금제인지, 사용하는 AI 도구의 약관을 꼭 확인하세요.

## 1. 캐릭터 기준 시트 (먼저 만들기)
### 여자아이 성장 시트
저장: 게임에 넣지 않음 — 다른 그림을 만들 때 참조 이미지로 쓰도록 따로 보관

```
Character reference sheet: the same child shown at six ages in a row, left to right, full body, standing, plain cream background: about 1 year old, chubby baby, wearing a cream onesie; about 4 years old, wearing a yellow daycare smock; about 9 years old, elementary schooler, red backpack straps on the shoulders; about 14 years old, wearing a navy middle-school uniform; about 17 years old, wearing a navy high-school blazer, slightly tired eyes; about 20 years old, wearing a cream knit sweater. The child is a Korean girl with chestnut-brown hair in a short bob held by a small mustard-yellow hair clip on the left side, round dark eyes, soft eyebrows, and a tiny mole under her left eye; keep the hair, eyes, eyebrows and the mole identical at every age.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 3:1.
```

### 남자아이 성장 시트
저장: 게임에 넣지 않음 — 다른 그림을 만들 때 참조 이미지로 쓰도록 따로 보관

```
Character reference sheet: the same child shown at six ages in a row, left to right, full body, standing, plain cream background: about 1 year old, chubby baby, wearing a cream onesie; about 4 years old, wearing a yellow daycare smock; about 9 years old, elementary schooler, red backpack straps on the shoulders; about 14 years old, wearing a navy middle-school uniform; about 17 years old, wearing a navy high-school blazer, slightly tired eyes; about 20 years old, wearing a cream knit sweater. The child is a Korean boy with messy dark-brown hair and one cowlick sticking up on top, round dark eyes, slightly thick eyebrows, and a tiny mole under his left eye; keep the hair, eyes, eyebrows and the mole identical at every age.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 3:1.
```

## 2. 아이 초상 — 출시용 기본 표정 12장
### 영아기 · 여자아이
저장: `src/assets/art/characters/infant-girl-neutral.webp`

```
Bust portrait of a Korean girl with chestnut-brown hair in a short bob held by a small mustard-yellow hair clip on the left side, round dark eyes, soft eyebrows, and a tiny mole under her left eye, about 1 year old, chubby baby, wearing a cream onesie. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 영아기 · 남자아이
저장: `src/assets/art/characters/infant-boy-neutral.webp`

```
Bust portrait of a Korean boy with messy dark-brown hair and one cowlick sticking up on top, round dark eyes, slightly thick eyebrows, and a tiny mole under his left eye, about 1 year old, chubby baby, wearing a cream onesie. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 유아기 · 여자아이
저장: `src/assets/art/characters/toddler-girl-neutral.webp`

```
Bust portrait of a Korean girl with chestnut-brown hair in a short bob held by a small mustard-yellow hair clip on the left side, round dark eyes, soft eyebrows, and a tiny mole under her left eye, about 4 years old, wearing a yellow daycare smock. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 유아기 · 남자아이
저장: `src/assets/art/characters/toddler-boy-neutral.webp`

```
Bust portrait of a Korean boy with messy dark-brown hair and one cowlick sticking up on top, round dark eyes, slightly thick eyebrows, and a tiny mole under his left eye, about 4 years old, wearing a yellow daycare smock. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 초등학생 · 여자아이
저장: `src/assets/art/characters/child-girl-neutral.webp`

```
Bust portrait of a Korean girl with chestnut-brown hair in a short bob held by a small mustard-yellow hair clip on the left side, round dark eyes, soft eyebrows, and a tiny mole under her left eye, about 9 years old, elementary schooler, red backpack straps on the shoulders. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 초등학생 · 남자아이
저장: `src/assets/art/characters/child-boy-neutral.webp`

```
Bust portrait of a Korean boy with messy dark-brown hair and one cowlick sticking up on top, round dark eyes, slightly thick eyebrows, and a tiny mole under his left eye, about 9 years old, elementary schooler, red backpack straps on the shoulders. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 중학생 · 여자아이
저장: `src/assets/art/characters/teen-girl-neutral.webp`

```
Bust portrait of a Korean girl with chestnut-brown hair in a short bob held by a small mustard-yellow hair clip on the left side, round dark eyes, soft eyebrows, and a tiny mole under her left eye, about 14 years old, wearing a navy middle-school uniform. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 중학생 · 남자아이
저장: `src/assets/art/characters/teen-boy-neutral.webp`

```
Bust portrait of a Korean boy with messy dark-brown hair and one cowlick sticking up on top, round dark eyes, slightly thick eyebrows, and a tiny mole under his left eye, about 14 years old, wearing a navy middle-school uniform. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 고등학생 · 여자아이
저장: `src/assets/art/characters/high-girl-neutral.webp`

```
Bust portrait of a Korean girl with chestnut-brown hair in a short bob held by a small mustard-yellow hair clip on the left side, round dark eyes, soft eyebrows, and a tiny mole under her left eye, about 17 years old, wearing a navy high-school blazer, slightly tired eyes. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 고등학생 · 남자아이
저장: `src/assets/art/characters/high-boy-neutral.webp`

```
Bust portrait of a Korean boy with messy dark-brown hair and one cowlick sticking up on top, round dark eyes, slightly thick eyebrows, and a tiny mole under his left eye, about 17 years old, wearing a navy high-school blazer, slightly tired eyes. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 스무 살 문턱 · 여자아이
저장: `src/assets/art/characters/adult-girl-neutral.webp`

```
Bust portrait of a Korean girl with chestnut-brown hair in a short bob held by a small mustard-yellow hair clip on the left side, round dark eyes, soft eyebrows, and a tiny mole under her left eye, about 20 years old, wearing a cream knit sweater. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### 스무 살 문턱 · 남자아이
저장: `src/assets/art/characters/adult-boy-neutral.webp`

```
Bust portrait of a Korean boy with messy dark-brown hair and one cowlick sticking up on top, round dark eyes, slightly thick eyebrows, and a tiny mole under his left eye, about 20 years old, wearing a cream knit sweater. calm, gentle expression, looking slightly off to the side. Centered, head and shoulders, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

## 3. 나이별 이벤트 20장
### 0살 · 응애! 아이가 태어났다
저장: `src/assets/art/events/birth.webp`

```
A newborn baby wrapped in a cream swaddle, the tiny hand gripping an adult's finger (only the parent's hand visible). A small empty lunchbox wrapped in red cloth waits on the bedside table. Soft morning light.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 1살 · 돌잡이
저장: `src/assets/art/events/doljabi.webp`

```
A Korean first-birthday table (doljanchi) with rice cakes and fruit. A 1-year-old baby in a colorful hanbok reaches toward objects laid out on the table: a pencil, a ball, a toy microphone, a paintbrush, a spoon. An adult hand sneakily nudges the spoon closer.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 2살 · 첫 마디
저장: `src/assets/art/events/firstword.webp`

```
A 2-year-old toddler in a high chair with a spoon in hand and rice on the cheeks, mouth open as if saying a first word. The parent's hands freeze mid-air, holding a phone too late to record.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 3살 · 어린이집 첫 등원
저장: `src/assets/art/events/daycare.webp`

```
Daycare entrance. A 3-year-old in a yellow smock clings to an adult's leg (only the adult's legs visible), a tiny backpack and lunch bag on the floor, a kind teacher's hand waving in the background.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 4살 · 편식 전쟁
저장: `src/assets/art/events/picky.webp`

```
A 4-year-old at the dinner table with arms crossed and cheeks puffed, pushing away a plate of broccoli. A spoon lies on the floor.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 5살 · 유치원 재롱잔치
저장: `src/assets/art/events/recital.webp`

```
A kindergarten stage with paper decorations and small children in animal costumes. Seen from the audience: rows of parents' raised phones, one phone in the front row held much too close.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 6살 · 선행학습의 유혹
저장: `src/assets/art/events/hagwon.webp`

```
A 6-year-old seen from behind, looking out a window at a sunny playground. On the table: a stack of colorful academy flyers next to a lunchbox.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 7살 · 초등학교 입학
저장: `src/assets/art/events/school.webp`

```
First day of elementary school. A 7-year-old seen from behind wearing an oversized red backpack, walking toward the school gate under cherry blossoms. An adult hand waves at the edge of the frame.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 8살 · 첫 소풍
저장: `src/assets/art/events/picnic.webp`

```
School picnic on a grassy hill. An 8-year-old seen from behind on a picnic mat opens a lunchbox full of gimbap while classmates lean in curiously. In the background, a badly hidden adult peeks from behind a tree holding a lunch bag.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 9살 · 친구와 싸웠다
저장: `src/assets/art/events/fight.webp`

```
A 9-year-old seen from behind walking home alone at sunset, head down, kicking a pebble, school bag dragging. Long shadows.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 10살 · 운동회
저장: `src/assets/art/events/sportsday.webp`

```
Elementary school sports day. A child seen from behind sprints with a relay baton toward the finish line. Colorful flags, blurred cheering crowd.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 11살 · 장래희망 발표
저장: `src/assets/art/events/dream.webp`

```
A classroom 'my future dream' presentation. An 11-year-old seen from behind stands at the front holding up a crayon drawing. Classmates' heads in soft silhouette, warm light.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 12살 · 방문이 닫혔다
저장: `src/assets/art/events/puberty.webp`

```
A closed bedroom door with a doodled 'please knock' sign (a drawing of a knocking hand, no words). An adult's hand is just setting down a tray with snacks and a lunchbox in front of the door.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 13살 · 중학교 입학
저장: `src/assets/art/events/middle.webp`

```
Middle school entrance day. A 13-year-old in a navy uniform seen from behind at the school gate. In the foreground, a poorly disguised adult in sunglasses hides behind a lamp post holding a lunch bag.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 14살 · 첫사랑?
저장: `src/assets/art/events/crush.webp`

```
A 14-year-old's hands nervously holding a heart-shaped lunchbox wrapped in pink cloth in a school hallway. Only the hands and uniform sleeves are visible. Soft, shy mood.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 15살 · 진로 상담
저장: `src/assets/art/events/career.webp`

```
A top-down view of a school counselor's desk: a career-planning sheet with doodles, a pencil, a lunchbox, and a 15-year-old's fidgeting hands.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 16살 · 야간 자율학습 시작
저장: `src/assets/art/events/highschool.webp`

```
Night self-study classroom at 9 pm. A 16-year-old seen from behind studying under fluorescent light, a steaming thermos lunchbox open on the desk, dark windows.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 17살 · 고2 슬럼프
저장: `src/assets/art/events/slump.webp`

```
Rainy evening at a bus stop. A 17-year-old seen from behind on the bench with headphones on, an untouched lunchbox on the lap, reflections in puddles.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 18살 · 수능 D-day
저장: `src/assets/art/events/exam.webp`

```
College entrance exam morning before dawn at a school gate crowded with parents. An adult's hands hand a warm lunchbox to a student in a padded winter coat. Breath visible in the cold air.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 19살 · 독립 선언
저장: `src/assets/art/events/leaving.webp`

```
A 19-year-old seen from behind carrying a moving box into a small studio apartment. At the door, the parent's hands hold out a bag of side-dish containers.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

## 4. 엔딩 12장
### 엔딩 · 평생 도시락 받는 어른
저장: `src/assets/art/endings/kangaroo.webp`

```
A grown adult in office clothes seen from behind at the front door, still receiving a lunchbox from the parent's hands. A kangaroo plush on the shoe cabinet.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 스타 셰프
저장: `src/assets/art/endings/chef.webp`

```
A young chef in a white coat seen from behind in a small cozy restaurant kitchen. An old childhood lunchbox hangs framed on the wall.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 명의
저장: `src/assets/art/endings/doctor.webp`

```
A young doctor in a white coat seen from behind at a hospital window at dusk. A small lunchbox sits on the desk.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 국가대표
저장: `src/assets/art/endings/athlete.webp`

```
A young athlete seen from behind on a podium raising a gold medal in one hand and a lunchbox in the other. Confetti and stadium lights.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 모두의 인기인
저장: `src/assets/art/endings/star.webp`

```
A young adult seen from behind at the center of a lively picnic, surrounded by friends all sharing food from one big lunchbox.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 예술가
저장: `src/assets/art/endings/artist.webp`

```
A small gallery wall of paintings that all feature lunchboxes. A young artist in a paint-stained apron seen from behind.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 연구자
저장: `src/assets/art/endings/scholar.webp`

```
A late-night research lab. A young researcher seen from behind among books and a microscope, a bag of nuts beside the keyboard.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 세계 여행가
저장: `src/assets/art/endings/traveler.webp`

```
A young traveler with a big backpack seen from behind on a hill overlooking a foreign city, holding a postcard.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 부모와 베스트 프렌드
저장: `src/assets/art/endings/bestie.webp`

```
A parent and their grown child walking side by side through a market at sunset, both seen from behind, both carrying grocery bags.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 잔병치레 어른
저장: `src/assets/art/endings/fragile.webp`

```
A young adult wrapped in a blanket on a sofa, tissues and vitamin bottles around, a lunchbox of porridge on the coffee table.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 평범하지만 행복한 어른
저장: `src/assets/art/endings/happy.webp`

```
A young adult seen from behind on a sunny park bench, eating from a simple lunchbox. A peaceful ordinary day.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 엔딩 · 조금 지친 어른
저장: `src/assets/art/endings/tired.webp`

```
A young adult seen from behind on a late-night subway, head leaning on the window, city lights outside, a small empty lunchbox in hand.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

## 5. 로고 · 스토어
### ui/logo
저장: `src/assets/art/ui/logo.webp`

```
Icon composition, centered on a plain cream background: a red lunchbox wrapped in cream cloth, an adult's hand and a small child's hand both holding the knot.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### (스토어) icon
저장: 게임에 넣지 않음 — Play Console 스토어 등록정보에 업로드

```
App icon, bold and simple, readable at small sizes: a red lunchbox wrapped in cream cloth with a small knot, centered, filling most of the square, plain cream background.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1:1.
```

### (스토어) feature-graphic
저장: 게임에 넣지 않음 — Play Console 스토어 등록정보에 업로드

```
Wide banner: on the left, a child seen from behind walking to school with a backpack; on the right, a badly hidden adult peeking from behind a tree holding a red lunchbox. Leave empty space in the middle.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 1024:500 (약 2:1).
```

## 6. 출시 후 보강
### 랜덤 이벤트 16장
### 0~19살 · 감기에 걸렸다
저장: `src/assets/art/events/cold.webp`

```
A child sick in bed under a thick blanket with a damp towel on the forehead. A bowl of rice porridge steams on a tray. An adult's hand holds the small hand. Night lamp glow.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 2~9살 · 꽈당!
저장: `src/assets/art/events/fall.webp`

```
A playground. A small child mid-fall is caught just in time by an adult's arms sweeping in from the edge of the frame. A lunch bag swings in the air.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 3~7살 · 마트에서 사라졌다
저장: `src/assets/art/events/lost.webp`

```
A supermarket aisle. A small child stands calmly at a food-sample stand eating a dumpling on a toothpick, while an empty shopping cart sits far behind.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 7~15살 · 반찬 교환 시장
저장: `src/assets/art/events/swap.webp`

```
Classroom lunchtime. Lunchboxes on pushed-together desks, kids' hands trading side dishes with chopsticks; an octopus-shaped sausage is being traded.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 5~13살 · 길고양이
저장: `src/assets/art/events/cat.webp`

```
A rainy day. A child in a yellow raincoat seen from behind holds a tiny wet kitten close to the chest.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 5~12살 · 친구 생일 파티
저장: `src/assets/art/events/party.webp`

```
A kid's birthday party with balloons and cake. Children's hands reach for snacks. One adult silhouette stands awkwardly alone in the corner holding a lunch bag.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 11~17살 · 게임에 빠졌다
저장: `src/assets/art/events/game.webp`

```
A dark bedroom at 2 am. A teenager seen from behind at a glowing computer screen with a gaming headset on. A cold, untouched lunchbox on the desk.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 7~17살 · 학부모 상담
저장: `src/assets/art/events/teacher.webp`

```
A parent-teacher meeting. A teacher behind a desk with tea cups smiles awkwardly. Across the desk, only the parent's hands, clasped tightly around a lunch bag.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 12~19살 · 미행이 들켰다
저장: `src/assets/art/events/caught.webp`

```
A convenience store at night seen through the window. A hooded teenager outside, face hidden, spots an adult crouching behind the snack shelf holding a lunch bag.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 6~18살 · "나도 해 볼래!"
저장: `src/assets/art/events/helpcook.webp`

```
A kitchen. A child in an oversized apron stands on a stool, clumsily rolling a lopsided egg roll in a pan. The parent's hands hover nervously nearby.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 6~16살 · 그림 대회
저장: `src/assets/art/events/contest.webp`

```
A child's crayon drawing pinned on a classroom wall with a prize ribbon. The drawing, in an even simpler childish style, shows a family holding a lunchbox.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 10~16살 · 폭풍 성장
저장: `src/assets/art/events/growth.webp`

```
A doorframe with pencil height marks climbing upward, a pair of pants that is now too short hanging beside it, and a two-tier lunchbox on the counter.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 14~19살 · 도시락이 SNS에 떴다
저장: `src/assets/art/events/sns.webp`

```
A teenager's hands holding a smartphone; the screen shows a photo of a beautiful lunchbox surrounded by floating heart icons.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 15~19살 · 처음 받은 도시락
저장: `src/assets/art/events/returnlunch.webp`

```
A morning kitchen table with an unfamiliar lunchbox: a crooked egg roll inside and a handwritten sticky note with a doodled heart (no words). The parent's hands hold the lid.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 8~18살 · 용돈 협상
저장: `src/assets/art/events/allowance.webp`

```
A child's hands and a parent's hands across a table, with coins, a piggy bank and a small notebook between them. A playful negotiation mood.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 0~19살 · 할머니의 용돈
저장: `src/assets/art/events/bonus.webp`

```
A grandmother's wrinkled hands press a white envelope into the parent's hands. A cloth bag full of side-dish containers sits nearby.
The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.
Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.
No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.
Aspect ratio 4:3.
```

### 표정 36장
위 "아이 초상" 지시문에서 표정 문장만 아래로 바꾸고, 파일 이름 끝의 `neutral`을 표정 이름으로 바꿔 저장해요.

- `happy`: delighted, eyes squeezed shut in a big smile, cheeks full of food
- `sad`: pouting with teary eyes, looking down
- `yuck`: grimacing in disgust, tongue out, leaning away
