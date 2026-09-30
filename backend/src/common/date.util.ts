export function toTimestamp(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "object" && val !== null && "epochMilliseconds" in val) {
    return Number((val as { epochMilliseconds: number | bigint }).epochMilliseconds);
  }
  return new Date(String(val)).getTime();
}
export function toInstant(d: Date | number = Date.now()): Temporal.Instant {
  const ms = typeof d === "number" ? d : d.getTime();
  return Temporal.Instant.fromEpochMilliseconds(ms);
}
