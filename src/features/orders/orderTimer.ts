export function getMaxPreparationMinutes(
  items: readonly { product_id: number }[],
  preparationTimes: ReadonlyMap<number, number>,
): number {
  return Math.max(0, ...items.map((item) => preparationTimes.get(item.product_id) ?? 0))
}

export function getRemainingPreparationSeconds(
  preparationAt: string | null | undefined,
  maxPreparationMinutes: number,
  now: number,
): number | null {
  const preparationTimestamp = preparationAt ? Date.parse(preparationAt) : Number.NaN
  if (maxPreparationMinutes <= 0 || !Number.isFinite(preparationTimestamp)) return null
  return Math.max(0, Math.ceil((preparationTimestamp + maxPreparationMinutes * 60_000 - now) / 1000))
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}
