import assert from 'node:assert/strict'
import test from 'node:test'
import {
  companyContacts,
  companyDetails,
  homepageCopy,
  otherProducts,
  primaryServices,
  productionProcesses,
} from './site-content.js'

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

test('exposes legal details for the confirmed Saratov company', () => {
  assert.equal(companyDetails.shortName, 'ООО «ВИД»')
  assert.equal(companyDetails.legalName, 'Общество с ограниченной ответственностью «Вентиляция и дымоходы»')
  assert.equal(companyDetails.inn, '6451021251')
  assert.equal(companyDetails.ogrn, '1226400012035')
  assert.equal(companyDetails.registrationDate, '05.10.2022')
  assert.equal(companyDetails.primaryActivity, 'Производство строительных металлических конструкций, изделий и их частей')
  assert.equal(companyDetails.legalAddress, '410022, Саратовская область, г. Саратов, пл. Советско-Чехословацкой Дружбы, д. 5')
})

test('keeps unavailable direct contact methods empty', () => {
  assert.deepEqual(companyContacts, { phone: '', email: '', website: '' })
})
