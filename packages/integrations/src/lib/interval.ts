export function isIntervalPassed(
  lastExecutedAt: Date | null,
  intervalMs: number,
) {
  if (!lastExecutedAt) return true;
  return Date.now() >= new Date(lastExecutedAt).getTime() + Number(intervalMs);
}
