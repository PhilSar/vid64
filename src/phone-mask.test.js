import assert from 'node:assert/strict'
import test from 'node:test'
import { formatRussianPhone, isRussianPhoneComplete } from './phone-mask.js'

test('formats Russian phone numbers as they are entered', () => {
  assert.equal(formatRussianPhone('9001234567'), '+7 (900) 123-45-67')
  assert.equal(formatRussianPhone('8 900 123-45-67'), '+7 (900) 123-45-67')
  assert.equal(formatRussianPhone('+7 (900) 123-45-67'), '+7 (900) 123-45-67')
  assert.equal(formatRussianPhone('900'), '+7 (900)')
})

test('enables submission only for a complete Russian phone number', () => {
  assert.equal(isRussianPhoneComplete('+7 (900) 123-45-67'), true)
  assert.equal(isRussianPhoneComplete('+7 (900) 123-45-6'), false)
  assert.equal(isRussianPhoneComplete('+7 (900) 123-45-678'), false)
  assert.equal(isRussianPhoneComplete('@username'), false)
})
