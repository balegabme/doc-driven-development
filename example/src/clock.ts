// doc: docs/greeting.md#time-of-day
export function partOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  return hour < 18 ? 'afternoon' : 'evening'
}
