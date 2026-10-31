import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, sep } from 'node:path'
import test from 'node:test'
import { homepageCopy, primaryServices } from './site-content.js'

const publicRoot = resolve(fileURLToPath(new URL('../public', import.meta.url)))
const appSource = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
const expectedDisclosure = 'Иллюстрация для примера — не фото выполненного заказа'

const assets = [
  {
    filename: 'chimney-components.svg',
    image: primaryServices[0]?.image,
    alt: primaryServices[0]?.imageAlt,
  },
  {
    filename: 'ventilation-components.svg',
    image: primaryServices[1]?.image,
    alt: primaryServices[1]?.imageAlt,
  },
  {
    filename: 'laser-cutting.svg',
    image: homepageCopy.productionImage,
    alt: homepageCopy.productionImageAlt,
  },
]

test('assigns descriptive local image paths to the intended page areas', () => {
  assert.deepEqual(
    assets.map(({ image }) => image),
    [
      '/images/chimney-components.svg',
      '/images/ventilation-components.svg',
      '/images/laser-cutting.svg',
    ],
  )
  assert.ok(assets.every(({ alt }) => typeof alt === 'string' && alt.trim().length > 0))
  assert.match(appSource, /src=\{service\.image\}/)
  assert.match(appSource, /src=\{homepageCopy\.productionImage\}/)
})

test('keeps local placeholder illustrations under public and within the website size budget', () => {
  for (const { filename } of assets) {
    const imagePath = resolve(publicRoot, 'images', filename)
    assert.ok(imagePath.startsWith(`${publicRoot}${sep}`), `${filename} must stay under public`)
    assert.ok(existsSync(imagePath), `Expected generated asset ${imagePath}`)
    assert.ok(statSync(imagePath).size <= 500_000, `${filename} must be no larger than 500 KB`)
    assert.match(readFileSync(imagePath, 'utf8'), /<svg\b/)
  }
})

test('labels every displayed placeholder as an illustration, not a completed order photo', () => {
  assert.equal(homepageCopy.imageDisclosure, expectedDisclosure)
  assert.match(appSource, /<figcaption[^>]*>\{homepageCopy\.imageDisclosure\}<\/figcaption>/)
  assert.match(appSource, /<ImageWithDisclosure[^>]*src=\{service\.image\}/s)
  assert.match(appSource, /<ImageWithDisclosure[^>]*src=\{homepageCopy\.productionImage\}/s)
})
