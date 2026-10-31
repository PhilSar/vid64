import { useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Layers, Menu, Wind, X } from 'lucide-react'
import { buildTelegramMessage } from './contact-message.js'

const services = [
  {
    number: '01',
    title: 'Дымоходы',
    description: 'Металлические элементы и решения для дымоходных систем.',
    label: 'Дымоходы',
  },
  {
    number: '02',
    title: 'Вентиляция',
    description: 'Изделия и элементы вентиляции под задачу и нужные размеры.',
    label: 'Вентиляция',
  },
  {
    number: '03',
    title: 'Изделия на заказ',
    description: 'Нержавеющая сталь и другие металлы — по вашему описанию или чертежу.',
    label: 'Изделия на заказ',
  },
]

const productionFeatures = [
  { title: 'Собственное производство', detail: 'Работаем со своими заказами' },
  { title: 'Лазерная резка', detail: 'Точный раскрой металла' },
  { title: 'Гибка металла', detail: 'Формируем детали под задачу' },
  { title: 'Другие станки', detail: 'Для разных видов изделий' },
]

function ChimneyMark() {
  return (
    <svg viewBox="0 0 28 36" aria-hidden="true">
      <path d="M7 32V6h14v26M4 6h20M10 11h8M14 11v21" />
      <path d="M4 4h20v3H4z" />
    </svg>
  )
}

function HeroArtwork() {
  return (
    <div className="hero-art" role="img" aria-label="Иллюстрация стального дымохода и листа металла с линией лазерной резки">
      <div className="art-glow" />
      <svg className="hero-illustration" viewBox="0 0 640 520" aria-hidden="true">
        <defs>
          <linearGradient id="steel-tube" x1="0" x2="1">
            <stop offset="0" stopColor="#343b39" />
            <stop offset=".18" stopColor="#cbd1cb" />
            <stop offset=".34" stopColor="#77817c" />
            <stop offset=".52" stopColor="#e0e3db" />
            <stop offset=".72" stopColor="#727b76" />
            <stop offset="1" stopColor="#252b29" />
          </linearGradient>
          <linearGradient id="steel-sheet" x1="0" x2=".8" y1="0" y2="1">
            <stop offset="0" stopColor="#d2d6cf" />
            <stop offset=".36" stopColor="#69736e" />
            <stop offset=".7" stopColor="#aeb6af" />
            <stop offset="1" stopColor="#303735" />
          </linearGradient>
          <linearGradient id="steel-rim" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#e1e4dc" />
            <stop offset=".55" stopColor="#78817c" />
            <stop offset="1" stopColor="#303735" />
          </linearGradient>
          <filter id="laser-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path d="m60 345 480-90-58 183-482 85z" fill="url(#steel-sheet)" stroke="#d3d8d0" strokeOpacity=".7" />
        <path d="m119 365 377-70-38 118-380 75z" fill="none" stroke="#edf0e9" strokeOpacity=".38" />
        <path d="m80 325 468-90" stroke="#ff8a55" strokeWidth="2" filter="url(#laser-glow)" />
        <g transform="rotate(8 398 236)">
          <path d="M350 91a49 14 0 0 1 98 0v303h-98z" fill="url(#steel-tube)" stroke="#dce0d8" strokeWidth="2" />
          <ellipse cx="399" cy="91" rx="49" ry="14" fill="url(#steel-rim)" stroke="#e0e4dc" strokeWidth="2" />
          <ellipse cx="399" cy="94" rx="39" ry="8" fill="#222927" stroke="#858e88" />
          <path d="M341 206h116v15H341z" fill="url(#steel-rim)" stroke="#e4e7e0" strokeWidth="2" />
          <path d="M344 226h110v7H344z" fill="#252c29" />
          <path d="M350 330h98v18h-98z" fill="url(#steel-rim)" stroke="#dce0d8" />
          <path d="M352 351h94v5h-94z" fill="#333a37" />
        </g>
        <path d="m356 278 105 3 39 22-4 35-110-4-38-22z" fill="url(#steel-rim)" stroke="#dbe0d9" strokeWidth="2" />
        <path d="m365 283 91 2 28 16-2 22-96-3-29-17z" fill="#343b38" stroke="#aab1ab" />
        <g fill="#ff985e">
          <circle cx="192" cy="298" r="2" /><circle cx="214" cy="290" r="1.5" /><circle cx="236" cy="285" r="2" />
          <circle cx="522" cy="257" r="1.5" /><circle cx="513" cy="268" r="1" />
        </g>
      </svg>
      <div className="art-stamp"><strong>01—03</strong><span>лазерная резка<br />· гибка · изготовление</span></div>
      <p className="art-caption"><span>Точность в металле</span><span>Саратов / ВиД</span></p>
    </div>
  )
}

function ProductionArtwork() {
  return (
    <div className="production-art" role="img" aria-label="Схематичное изображение лазерного станка в работе">
      <div className="machine-frame">
        <div className="machine-bed" />
        <div className="machine-rail" />
        <div className="machine-head" />
        <span className="laser-line" />
      </div>
      <span className="machine-caption">Собственное производство / ВиД</span>
    </div>
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [formStatus, setFormStatus] = useState('')
  const [telegramUrl, setTelegramUrl] = useState('')
  const botName = import.meta.env.VITE_TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, '')

  function handleSubmit(event) {
    event.preventDefault()
    setFormStatus('')
    setTelegramUrl('')

    const form = new FormData(event.currentTarget)
    const values = {
      name: String(form.get('name') ?? '').trim(),
      contact: String(form.get('contact') ?? '').trim(),
      service: String(form.get('service') ?? '').trim(),
      details: String(form.get('details') ?? '').trim(),
    }

    if (Object.values(values).some((value) => !value)) {
      setFormStatus('Заполните все поля, чтобы подготовить заявку.')
      return
    }

    if (!botName || botName === 'your_bot_username') {
      setFormStatus('Заявка не отправлена: настройте VITE_TELEGRAM_BOT_USERNAME в файле .env.')
      return
    }

    const message = buildTelegramMessage(values)
    const url = `https://t.me/${botName}?text=${encodeURIComponent(message)}`
    setTelegramUrl(url)
    setFormStatus('Telegram откроется в новой вкладке. Нажмите «Отправить», чтобы передать заявку.')
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <>
      <div className="topline">
        <span><strong>ООО «ВиД»</strong><span className="topline-divider"> / </span>Саратов</span>
        <span>Собственное производство · изделия под вашу задачу</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="ООО ВиД — на главную">
          <span className="brand-mark">ВиД</span>
          <span className="brand-copy">ВиД<small>Металл и производство</small></span>
        </a>
        <button
          className="menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <nav id="site-navigation" className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Основная навигация">
          <a href="#services" onClick={closeMenu}>Направления</a>
          <a href="#production" onClick={closeMenu}>Производство</a>
          <a className="nav-cta" href="#contact" onClick={closeMenu}>Обсудить заказ <ArrowUpRight size={15} /></a>
        </nav>
        <a className="header-cta" href="#contact">Задать вопрос <ArrowUpRight size={15} /></a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> Саратов · собственное производство</p>
            <h1 id="hero-title">Металл,<br />который <em>решает.</em></h1>
            <p className="hero-description">
              Изготавливаем изделия под вашу задачу: дымоходы, вентиляцию и детали, которым не нашлось готового решения.
            </p>
            <div className="hero-actions">
              <a className="button-primary" href="#contact">Рассчитать заказ <ArrowUpRight size={17} /></a>
              <a className="chimney-button" href="#services" aria-label="Перейти к направлениям и изделиям">
                <ChimneyMark />
                <span>Каталог<br />изделий</span>
                <ArrowDown className="chimney-arrow" size={14} />
              </a>
            </div>
            <div className="hero-note"><span>Лазерная резка</span><i /> <span>Гибка металла</span><i /> <span>Изделия на заказ</span></div>
          </div>
          <HeroArtwork />
        </section>

        <section className="benefits" aria-label="Возможности производства">
          {productionFeatures.map((feature, index) => (
            <article className="benefit" key={feature.title}>
              <span className="benefit-number">0{index + 1}</span>
              <div><h2>{feature.title}</h2><p>{feature.detail}</p></div>
            </article>
          ))}
        </section>

        <section className="services section-pad" id="services" aria-labelledby="services-title">
          <div className="section-heading">
            <div><p className="section-label">01 / Что изготавливаем</p><h2 id="services-title">От готового решения<br />до детали <em>по эскизу.</em></h2></div>
            <p className="section-aside">Три направления.<br />Одно производство.</p>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <a
                className={`service-card service-card-${service.number}`}
                href="#contact"
                key={service.number}
                onClick={() => setSelectedService(service.label)}
              >
                <span className="service-number">{service.number} / {service.title}</span>
                <span className="service-mark" aria-hidden="true">
                  {service.number === '01' ? <ChimneyMark /> : service.number === '02' ? <Wind /> : <Layers />}
                </span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <span className="service-link">Обсудить задачу <ArrowUpRight size={15} /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="production section-pad" id="production" aria-labelledby="production-title">
          <ProductionArtwork />
          <div className="production-copy">
            <p className="section-label">02 / Производство</p>
            <h2 id="production-title">Не просто продаём.<br /><em>Делаем сами.</em></h2>
            <p>
              У ООО «ВиД» собственное производство с лазерной резкой, гибочным и другими станками. Поэтому можно обсудить не только типовое изделие, но и заказ по вашим размерам или чертежу.
            </p>
            <a className="text-link" href="#contact">Расскажите о задаче <ArrowRight size={16} /></a>
          </div>
        </section>

        <section className="contact section-pad" id="contact" aria-labelledby="contact-title">
          <div className="contact-copy">
            <p className="section-label">03 / Ваша задача</p>
            <h2 id="contact-title">Есть эскиз?<br /><em>Нужна деталь?</em></h2>
            <p>Опишите, что нужно изготовить. Заявка откроется в Telegram — останется подтвердить отправку.</p>
            <div className="contact-detail"><span className="contact-dot" /> Ответим в Telegram</div>
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              Как к вам обращаться
              <input name="name" placeholder="Ваше имя" autoComplete="name" required />
            </label>
            <label>
              Телефон или Telegram
              <input name="contact" placeholder="+7 или @username" autoComplete="tel" required />
            </label>
            <label>
              Направление
              <select name="service" value={selectedService} onChange={(event) => setSelectedService(event.target.value)} required>
                <option value="" disabled>Выберите направление</option>
                {services.map((service) => <option value={service.label} key={service.number}>{service.title}</option>)}
                <option value="Другое">Другое</option>
              </select>
            </label>
            <label>
              Опишите задачу
              <textarea name="details" placeholder="Что нужно изготовить? Укажите размеры, материал или другие детали." rows="3" required />
            </label>
            <button className="submit-button" type="submit">Подготовить заявку <ArrowRight size={18} /></button>
            {formStatus && (
              <div className="form-status" role="status" aria-live="polite">
                <p>{formStatus}</p>
                {telegramUrl && <a href={telegramUrl} target="_blank" rel="noopener noreferrer">Если Telegram не открылся, открыть ссылку вручную <ArrowUpRight size={14} /></a>}
              </div>
            )}
            <p className="form-privacy">Сообщение отправляется после вашего подтверждения в Telegram.</p>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top" aria-label="ВиД — наверх"><span className="brand-mark">ВиД</span><span className="brand-copy">ВиД<small>Металл и производство</small></span></a>
        <p>Дымоходы · вентиляция<br />Изделия из металла на заказ</p>
        <span className="copyright">ООО «ВиД» · Саратов</span>
        <a className="footer-up" href="#top">Наверх <ArrowUpRight size={15} /></a>
      </footer>
    </>
  )
}

export default App
