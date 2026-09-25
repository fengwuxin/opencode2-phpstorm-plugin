/**
 * Format utilities for consistent data presentation across the application
 */

/**
 * Format a number with K/M suffix
 * @example formatK(1500) // => "2K"
 * @example formatK(1500000) // => "1.5M"
 */
export function formatK(n: number): string {
  if (!n) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(Math.floor(n))
}

/**
 * Format a number with K/M suffix, showing decimals for K
 * @example formatKM(1500) // => "1.5K"
 * @example formatKM(1500000) // => "1.5M"
 */
export function formatKM(n: number): string {
  if (!n) return "0"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  return String(Math.floor(n))
}

/**
 * Format a number as currency. Small amounts keep more decimals so per-message
 * costs do not all round to $0.00.
 * @example formatCost(12.5) // => "$12.50"
 * @example formatCost(0.0028) // => "$0.0028"
 */
export function formatCost(n: number): string {
  const value = n || 0
  if (value !== 0 && Math.abs(value) < 0.01) return `$${value.toFixed(4)}`
  return `$${value.toFixed(2)}`
}

/**
 * Format a timestamp as YYYY-MM-DD HH:MM
 * @example formatTimestamp(1234567890000) // => "2009-02-13 23:31"
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/**
 * Format file size in bytes to human-readable string
 * @example formatFileSize(1024) // => "1.0KB"
 * @example formatFileSize(1536) // => "1.5KB"
 * @example formatFileSize(1048576) // => "1.0MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * Format a date as a localized date string
 * @example formatDate(new Date()) // => "12/31/2023"
 */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  return d.toLocaleDateString()
}

/**
 * Format a date as a localized date and time string
 * @example formatDateTime(new Date()) // => "12/31/2023, 11:59:59 PM"
 */
export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  return d.toLocaleString()
}

/**
 * Format a relative time string (e.g., "2 hours ago", "in 3 days")
 * @example formatRelativeTime(Date.now() - 3600000) // => "1 hour ago"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const absDiff = Math.abs(diff)
  const future = diff < 0

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day
  const year = 365 * day

  let value: number
  let unit: string

  if (absDiff < minute) {
    return "just now"
  } else if (absDiff < hour) {
    value = Math.floor(absDiff / minute)
    unit = value === 1 ? "minute" : "minutes"
  } else if (absDiff < day) {
    value = Math.floor(absDiff / hour)
    unit = value === 1 ? "hour" : "hours"
  } else if (absDiff < week) {
    value = Math.floor(absDiff / day)
    unit = value === 1 ? "day" : "days"
  } else if (absDiff < month) {
    value = Math.floor(absDiff / week)
    unit = value === 1 ? "week" : "weeks"
  } else if (absDiff < year) {
    value = Math.floor(absDiff / month)
    unit = value === 1 ? "month" : "months"
  } else {
    value = Math.floor(absDiff / year)
    unit = value === 1 ? "year" : "years"
  }

  return future ? `in ${value} ${unit}` : `${value} ${unit} ago`
}

/**
 * Format a duration in milliseconds to human-readable string
 * @example formatDuration(1500) // => "1.5s"
 * @example formatDuration(65000) // => "1m 5s"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @example truncate("Hello World", 8) // => "Hello..."
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}

/**
 * Capitalize the first letter of a string
 * @example capitalize("hello") // => "Hello"
 */
export function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Convert a string to title case
 * @example toTitleCase("hello world") // => "Hello World"
 */
export function toTitleCase(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Format a percentage value
 * @example formatPercentage(0.756) // => "75.6%"
 * @example formatPercentage(0.756, 0) // => "76%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}
