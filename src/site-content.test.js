import assert from 'node:assert/strict'
import test from 'node:test'
import { homepageCopy, otherProducts, primaryServices, productionProcesses } from './site-content.js'

test('keeps chimneys and ventilation ahead of secondary product categories', () => {
  assert.deepEqual(primaryServices.map(({ title }) => title), ['Дымоходы', 'Вентиляция'])
  assert.deepEqual(otherProducts.map(({ label }) => label), [
    'Адресные таблички с подсветкой',
    'Столы и мебель из нержавеющей стали',
    'Изделия из металла на заказ',
  ])
})

test('names confirmed metalworking processes without invented specifications', () => {
  const labels = productionProcesses.map(({ title }) => title)

  assert.deepEqual(labels, [
    'Лазерная резка',
    'Гибка металла',
    'Аргоновая сварка',
    'Вальцовка',
    'Другое оборудование',
  ])

  const copy = JSON.stringify({ homepageCopy, productionProcesses })
  assert.doesNotMatch(copy, /\b\d+\s?(?:мм|м|лет|дней|часов|кВт)\b/i)
})

test('does not make unconfirmed installation or service promises', () => {
  const copy = JSON.stringify({ homepageCopy, primaryServices, otherProducts, productionProcesses })

  assert.doesNotMatch(copy, /монтаж|гаранти|доставк|сертификат|сроки|за\s+\d+\s+дн/i)
})
