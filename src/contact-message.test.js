import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTelegramMessage } from './contact-message.js'

test('formats company, service, and customer order details for Telegram', () => {
  const message = buildTelegramMessage({
    name: 'Алина',
    contact: '+7 900 123-45-67',
    service: 'Изделия на заказ',
    details: 'Нержавейка + гибка & крепёж #2',
  })

  assert.equal(
    message,
    [
      'Новая заявка с сайта ООО «ВиД»',
      'Имя: Алина',
      'Контакт: +7 900 123-45-67',
      'Направление: Изделия на заказ',
      'О заказе: Нержавейка + гибка & крепёж #2',
    ].join('\n'),
  )
})
