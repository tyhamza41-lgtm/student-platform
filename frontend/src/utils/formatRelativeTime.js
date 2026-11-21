
export function formatRelativeTime(date) {
  if (!date) return ''

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const now = new Date()
  const differenceInSeconds = Math.floor(
    (now.getTime() - parsedDate.getTime()) / 1000,
  )

  if (differenceInSeconds < 0) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsedDate)
  }

  if (differenceInSeconds < 60) {
    return 'Just now'
  }

  const differenceInMinutes = Math.floor(
    differenceInSeconds / 60,
  )

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes} minutes ago`
  }

  const differenceInHours = Math.floor(
    differenceInMinutes / 60,
  )

  if (differenceInHours < 24) {
    return `${differenceInHours} hours ago`
  }

  const differenceInDays = Math.floor(
    differenceInHours / 24,
  )

  if (differenceInDays < 7) {
    return `${differenceInDays} days ago`
  }

  return formatDateFallback(parsedDate)
}

function formatDateFallback(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
