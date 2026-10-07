export function toTimestamp(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "object" && val !== null && "epochMilliseconds" in val) {
    return Number((val as { epochMilliseconds: number | bigint }).epochMilliseconds);
  }
  const parsed = new Date(String(val)).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}
export function toInstant(d: Date | number = Date.now()): Temporal.Instant {
  const ms = typeof d === "number" ? d : d.getTime();
  return Temporal.Instant.fromEpochMilliseconds(ms);
}
