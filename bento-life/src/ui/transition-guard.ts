/** Block the second tap from falling through onto a newly displayed screen.
 * Ingredient/tab changes keep the same navigation key, so deliberate fast input remains available. */
export class TransitionGuard {
    private until = -Infinity;
    allows(now: number): boolean { return now >= this.until; }
    changed(before: string, after: string, now: number): void {
        if (before !== after)
            this.until = now + 400;
    }
}
