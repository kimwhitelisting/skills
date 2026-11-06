/** Each loaded game owns one generation. Replacing its canonical snapshot permanently retires it. */
export class RuntimeWriteGate {
  private generation = 0;
  private enabled = false;
  activate(): void { this.generation++; this.enabled = true; }
  freeze(): void { this.generation++; this.enabled = false; }
  capture(): number { return this.generation; }
  allows(generation: number): boolean { return this.enabled && generation === this.generation; }
}
export const gameWrites = new RuntimeWriteGate();

export const needsFreshRuntime = (readyAtBoot: boolean, installedAfterBoot: boolean, readyNow: boolean): boolean =>
  readyNow && (installedAfterBoot || !readyAtBoot);
