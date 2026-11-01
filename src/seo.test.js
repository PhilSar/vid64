import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const metaTags = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => tag)

function getMeta(attribute, value) {
  const tag = metaTags.find((candidate) => {
    const match = candidate.match(new RegExp(`\\b${attribute}=["']([^"']*)["']`, 'i'))
    return match?.[1] === value
  })

  return tag?.match(/\bcontent=["']([^"']*)["']/i)?.[1]
}

function getJsonLd() {
  const match = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i)
  assert.ok(match, 'JSON-LD script should be present')
  return JSON.parse(match[1])
}

test('provides Saratov SEO metadata and confirmed Organization facts', () => {
  assert.match(html, /<title>Дымоходы и вентиляция в Саратове — производство ВиД<\/title>/)

  const description = getMeta('name', 'description')
  assert.match(description, /Саратов/)
  assert.match(description, /дымоход/)
  assert.equal(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0]
    ?.match(/\bhref=["']([^"']*)["']/i)?.[1], 'https://vid64.ru/')

  assert.equal(getMeta('property', 'og:title'), 'Дымоходы и вентиляция в Саратове — производство ВиД')
  assert.equal(getMeta('property', 'og:description'), description)
  assert.equal(getMeta('property', 'og:url'), 'https://vid64.ru/')
  assert.equal(getMeta('property', 'og:type'), 'website')
  assert.equal(getMeta('property', 'og:locale'), 'ru_RU')

  const organization = getJsonLd()
  assert.equal(organization['@type'], 'Organization')
  assert.equal(organization.name, 'Общество с ограниченной ответственностью «Вентиляция и дымоходы»')
  assert.equal(organization.taxID, '6451021251')
  assert.deepEqual(organization.identifier, {
    '@type': 'PropertyValue',
    propertyID: 'ОГРН',
    value: '1226400012035',
  })
  assert.equal(organization.email, 'info@vid64.ru')
  assert.equal(organization.url, 'https://vid64.ru/')
  assert.deepEqual(organization.address, {
    '@type': 'PostalAddress',
    streetAddress: 'пл. Советско-Чехословацкой Дружбы, д. 5',
    addressLocality: 'Саратов',
    addressRegion: 'Саратовская область',
    postalCode: '410022',
    addressCountry: 'RU',
  })
  assert.equal('telephone' in organization, false)
})

test('publishes canonical crawler directives and a one-page sitemap', async () => {
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8')
  const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8')

  assert.match(robots, /^User-agent:\s*\*\s*$/m)
  assert.match(robots, /^Allow:\s*\/\s*$/m)
  assert.match(robots, /^Sitemap:\s*https:\/\/vid64\.ru\/sitemap\.xml\s*$/m)
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/)
  assert.match(sitemap, /<urlset\b[^>]*xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/)
  assert.deepEqual(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url),
    ['https://vid64.ru/'],
  )
})
