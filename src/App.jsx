import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, Layers, Menu, Wind, X } from 'lucide-react'
import { getOrderStatusMessage, submitOrder } from './order-api.js'
import { formatRussianPhone, isRussianPhoneComplete } from './phone-mask.js'
import { privacyPolicySections } from './privacy-policy.js'
import { companyContacts, companyDetails, homepageCopy, otherProducts, primaryServices, productionProcesses } from './site-content.js'

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

function ImageWithDisclosure({ src, alt, className }) {
  return (
    <figure className={`image-with-disclosure ${className}`}>
      <img className="visualization-image" src={src} alt={alt} loading="lazy" decoding="async" />
      <figcaption className="image-disclosure">{homepageCopy.imageDisclosure}</figcaption>
    </figure>
  )
}

function ProductionArtwork() {
  return (
    <ImageWithDisclosure
      className="production-art"
      src={homepageCopy.productionImage}
      alt={homepageCopy.productionImageAlt}
    />
  )
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedService, setSelectedService] = useState('')
  const [contact, setContact] = useState('')
  const [formStatus, setFormStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOrderSaved, setIsOrderSaved] = useState(false)
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const resetFormTimeout = useRef()
  const privacyTriggerRef = useRef(null)
  const privacyDialogRef = useRef(null)

  useEffect(() => () => clearTimeout(resetFormTimeout.current), [])

  useEffect(() => {
    if (!isPrivacyOpen) return

    const dialog = privacyDialogRef.current
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog?.querySelector('button')?.focus()

    function handleDialogKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsPrivacyOpen(false)
        return
      }

      if (event.key !== 'Tab' || !dialog) return
      const focusableElements = dialog.querySelectorAll(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleDialogKeyDown)
    return () => {
      document.removeEventListener('keydown', handleDialogKeyDown)
      document.body.style.overflow = previousBodyOverflow
      privacyTriggerRef.current?.focus()
    }
  }, [isPrivacyOpen])

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting || isOrderSaved) return
    setFormStatus('')

    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const values = {
      name: String(form.get('name') ?? '').trim(),
      contact: String(form.get('contact') ?? '').trim(),
      service: String(form.get('service') ?? '').trim(),
      details: String(form.get('details') ?? '').trim(),
    }

    if (!isRussianPhoneComplete(values.contact)) {
      setFormStatus('Введите полный номер телефона в формате +7 (XXX) XXX-XX-XX.')
      return
    }

    if (Object.values(values).some((value) => !value)) {
      setFormStatus('Заполните все поля, чтобы подготовить заявку.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await submitOrder(values)
      setFormStatus(getOrderStatusMessage(result))
      setIsOrderSaved(true)
      resetFormTimeout.current = setTimeout(() => {
        formElement.reset()
        setContact('')
        setSelectedService('')
        setFormStatus('')
        setIsOrderSaved(false)
      }, 4000)
    } catch {
      setFormStatus('Не удалось отправить заявку. Попробуйте ещё раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <>
      <div className="topline">
        <span><strong>ООО «ВиД»</strong><span className="topline-divider"> / </span>{homepageCopy.location}</span>
        <span>{homepageCopy.headerTagline}</span>
      </div>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="ООО ВиД — на главную">
          <span className="brand-mark">ВиД</span>
          <span className="brand-copy">ВиД<small>{homepageCopy.brandSubline}</small></span>
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
          <a href="#services" onClick={closeMenu}>Дымоходы и вентиляция</a>
          <a href="#production" onClick={closeMenu}>Производство</a>
          <a href="#about" onClick={closeMenu}>О компании</a>
          <a className="nav-cta" href="#contact" onClick={closeMenu}>Обсудить заказ <ArrowUpRight size={15} /></a>
        </nav>
        <a className="header-cta" href="#contact">Задать вопрос <ArrowUpRight size={15} /></a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> {homepageCopy.heroEyebrow}</p>
            <h1 id="hero-title">{homepageCopy.heroTitle}</h1>
            <p className="hero-description">{homepageCopy.heroDescription}</p>
            <div className="hero-actions">
              <a className="button-primary" href="#contact">{homepageCopy.heroPrimaryAction} <ArrowUpRight size={17} /></a>
              <a className="chimney-button" href="#services" aria-label="Перейти к направлениям и изделиям">
                <ChimneyMark />
                <span>{homepageCopy.heroSecondaryAction}</span>
                <ArrowDown className="chimney-arrow" size={14} />
              </a>
            </div>
            <div className="hero-note">
              {productionProcesses.slice(0, 4).map((process, index) => (
                <span className="hero-note-item" key={process.title}>
                  {index > 0 && <i />}
                  {process.title}
                </span>
              ))}
            </div>
          </div>
          <HeroArtwork />
        </section>

        <section className="benefits" aria-label="Возможности производства">
          {productionProcesses.slice(0, 4).map((feature, index) => (
            <article className="benefit" key={feature.title}>
              <span className="benefit-number">0{index + 1}</span>
              <div><h2>{feature.title}</h2><p>{feature.detail}</p></div>
            </article>
          ))}
        </section>

        <section className="services section-pad" id="services" aria-labelledby="services-title">
          <div className="section-heading">
            <div><p className="section-label">{homepageCopy.servicesLabel}</p><h2 id="services-title">{homepageCopy.servicesTitle}</h2></div>
            <p className="section-aside">{homepageCopy.servicesDescription}</p>
          </div>
          <div className="service-grid">
            {primaryServices.map((service) => (
              <a
                className={`service-card service-card-${service.number}`}
                href="#contact"
                key={service.number}
                onClick={() => setSelectedService(service.label)}
              >
                <span className="service-number">{service.number} / {service.title}</span>
                <ImageWithDisclosure
                  className="service-image"
                  src={service.image}
                  alt={service.imageAlt}
                />
                <span className="service-mark" aria-hidden="true">{service.number === '01' ? <ChimneyMark /> : <Wind />}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <span className="service-link">Обсудить задачу <ArrowUpRight size={15} /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="other-products section-pad" id="other-products" aria-labelledby="other-products-title">
          <div className="section-heading">
            <div>
              <p className="section-label">{homepageCopy.otherProductsLabel}</p>
              <h2 id="other-products-title">{homepageCopy.otherProductsTitle}</h2>
            </div>
            <p className="section-aside">{homepageCopy.otherProductsDescription}</p>
          </div>
          <div className="service-grid">
            {otherProducts.map((product) => (
              <a
                className="service-card other-product-card"
                href="#contact"
                key={product.label}
                onClick={() => setSelectedService(product.label)}
              >
                <span className="service-mark" aria-hidden="true"><Layers /></span>
                <h3>{product.title}</h3>
                <p>{product.description}</p>
                <span className="service-link">Обсудить заказ <ArrowUpRight size={15} /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="production section-pad" id="production" aria-labelledby="production-title">
          <ProductionArtwork />
          <div className="production-copy">
            <p className="section-label">{homepageCopy.productionLabel}</p>
            <h2 id="production-title">{homepageCopy.productionTitle}</h2>
            <p>{homepageCopy.productionDescription}</p>
            <a className="text-link" href="#contact">Обсудить изготовление <ArrowRight size={16} /></a>
          </div>
        </section>

        <section className="company-about section-pad" id="about" aria-labelledby="about-title">
          <div className="section-heading">
            <div>
              <p className="section-label">{homepageCopy.aboutLabel}</p>
              <h2 id="about-title">{homepageCopy.aboutTitle}</h2>
            </div>
            <p className="section-aside">{homepageCopy.aboutDescription}</p>
          </div>
          <dl className="company-facts">
            <div>
              <dt>Полное наименование</dt>
              <dd>{companyDetails.legalName}</dd>
            </div>
            <div>
              <dt>Дата регистрации</dt>
              <dd>{companyDetails.registrationDate}</dd>
            </div>
            <div>
              <dt>ИНН</dt>
              <dd>{companyDetails.inn}</dd>
            </div>
            <div>
              <dt>ОГРН</dt>
              <dd>{companyDetails.ogrn}</dd>
            </div>
            <div className="company-fact-wide">
              <dt>Основной вид деятельности по реестру</dt>
              <dd>{companyDetails.primaryActivity}</dd>
            </div>
            <div className="company-fact-wide">
              <dt>Юридический адрес</dt>
              <dd>{companyDetails.legalAddress}</dd>
            </div>
          </dl>
        </section>

        <section className="reviews section-pad" id="reviews" aria-labelledby="reviews-title">
          <div className="section-heading">
            <div>
              <p className="section-label">{homepageCopy.reviewsLabel}</p>
              <h2 id="reviews-title">{homepageCopy.reviewsTitle}</h2>
            </div>
          </div>
          <p className="reviews-empty-state">{homepageCopy.reviewsEmptyState}</p>
        </section>

        <section className="contact section-pad" id="contact" aria-labelledby="contact-title">
          <div className="contact-copy">
            <p className="section-label">{homepageCopy.contactLabel}</p>
            <h2 id="contact-title">{homepageCopy.contactTitle}</h2>
            <p>{homepageCopy.contactDescription}</p>
            <div className="contact-detail"><span className="contact-dot" /> {homepageCopy.contactDetail}</div>
            {(companyContacts.phone || companyContacts.email || companyContacts.website) && (
              <div className="company-contact-links" aria-label="Другие способы связи">
                {companyContacts.phone && <a href={`tel:${companyContacts.phone}`}>{companyContacts.phone}</a>}
                {companyContacts.email && <a href={`mailto:${companyContacts.email}`}>{companyContacts.email}</a>}
                {companyContacts.website && <a href={companyContacts.website}>{companyContacts.website}</a>}
              </div>
            )}
          </div>
          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              Как к вам обращаться
              <input name="name" placeholder="Ваше имя" autoComplete="name" required />
            </label>
            <label>
              Телефон
              <input
                name="contact"
                type="tel"
                inputMode="tel"
                placeholder="+7 (XXX) XXX-XX-XX"
                autoComplete="tel"
                maxLength={18}
                value={contact}
                onChange={(event) => setContact(formatRussianPhone(event.target.value))}
                required
              />
            </label>
            <label>
              Направление
              <select name="service" value={selectedService} onChange={(event) => setSelectedService(event.target.value)} required>
                <option value="" disabled>Выберите направление</option>
                {primaryServices.map((service) => <option value={service.label} key={service.number}>{service.title}</option>)}
                {otherProducts.map((product) => <option value={product.label} key={product.label}>{product.title}</option>)}
                <option value="Другое">Другое</option>
              </select>
            </label>
            <label>
              Опишите задачу
              <textarea name="details" placeholder="Что нужно изготовить? Укажите размеры, материал или другие детали." rows="3" required />
            </label>
            <button className="submit-button" type="submit" disabled={isSubmitting || isOrderSaved || !isRussianPhoneComplete(contact)}>
              {isSubmitting ? 'Отправка...' : homepageCopy.contactSubmit} <ArrowRight size={18} />
            </button>
            {formStatus && (
              <div className="form-status" role="status" aria-live="polite">
                <p>{formStatus}</p>
              </div>
            )}
            <p className="form-privacy">
              Нажимая кнопку, вы соглашаетесь с{' '}
              <button
                className="privacy-policy-trigger"
                type="button"
                ref={privacyTriggerRef}
                aria-haspopup="dialog"
                aria-controls="privacy-policy-dialog"
                onClick={() => setIsPrivacyOpen(true)}
              >
                Политикой конфиденциальности
              </button>
            </p>
          </form>
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top" aria-label="ВиД — наверх"><span className="brand-mark">ВиД</span><span className="brand-copy">ВиД<small>{homepageCopy.brandSubline}</small></span></a>
        <p>{homepageCopy.footerDescription}</p>
        <span className="copyright">ООО «ВиД» · Саратов</span>
        <a className="footer-up" href="#top">Наверх <ArrowUpRight size={15} /></a>
      </footer>

      {isPrivacyOpen && (
        <div
          className="privacy-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsPrivacyOpen(false)
          }}
        >
          <section
            className="privacy-modal"
            id="privacy-policy-dialog"
            ref={privacyDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-policy-title"
            tabIndex="-1"
          >
            <header className="privacy-modal-header">
              <h2 id="privacy-policy-title">Политика конфиденциальности</h2>
              <button
                className="privacy-modal-close"
                type="button"
                aria-label="Закрыть политику конфиденциальности"
                onClick={() => setIsPrivacyOpen(false)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="privacy-modal-content">
              {privacyPolicySections.map(({ title, paragraphs }) => (
                <section className="privacy-policy-section" key={title}>
                  <h3>{title}</h3>
                  {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                </section>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

export default App
