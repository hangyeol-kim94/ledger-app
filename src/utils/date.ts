// Convert UTC ISO string to local date string 'YYYY-MM-DD' in given TZ (default Asia/Seoul)
export function utcToLocalDate(utcStr: string, tz = 'Asia/Seoul'): string {
  const d = new Date(utcStr)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(d) // returns YYYY-MM-DD
}

// Convert UTC ISO string to 'YYYY-MM' for monthly aggregation
export function utcToLocalMonth(utcStr: string, tz = 'Asia/Seoul'): string {
  return utcToLocalDate(utcStr, tz).slice(0, 7)
}

// Parse 'YYYY-MM-DD' + time '00:00:00' in given TZ to UTC ISO string
export function localDateToUtc(dateStr: string): string {
  // Use Intl to compute offset
  const d = new Date(`${dateStr}T00:00:00`)
  return d.toISOString()
}
