declare global {
  namespace Temporal {
    class Instant {
      static fromEpochMilliseconds(epochMilliseconds: number | bigint): Instant;
      static from(item: string | Instant): Instant;
      readonly epochMilliseconds: number;
      readonly epochNanoseconds: bigint;
      toString(): string;
    }
  }
}

export {};
