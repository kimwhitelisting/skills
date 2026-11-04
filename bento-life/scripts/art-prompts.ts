// AI 이미지 생성용 지시문 데이터 (영어 — 대부분의 이미지 생성 AI가 영어를 더 잘 따름).
// npm run gen:art 가 이걸로 docs/ai-prompts.md 를 만든다.

/** 모든 그림에 공통으로 붙이는 그림체 */
export const STYLE =
  "Children's picture-book illustration made for adults. Soft oil pastel and wax crayon texture on cream paper with visible paper grain. " +
  'Warm muted pastel palette: cream paper (#f4ecdd), tomato red (#e0735a), mustard yellow (#e6b24f), sage green (#8fb07a), dusty sky blue (#7ea6c8), soft plum (#b48cb9). ' +
  'Uneven warm-brown crayon outlines, never black. Flat coloring with light crayon-hatched shadows, minimal detail, calm composition with generous empty space. ' +
  'Gentle, cozy mood with a touch of quiet humor. Hand-drawn and slightly imperfect.';

export const NEGATIVE =
  'No text, no letters, no numbers, no watermark, no signature. Not 3D, not photorealistic, not anime, no big sparkly eyes, no glossy shading, no thick black outlines, no chibi proportions.';

/** 부모는 얼굴을 보여 주지 않는다 (플레이어 = 부모) */
export const PARENT_RULE = 'The parent is never fully shown: only hands, arms, legs or a partial silhouette, never a face.';

/** 같은 아이로 보이게 하는 고정 특징 — 모든 나이에서 유지 */
export const CHILD = {
  girl: 'a Korean girl with chestnut-brown hair in a short bob held by a small mustard-yellow hair clip on the left side, round dark eyes, soft eyebrows, and a tiny mole under her left eye',
  boy: 'a Korean boy with messy dark-brown hair and one cowlick sticking up on top, round dark eyes, slightly thick eyebrows, and a tiny mole under his left eye',
} as const;

export const STAGE_LOOK: Record<string, string> = {
  infant: 'about 1 year old, chubby baby, wearing a cream onesie',
  toddler: 'about 4 years old, wearing a yellow daycare smock',
  child: 'about 9 years old, elementary schooler, red backpack straps on the shoulders',
  teen: 'about 14 years old, wearing a navy middle-school uniform',
  high: 'about 17 years old, wearing a navy high-school blazer, slightly tired eyes',
  adult: 'about 20 years old, wearing a cream knit sweater',
};

export const EXPRESSION: Record<string, string> = {
  neutral: 'calm, gentle expression, looking slightly off to the side',
  happy: 'delighted, eyes squeezed shut in a big smile, cheeks full of food',
  sad: 'pouting with teary eyes, looking down',
  yuck: 'grimacing in disgust, tongue out, leaning away',
};

/** 이벤트 장면. 아이는 뒷모습·작게·부분만 보여 성별이 드러나지 않게 (남녀 공용 그림 1장) */
export const EVENT_SCENES: Record<string, string> = {
  // 나이별
  birth: "A newborn baby wrapped in a cream swaddle, the tiny hand gripping an adult's finger (only the parent's hand visible). A small empty lunchbox wrapped in red cloth waits on the bedside table. Soft morning light.",
  doljabi: "A Korean first-birthday table (doljanchi) with rice cakes and fruit. A 1-year-old baby in a colorful hanbok reaches toward objects laid out on the table: a pencil, a ball, a toy microphone, a paintbrush, a spoon. An adult hand sneakily nudges the spoon closer.",
  firstword: "A 2-year-old toddler in a high chair with a spoon in hand and rice on the cheeks, mouth open as if saying a first word. The parent's hands freeze mid-air, holding a phone too late to record.",
  daycare: "Daycare entrance. A 3-year-old in a yellow smock clings to an adult's leg (only the adult's legs visible), a tiny backpack and lunch bag on the floor, a kind teacher's hand waving in the background.",
  picky: 'A 4-year-old at the dinner table with arms crossed and cheeks puffed, pushing away a plate of broccoli. A spoon lies on the floor.',
  recital: "A kindergarten stage with paper decorations and small children in animal costumes. Seen from the audience: rows of parents' raised phones, one phone in the front row held much too close.",
  hagwon: 'A 6-year-old seen from behind, looking out a window at a sunny playground. On the table: a stack of colorful academy flyers next to a lunchbox.',
  school: "First day of elementary school. A 7-year-old seen from behind wearing an oversized red backpack, walking toward the school gate under cherry blossoms. An adult hand waves at the edge of the frame.",
  picnic: 'School picnic on a grassy hill. An 8-year-old seen from behind on a picnic mat opens a lunchbox full of gimbap while classmates lean in curiously. In the background, a badly hidden adult peeks from behind a tree holding a lunch bag.',
  fight: 'A 9-year-old seen from behind walking home alone at sunset, head down, kicking a pebble, school bag dragging. Long shadows.',
  sportsday: 'Elementary school sports day. A child seen from behind sprints with a relay baton toward the finish line. Colorful flags, blurred cheering crowd.',
  dream: "A classroom 'my future dream' presentation. An 11-year-old seen from behind stands at the front holding up a crayon drawing. Classmates' heads in soft silhouette, warm light.",
  puberty: "A closed bedroom door with a doodled 'please knock' sign (a drawing of a knocking hand, no words). An adult's hand is just setting down a tray with snacks and a lunchbox in front of the door.",
  middle: 'Middle school entrance day. A 13-year-old in a navy uniform seen from behind at the school gate. In the foreground, a poorly disguised adult in sunglasses hides behind a lamp post holding a lunch bag.',
  crush: "A 14-year-old's hands nervously holding a heart-shaped lunchbox wrapped in pink cloth in a school hallway. Only the hands and uniform sleeves are visible. Soft, shy mood.",
  career: "A top-down view of a school counselor's desk: a career-planning sheet with doodles, a pencil, a lunchbox, and a 15-year-old's fidgeting hands.",
  highschool: 'Night self-study classroom at 9 pm. A 16-year-old seen from behind studying under fluorescent light, a steaming thermos lunchbox open on the desk, dark windows.',
  slump: 'Rainy evening at a bus stop. A 17-year-old seen from behind on the bench with headphones on, an untouched lunchbox on the lap, reflections in puddles.',
  exam: "College entrance exam morning before dawn at a school gate crowded with parents. An adult's hands hand a warm lunchbox to a student in a padded winter coat. Breath visible in the cold air.",
  leaving: "A 19-year-old seen from behind carrying a moving box into a small studio apartment. At the door, the parent's hands hold out a bag of side-dish containers.",
  // 랜덤
  cold: "A child sick in bed under a thick blanket with a damp towel on the forehead. A bowl of rice porridge steams on a tray. An adult's hand holds the small hand. Night lamp glow.",
  fall: "A playground. A small child mid-fall is caught just in time by an adult's arms sweeping in from the edge of the frame. A lunch bag swings in the air.",
  lost: 'A supermarket aisle. A small child stands calmly at a food-sample stand eating a dumpling on a toothpick, while an empty shopping cart sits far behind.',
  swap: "Classroom lunchtime. Lunchboxes on pushed-together desks, kids' hands trading side dishes with chopsticks; an octopus-shaped sausage is being traded.",
  cat: 'A rainy day. A child in a yellow raincoat seen from behind holds a tiny wet kitten close to the chest.',
  party: "A kid's birthday party with balloons and cake. Children's hands reach for snacks. One adult silhouette stands awkwardly alone in the corner holding a lunch bag.",
  game: 'A dark bedroom at 2 am. A teenager seen from behind at a glowing computer screen with a gaming headset on. A cold, untouched lunchbox on the desk.',
  teacher: "A parent-teacher meeting. A teacher behind a desk with tea cups smiles awkwardly. Across the desk, only the parent's hands, clasped tightly around a lunch bag.",
  caught: "A convenience store at night seen through the window. A hooded teenager outside, face hidden, spots an adult crouching behind the snack shelf holding a lunch bag.",
  helpcook: "A kitchen. A child in an oversized apron stands on a stool, clumsily rolling a lopsided egg roll in a pan. The parent's hands hover nervously nearby.",
  contest: "A child's crayon drawing pinned on a classroom wall with a prize ribbon. The drawing, in an even simpler childish style, shows a family holding a lunchbox.",
  growth: 'A doorframe with pencil height marks climbing upward, a pair of pants that is now too short hanging beside it, and a two-tier lunchbox on the counter.',
  sns: "A teenager's hands holding a smartphone; the screen shows a photo of a beautiful lunchbox surrounded by floating heart icons.",
  returnlunch: "A morning kitchen table with an unfamiliar lunchbox: a crooked egg roll inside and a handwritten sticky note with a doodled heart (no words). The parent's hands hold the lid.",
  allowance: "A child's hands and a parent's hands across a table, with coins, a piggy bank and a small notebook between them. A playful negotiation mood.",
  bonus: "A grandmother's wrinkled hands press a white envelope into the parent's hands. A cloth bag full of side-dish containers sits nearby.",
};

export const ENDING_SCENES: Record<string, string> = {
  kangaroo: "A grown adult in office clothes seen from behind at the front door, still receiving a lunchbox from the parent's hands. A kangaroo plush on the shoe cabinet.",
  chef: 'A young chef in a white coat seen from behind in a small cozy restaurant kitchen. An old childhood lunchbox hangs framed on the wall.',
  doctor: 'A young doctor in a white coat seen from behind at a hospital window at dusk. A small lunchbox sits on the desk.',
  athlete: 'A young athlete seen from behind on a podium raising a gold medal in one hand and a lunchbox in the other. Confetti and stadium lights.',
  star: 'A young adult seen from behind at the center of a lively picnic, surrounded by friends all sharing food from one big lunchbox.',
  artist: 'A small gallery wall of paintings that all feature lunchboxes. A young artist in a paint-stained apron seen from behind.',
  scholar: 'A late-night research lab. A young researcher seen from behind among books and a microscope, a bag of nuts beside the keyboard.',
  traveler: 'A young traveler with a big backpack seen from behind on a hill overlooking a foreign city, holding a postcard.',
  bestie: 'A parent and their grown child walking side by side through a market at sunset, both seen from behind, both carrying grocery bags.',
  fragile: 'A young adult wrapped in a blanket on a sofa, tissues and vitamin bottles around, a lunchbox of porridge on the coffee table.',
  happy: 'A young adult seen from behind on a sunny park bench, eating from a simple lunchbox. A peaceful ordinary day.',
  tired: 'A young adult seen from behind on a late-night subway, head leaning on the window, city lights outside, a small empty lunchbox in hand.',
};

export const EXTRA_SCENES: Record<string, { scene: string; ratio: string }> = {
  'ui/logo': { scene: "Icon composition, centered on a plain cream background: a red lunchbox wrapped in cream cloth, an adult's hand and a small child's hand both holding the knot.", ratio: '1:1' },
  '(스토어) icon': { scene: 'App icon, bold and simple, readable at small sizes: a red lunchbox wrapped in cream cloth with a small knot, centered, filling most of the square, plain cream background.', ratio: '1:1' },
  '(스토어) feature-graphic': { scene: "Wide banner: on the left, a child seen from behind walking to school with a backpack; on the right, a badly hidden adult peeking from behind a tree holding a red lunchbox. Leave empty space in the middle.", ratio: '1024:500 (약 2:1)' },
};
