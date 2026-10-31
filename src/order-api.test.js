import assert from 'node:assert/strict'
import test from 'node:test'
import { submitOrder } from './order-api.js'

const order = {
  name: 'Алина',
  contact: '+7 900 123-45-67',
  service: 'Изделия на заказ',
  details: 'Нержавейка + гибка',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

test('posts the four order fields to the same-origin API and resolves on confirmation', async () => {
  let request
  const result = await submitOrder(order, async (url, options) => {
    request = { url, options }
    return jsonResponse({ ok: true })
  })

  assert.equal(request.url, '/api/order')
  assert.equal(request.options.method, 'POST')
  assert.equal(request.options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(request.options.body), order)
  assert.deepEqual(result, { ok: true })
})

test('rejects unsuccessful API responses with a user-safe message', async () => {
  await assert.rejects(
    submitOrder(order, async () => jsonResponse({ error: 'private upstream detail' }, 502)),
    { message: 'Не удалось отправить заявку. Попробуйте ещё раз.' },
  )
})

test('rejects malformed or unconfirmed successful responses', async () => {
  await assert.rejects(
    submitOrder(order, async () => new Response('not json', { status: 200 })),
    { message: 'Не удалось отправить заявку. Попробуйте ещё раз.' },
  )
  await assert.rejects(
    submitOrder(order, async () => jsonResponse({ ok: false })),
    { message: 'Не удалось отправить заявку. Попробуйте ещё раз.' },
  )
})

test('turns network failures into a retryable user-safe error', async () => {
  await assert.rejects(
    submitOrder(order, async () => {
      throw new TypeError('network details')
    }),
    { message: 'Не удалось отправить заявку. Попробуйте ещё раз.' },
  )
})
