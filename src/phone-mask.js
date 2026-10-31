export function formatRussianPhone(value) {
  const rawDigits = String(value).replace(/\D/g, '')
  const nationalDigits = rawDigits.startsWith('7') || rawDigits.startsWith('8')
    ? rawDigits.slice(1)
    : rawDigits
  const digits = nationalDigits.slice(0, 10)

  if (!digits) return ''

  const areaCode = digits.slice(0, 3)
  let formatted = `+7 (${areaCode}`

  if (areaCode.length === 3) {
    formatted += ')'
  }
  if (digits.length > 3) {
    formatted += ` ${digits.slice(3, 6)}`
  }
  if (digits.length > 6) {
    formatted += `-${digits.slice(6, 8)}`
  }
  if (digits.length > 8) {
    formatted += `-${digits.slice(8, 10)}`
  }

  return formatted
}

export function isRussianPhoneComplete(value) {
  return /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(value)
}
