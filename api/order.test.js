import assert from 'node:assert/strict'
import test from 'node:test'
import orderHandler from './order.js'
import viteConfig from '../vite.config.js'

const VALID_ORDER = {
  name: 'Алина',
  contact: '+7 (900) 123-45-67',
  service: 'Изделия на заказ',
  details: 'Нержавейка + гибка',
}

function createResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    headers: {},
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(statusCode) {
      this.statusCode = statusCode
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

async function invokeHandler({
  method = 'POST',
  body = VALID_ORDER,
  token = 'test-token',
  chatId = '-100123',
  fetchImpl = async () => ({ ok: true, json: async () => ({ ok: true }) }),
  onConsoleError = () => {},
} = {}) {
  const previous = {
    fetch: globalThis.fetch,
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
    consoleError: console.error,
  }
  globalThis.fetch = fetchImpl
  process.env.TELEGRAM_BOT_TOKEN = token
  process.env.TELEGRAM_ADMIN_CHAT_ID = chatId
  console.error = onConsoleError

  const response = createResponse()
  try {
    await orderHandler({ method, body }, response)
  } finally {
    globalThis.fetch = previous.fetch
    if (previous.token === undefined) delete process.env.TELEGRAM_BOT_TOKEN
    else process.env.TELEGRAM_BOT_TOKEN = previous.token
    if (previous.chatId === undefined) delete process.env.TELEGRAM_ADMIN_CHAT_ID
    else process.env.TELEGRAM_ADMIN_CHAT_ID = previous.chatId
    console.error = previous.consoleError
  }
  return response
}

test('rejects non-POST requests without calling Telegram', async () => {
  let fetchCalls = 0
  const response = await invokeHandler({
    method: 'GET',
    fetchImpl: async () => {
      fetchCalls += 1
      return { ok: true, json: async () => ({ ok: true }) }
    },
  })

  assert.equal(response.statusCode, 405)
  assert.deepEqual(response.body, { error: 'Method not allowed' })
  assert.equal(fetchCalls, 0)
})

test('rejects malformed, non-object, missing, blank, and oversized order data', async () => {
  let fetchCalls = 0
  const fetchImpl = async () => {
    fetchCalls += 1
    return { ok: true, json: async () => ({ ok: true }) }
  }
  const invalidOrders = [
    '{invalid json',
    [],
    null,
    ...Object.keys(VALID_ORDER).map((field) => {
      const order = { ...VALID_ORDER }
      delete order[field]
      return order
    }),
    { ...VALID_ORDER, name: '' },
    { ...VALID_ORDER, service: 'x'.repeat(101) },
    { ...VALID_ORDER, details: 'x'.repeat(3001) },
    { ...VALID_ORDER, contact: '+7 (٩٠٠) ١٢٣-٤٥-٦٧' },
    { ...VALID_ORDER, contact: '+7 (900) 123-45-6' },
  ]

  for (const body of invalidOrders) {
    const response = await invokeHandler({ body, fetchImpl })
    assert.equal(response.statusCode, 400)
    assert.deepEqual(response.body, { error: 'Invalid order' })
  }
  assert.equal(fetchCalls, 0)
})

test('sends escaped structured HTML and returns delivery confirmation', async () => {
  let request
  const response = await invokeHandler({
    body: {
      ...VALID_ORDER,
      name: 'Алина <b>"срочно"</b>',
      service: 'Изделия & резка',
      details: 'Лист <script>alert("x")</script>',
    },
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, json: async () => ({ ok: true, result: { message_id: 17 } }) }
    },
  })

  assert.equal(
    request.url,
    'https://api.telegram.org/bottest-token/sendMessage',
  )
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers['Content-Type'], 'application/json')
  const telegramMessage = JSON.parse(request.options.body)
  assert.equal(telegramMessage.chat_id, '-100123')
  assert.equal(telegramMessage.parse_mode, 'HTML')
  assert.match(telegramMessage.text, /🔔 <b>Новая заявка с сайта!<\/b>/)
  assert.match(telegramMessage.text, /👤 <b>Имя:<\/b> Алина &lt;b&gt;"срочно"&lt;\/b&gt;/)
  assert.match(telegramMessage.text, /📞 <b>Телефон:<\/b> \+7 \(900\) 123-45-67/)
  assert.match(telegramMessage.text, /🧭 <b>Направление:<\/b> Изделия &amp; резка/)
  assert.match(telegramMessage.text, /📝 <b>Задача:<\/b> Лист &lt;script&gt;alert\("x"\)&lt;\/script&gt;/)
  assert.match(telegramMessage.text, /\d{2}\.\d{2}\.\d{4} \d{2}:\d{2} МСК/)
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.body, { ok: true, telegram_delivered: true })
})

test('returns a generic error when Telegram credentials are missing', async () => {
  let fetchCalls = 0
  const fetchImpl = async () => {
    fetchCalls += 1
    return { ok: true, json: async () => ({ ok: true }) }
  }
  for (const credentials of [{ token: '' }, { chatId: '' }]) {
    const response = await invokeHandler({ ...credentials, fetchImpl })
    assert.equal(response.statusCode, 500)
    assert.match(response.body.error, /TELEGRAM_BOT_TOKEN/)
    assert.match(response.body.error, /TELEGRAM_ADMIN_CHAT_ID/)
  }
  assert.equal(fetchCalls, 0)
})

test('does not expose Telegram errors or network failures to the client', async () => {
  const loggedErrors = []
  const telegramError = 'Bad Request: unsupported parse mode'
  for (const fetchImpl of [
    async () => ({
      ok: false,
      status: 400,
      text: async () => telegramError,
    }),
    async () => ({ ok: true, json: async () => { throw new Error('invalid upstream JSON') } }),
    async () => { throw new Error('private network detail') },
  ]) {
    const response = await invokeHandler({
      fetchImpl,
      onConsoleError: (...args) => loggedErrors.push(args),
    })
    assert.equal(response.statusCode, 502)
    assert.deepEqual(response.body, { error: 'Could not deliver order' })
    assert.doesNotMatch(JSON.stringify(response.body), /private|invalid upstream/)
  }
  assert.ok(loggedErrors.some((args) => args.includes(telegramError)))
})

test('Vite proxies the same-origin order endpoint to the local bot', () => {
  assert.equal(
    viteConfig.server.proxy['/api/order'].target,
    'http://127.0.0.1:8080',
  )
})
