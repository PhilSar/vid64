import assert from 'node:assert/strict'
import test from 'node:test'
import { privacyPolicySections } from './privacy-policy.js'

const policyText = privacyPolicySections
  .flatMap(({ title, paragraphs }) => [title, ...paragraphs])
  .join('\n')

test('identifies the legal operator and the supplied privacy contact', () => {
  assert.match(policyText, /Общество с ограниченной ответственностью «Вентиляция и дымоходы»/)
  assert.match(policyText, /ИНН 6451021251/)
  assert.match(policyText, /ОГРН 1226400012035/)
  assert.match(policyText, /пл\. Советско-Чехословацкой Дружбы, д\. 5/)
  assert.match(policyText, /info@vid64\.ru/)
})

test('explains the form fields, purpose, and consent basis', () => {
  assert.match(policyText, /имя/i)
  assert.match(policyText, /номер телефона/i)
  assert.match(policyText, /выбранное направление/i)
  assert.match(policyText, /описание задачи/i)
  assert.match(policyText, /обработки обращения/i)
  assert.match(policyText, /согласие/i)
})

test('discloses Vercel and Telegram processing without unsupported storage claims', () => {
  assert.match(policyText, /Vercel/)
  assert.match(policyText, /Telegram/)
  assert.match(policyText, /собственную постоянную базу/)
  assert.match(policyText, /не подтверждает/)
  assert.doesNotMatch(policyText, /хран\w+ исключительно в России|удаляются через \d+ дней/i)
})

test('explains data-subject rights and how to exercise them', () => {
  assert.match(policyText, /отозвать согласие/i)
  assert.match(policyText, /уточнение/)
  assert.match(policyText, /удаление/)
  assert.match(policyText, /info@vid64\.ru/)
})
