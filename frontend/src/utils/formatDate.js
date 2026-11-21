
export function formatDate(date, options = {}) {
  if (!date) return ''

  const parsedDate = new Date(date)

  if (Number.isNaN(parsedDate.getTime())) {
    return ''
  }

  const defaultOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      ...defaultOptions,
      ...options,
    },
  ).format(parsedDate)
}
