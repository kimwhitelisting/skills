// Explicit mount preserves boot ordering even when Rollup inlines dynamic imports.
import { bootAccount } from './account/account.ts';
import { mountGame } from './main.ts';
void bootAccount().then(ready => { if (ready) mountGame(); });
