const ORDER_ERROR = { error: 'Could not deliver order' }
const CONFIG_ERROR = { error: 'Order delivery is not configured' }
const FIELD_LIMITS = {
  name: 100,
  contact: 120,
  service: 100,
  details: 3000,
}
const PHONE_PATTERN = /^\+7 \([0-9]{3}\) [0-9]{3}-[0-9]{2}-[0-9]{2}$/

function respond(res, status, body) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json(body)
}

function parseOrder(body) {
  let payload = body
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch {
      return null
    }
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null
  }

  const order = {}
  for (const [field, maxLength] of Object.entries(FIELD_LIMITS)) {
    const value = payload[field]
    if (typeof value !== 'string' || !value.trim() || value.trim().length > maxLength) {
      return null
    }
    order[field] = value.trim()
  }

  return PHONE_PATTERN.test(order.contact) ? order : null
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatMoscowTime(date) {
  const parts = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.day}.${values.month}.${values.year} ${values.hour}:${values.minute} МСК`
}

function formatMessage(order) {
  const phoneDigits = order.contact.replace(/[^0-9]/g, '')
  return [
    '🔥 <b>Новая заявка vid64.ru</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(order.name)}`,
    `<b>Телефон:</b> <a href="tel:+${phoneDigits}">${escapeHtml(order.contact)}</a>`,
    `<b>Направление:</b> ${escapeHtml(order.service)}`,
    `<b>Комментарий:</b> ${escapeHtml(order.details)}`,
    `<b>Дата:</b> ${formatMoscowTime(new Date())}`,
  ].join('\n')
}

export default async function orderHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return respond(res, 405, { error: 'Method not allowed' })
  }

  const contentType = req.headers?.['content-type']
  if (contentType && !contentType.toLowerCase().includes('application/json')) {
    return respond(res, 400, { error: 'Expected JSON' })
  }

  const order = parseOrder(req.body)
  if (!order) {
    return respond(res, 400, { error: 'Invalid order' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim()
  if (!token || !chatId) {
    console.error('Telegram order API configuration is missing')
    return respond(res, 500, CONFIG_ERROR)
  }

  try {
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: formatMessage(order),
          parse_mode: 'HTML',
        }),
      },
    )
    if (!telegramResponse.ok) {
      throw new Error('Telegram rejected order')
    }
    const telegramResult = await telegramResponse.json()
    if (telegramResult?.ok !== true) {
      throw new Error('Telegram rejected order')
    }
  } catch {
    console.error('Telegram order delivery failed')
    return respond(res, 502, ORDER_ERROR)
  }

  return respond(res, 200, { ok: true, telegram_delivered: true })
}
