// 맛보기 B — 졸졸 따라가기 (단독 페이지)
import { mountFollow } from './follow-core.ts';

mountFollow(document.getElementById('app')!, { age: 10, standalone: true, forgot: true });
